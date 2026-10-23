import { z } from "zod";
import { sessionLifecycleStatusSchema } from "@/domain/session/session-lifecycle";

import {
  sessionSectionSchema,
  sessionSectionsSchema,
  workoutSchema,
} from "@/domain/workout/workout.schema";
import {
  calculateSessionDuration,
  classifySessionDuration,
} from "@/domain/workout/session-duration";
import {
  getPlanWeekNumber,
  getProgressionPhase,
  progressionPhases,
  TRAINING_PLAN_WEEK_COUNT,
} from "./progression";
import {
  ATHLETE_PROFILE_VERSION,
  EXERCISE_CATALOG_VERSION,
  PLANNER_VERSION,
} from "./planner-versions";

export const trainingGoalValues = [
  "movement-speed",
  "court-endurance",
  "power",
  "strength",
  "injury-resilience",
] as const;

export const weekdayValues = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export const padelMovementLimitationValues = [
  "slow-net-approach",
  "slow-lob-recovery",
  "late-split-step",
  "slow-lateral-movement",
  "poor-deceleration",
] as const;

export const padelPowerLimitationValues = [
  "limited-bandeja-vibora-rotation",
  "weak-overhead-power",
  "unstable-volleys",
  "weak-grip",
  "side-to-side-imbalance",
] as const;

export const padelCapacityLimitationValues = [
  "limited-overhead-mobility",
  "shoulder-fatigue",
  "poor-single-leg-balance",
  "match-endurance",
  "difficulty-low-balls",
] as const;

const legacyPadelLimitationValues = [
  "weak-core-rotation",
  "slow-first-step",
  "slow-return-to-position",
  "weak-overhead-control",
] as const;

export const padelLimitationGroups = [
  padelMovementLimitationValues,
  padelPowerLimitationValues,
  padelCapacityLimitationValues,
] as const;

export const maxPadelPrioritiesPerStep = 3;
const maxStoredPadelLimitations =
  padelLimitationGroups.length * maxPadelPrioritiesPerStep +
  legacyPadelLimitationValues.length;

export const padelLimitationValues = [
  ...padelMovementLimitationValues,
  ...padelPowerLimitationValues,
  ...padelCapacityLimitationValues,
  ...legacyPadelLimitationValues,
] as const;

export const developmentAreaValues = [
  "shoulders-upper-back",
  "elbow-forearm-grip",
  "core-lower-back",
  "hips-glutes",
  "knees-single-leg",
  "calves-ankles-feet",
] as const;

export const matchImportanceValues = ["normal", "important"] as const;

export const painAreaValues = [
  "shoulder",
  "elbow-forearm",
  "wrist-hand",
  "neck-upper-back",
  "lower-back",
  "hip-groin",
  "knee",
  "calf-achilles",
  "ankle-foot",
] as const;

export const todayAdaptationBodyAreaValues = [
  ...painAreaValues,
  "other",
] as const;

export const profileMatchSchema = z.object({
  date: z.string().date(),
  importance: z.enum(matchImportanceValues),
});

const normalizedAthleteProfileSchema = z
  .object({
    sport: z.enum(["padel", "other"]),
    experience: z.enum(["beginner", "intermediate", "advanced"]),
    sessionsPerWeek: z.number().int().min(1).max(5),
    sessionDurationMinutes: z.coerce.number().int().min(5).max(30),
    preferredDays: z.array(z.enum(weekdayValues)).min(1),
    equipment: z
      .array(z.enum(["bodyweight", "one-dumbbell", "two-dumbbells"]))
      .min(1),
    goals: z.array(z.enum(trainingGoalValues)).min(1).max(3),
    developmentAreas: z.array(z.enum(developmentAreaValues)).max(3).default([]),
    padelLimitations: z
      .array(z.enum(padelLimitationValues))
      .max(maxStoredPadelLimitations)
      .default([]),
    painAreas: z.array(z.enum(painAreaValues)).default([]),
    matches: z.array(profileMatchSchema).default([]),
  })
  .superRefine((profile, context) => {
    if (profile.preferredDays.length !== profile.sessionsPerWeek) {
      context.addIssue({
        code: "custom",
        message: "Preferred days must match sessions per week.",
        path: ["preferredDays"],
      });
    }
    for (const group of padelLimitationGroups) {
      const limitationsInGroup = new Set<string>(group);
      const selectedInGroup = profile.padelLimitations.filter((limitation) =>
        limitationsInGroup.has(limitation),
      );
      if (selectedInGroup.length > maxPadelPrioritiesPerStep) {
        context.addIssue({
          code: "custom",
          message: "Choose up to three Padel priorities from each step.",
          path: ["padelLimitations"],
        });
      }
    }
    const uniqueMatches = new Set(profile.matches.map((match) => match.date));
    if (uniqueMatches.size !== profile.matches.length) {
      context.addIssue({
        code: "custom",
        message: "Only one match may be scheduled per date.",
        path: ["matches"],
      });
    }
  });

const legacyGoalMap: Record<string, string> = {
  "move-better": "movement-speed",
};

const legacyLimitationMap: Record<string, string> = {
  "limited-core-rotation": "weak-core-rotation",
  "slow-court-recovery": "slow-return-to-position",
  "weak-overheads": "weak-overhead-control",
  "limited-shoulder-mobility": "limited-overhead-mobility",
  "low-match-endurance": "match-endurance",
  "slow-first-step": "late-split-step",
  "slow-return-to-position": "slow-lob-recovery",
  "weak-core-rotation": "limited-bandeja-vibora-rotation",
  "weak-overhead-control": "weak-overhead-power",
};

function normalizeLegacyProfile(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const profile = value as Record<string, unknown>;
  const mapValues = (items: unknown, map: Record<string, string>) =>
    Array.isArray(items)
      ? items.map((item) =>
          typeof item === "string" ? (map[item] ?? item) : item,
        )
      : [];
  if ("sport" in profile) {
    return {
      ...profile,
      developmentAreas: profile.developmentAreas ?? [],
    };
  }
  const legacyExperience = profile.sportExperience;
  const experience =
    legacyExperience === "new" || legacyExperience === "under-one-year"
      ? "beginner"
      : legacyExperience === "one-to-three"
        ? "intermediate"
        : legacyExperience === "three-plus"
          ? "advanced"
          : undefined;
  return {
    sport: profile.primarySport,
    experience,
    sessionsPerWeek: profile.sessionsPerWeek,
    sessionDurationMinutes: profile.sessionMinutes,
    preferredDays: profile.preferredDays,
    equipment: profile.equipment,
    goals: mapValues(profile.goals, legacyGoalMap),
    developmentAreas: [],
    padelLimitations: mapValues(profile.padelChallenges, legacyLimitationMap),
    painAreas: profile.painAreas,
    matches: [],
  };
}

export const athleteProfileSchema = z.preprocess(
  normalizeLegacyProfile,
  normalizedAthleteProfileSchema,
);

export const durationStatusSchema = z.enum([
  "on_target",
  "close",
  "shorter_than_requested",
  "longer_than_requested",
]);

export const planGenerationMetadataSchema = z.object({
  source: z.enum(["deterministic", "openai"]),
  profileVersion: z.string().min(1),
  exerciseCatalogVersion: z.string().min(1),
  plannerVersion: z.string().min(1),
  explanation: z.string().min(1).max(600),
  model: z.string().min(1).nullable(),
  fallbackReason: z
    .enum(["disabled", "unconfigured", "model-failed", "request-failed"])
    .optional(),
});

export const progressionPhaseSchema = z.enum(progressionPhases);

const durationFitAdjustmentSchema = z.discriminatedUnion("type", [
  z.object({
    source: z
      .enum(["base_prescription", "duration_fit"])
      .default("duration_fit"),
    type: z.literal("round_added"),
    exerciseId: z.string().min(1),
    reason: z.literal("target_duration"),
  }),
  z.object({
    source: z
      .enum(["base_prescription", "duration_fit"])
      .default("duration_fit"),
    type: z.literal("round_removed"),
    exerciseId: z.string().min(1),
    reason: z.literal("target_duration"),
  }),
  z.object({
    source: z
      .enum(["base_prescription", "duration_fit"])
      .default("duration_fit"),
    type: z.literal("work_duration_increased"),
    exerciseId: z.string().min(1),
    seconds: z.number().int().positive(),
    reason: z.literal("target_duration"),
  }),
  z.object({
    source: z
      .enum(["base_prescription", "duration_fit"])
      .default("duration_fit"),
    type: z.literal("work_duration_reduced"),
    exerciseId: z.string().min(1),
    seconds: z.number().int().positive(),
    reason: z.literal("target_duration"),
  }),
  z.object({
    source: z
      .enum(["base_prescription", "duration_fit"])
      .default("duration_fit"),
    type: z.literal("exercise_added"),
    exerciseId: z.string().min(1),
    reason: z.literal("target_duration"),
  }),
  z.object({
    source: z
      .enum(["base_prescription", "duration_fit"])
      .default("duration_fit"),
    type: z.literal("exercise_removed"),
    exerciseId: z.string().min(1),
    reason: z.literal("target_duration"),
  }),
  z.object({
    source: z
      .enum(["base_prescription", "duration_fit"])
      .default("duration_fit"),
    type: z.literal("recovery_increased"),
    exerciseId: z.string().min(1),
    recovery: z.enum(["between_sets", "between_exercises"]),
    seconds: z.number().int().positive(),
    reason: z.literal("target_duration"),
  }),
]);

const progressionAdjustmentSchema = z.object({
  source: z.literal("weekly_progression"),
  type: z.enum([
    "increase_work_duration",
    "decrease_work_duration",
    "add_round",
    "remove_round",
    "increase_recovery",
    "decrease_recovery",
  ]),
  exerciseId: z.string().min(1),
  phase: progressionPhaseSchema,
  deltaSeconds: z.number().int().positive().optional(),
  deltaRounds: z.number().int().positive().optional(),
  recovery: z.enum(["between_sets", "between_exercises"]).optional(),
});

const feedbackReasonAdjustmentSchema = z.object({
  source: z.literal("feedback"),
  type: z.enum([
    "increase_work_duration",
    "decrease_work_duration",
    "add_round",
    "remove_round",
    "increase_recovery",
    "decrease_recovery",
  ]),
  exerciseId: z.string().min(1),
  feedbackEventId: z.string().min(1),
  rating: z.enum(["too-easy", "too-hard", "pain-or-discomfort"]),
  deltaSeconds: z.number().int().positive().optional(),
  deltaRounds: z.number().int().positive().optional(),
  recovery: z.enum(["between_sets", "between_exercises"]).optional(),
});

const safetyAdjustmentSchema = z.object({
  source: z.literal("safety"),
  type: z.literal("block_progression"),
  exerciseId: z.string().min(1),
  feedbackEventId: z.string().min(1),
  affectedArea: z.enum([
    "shoulder",
    "elbow-forearm",
    "wrist-hand",
    "neck-upper-back",
    "lower-back",
    "hip-groin",
    "knee",
    "calf-achilles",
    "ankle-foot",
    "other",
  ]),
});

export const sessionAdaptationSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("less_time"),
    requestedDurationSeconds: z.number().int().min(300).max(1800),
  }),
  z.object({
    type: z.literal("equipment_unavailable"),
    equipmentIds: z
      .array(z.enum(["light_dumbbell", "dumbbell", "two_dumbbells"]))
      .min(1),
  }),
  z.object({
    type: z.literal("body_area_discomfort"),
    bodyAreas: z.array(z.enum(todayAdaptationBodyAreaValues)).min(1),
  }),
  z.object({
    type: z.literal("replace_exercise"),
    exerciseId: z.string().min(1),
    replacementExerciseId: z.string().min(1),
  }),
  z.object({ type: z.literal("lighter_session") }),
]);

const todayAdaptationAdjustmentSchema = z.discriminatedUnion("type", [
  z.object({
    source: z.literal("today_adaptation"),
    type: z.literal("shortened"),
    originalDurationSeconds: z.number().int().positive(),
    requestedDurationSeconds: z.number().int().positive(),
  }),
  z.object({
    source: z.literal("today_adaptation"),
    type: z.enum([
      "equipment_replacement",
      "comfort_replacement",
      "exercise_replacement",
    ]),
    originalExerciseId: z.string().min(1),
    replacementExerciseId: z.string().min(1),
    unavailableEquipment: z.array(z.string().min(1)).optional(),
    excludedBodyAreas: z
      .array(z.enum(todayAdaptationBodyAreaValues))
      .optional(),
  }),
  z.object({
    source: z.literal("today_adaptation"),
    type: z.literal("exercise_removed"),
    exerciseId: z.string().min(1),
    excludedBodyAreas: z
      .array(z.enum(todayAdaptationBodyAreaValues))
      .optional(),
    unavailableEquipment: z.array(z.string().min(1)).optional(),
  }),
  z.object({
    source: z.literal("today_adaptation"),
    type: z.literal("lighter_work"),
    exerciseIds: z.array(z.string().min(1)).min(1),
    deltaSeconds: z.number().int().positive(),
  }),
  z.object({
    source: z.literal("today_adaptation"),
    type: z.literal("lighter_recovery"),
    exerciseId: z.string().min(1),
    deltaSeconds: z.number().int().positive(),
  }),
]);

export const sessionAdjustmentSchema = z.union([
  durationFitAdjustmentSchema,
  progressionAdjustmentSchema,
  feedbackReasonAdjustmentSchema,
  safetyAdjustmentSchema,
  todayAdaptationAdjustmentSchema,
]);

export const progressionChangeSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.enum(["work_duration_increased", "work_duration_reduced"]),
    exerciseId: z.string().min(1),
    seconds: z.number().int().positive(),
  }),
  z.object({
    type: z.enum(["round_added", "round_removed"]),
    exerciseId: z.string().min(1),
    rounds: z.number().int().positive(),
  }),
  z.object({
    type: z.enum(["recovery_reduced", "recovery_increased"]),
    exerciseId: z.string().min(1),
    recovery: z.enum(["between_sets", "between_exercises"]),
    seconds: z.number().int().positive(),
  }),
]);

export const progressionReasonSchema = z.object({
  reason: z.literal("weekly_progression"),
  phase: progressionPhaseSchema,
  changes: z.array(progressionChangeSchema),
});

export const feedbackAdaptationChangeSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.enum(["increase_work_duration", "decrease_work_duration"]),
    workoutItemId: z.string().min(1),
    exerciseId: z.string().min(1),
    deltaSeconds: z.number().int().positive(),
  }),
  z.object({
    type: z.enum(["add_round", "remove_round"]),
    workoutItemId: z.string().min(1),
    exerciseId: z.string().min(1),
    deltaRounds: z.number().int().positive(),
  }),
  z.object({
    type: z.enum(["increase_recovery", "decrease_recovery"]),
    workoutItemId: z.string().min(1),
    exerciseId: z.string().min(1),
    recovery: z.enum(["between_sets", "between_exercises"]),
    deltaSeconds: z.number().int().positive(),
  }),
  z.object({
    type: z.literal("block_progression"),
    exerciseId: z.string().min(1),
  }),
]);

export const feedbackAdaptationSchema = z.object({
  source: z.literal("feedback"),
  feedbackEventId: z.string().min(1),
  rating: z.enum(["too-easy", "too-hard", "pain-or-discomfort"]),
  type: z.enum([
    "increase_work_duration",
    "add_round",
    "decrease_recovery",
    "decrease_work_duration",
    "remove_round",
    "increase_recovery",
    "pain_progression_block",
  ]),
  affectedArea: z
    .enum([
      "shoulder",
      "elbow-forearm",
      "wrist-hand",
      "neck-upper-back",
      "lower-back",
      "hip-groin",
      "knee",
      "calf-achilles",
      "ankle-foot",
      "other",
    ])
    .optional(),
  changes: z.array(feedbackAdaptationChangeSchema).min(1),
});

const originalSessionSnapshotSchema = z.object({
  workout: workoutSchema,
  sections: sessionSectionsSchema,
  targetDurationSeconds: z.number().int().positive(),
  estimatedDurationSeconds: z.number().int().positive(),
  durationDeltaSeconds: z.number().int(),
  durationStatus: durationStatusSchema,
  adjustments: z.array(sessionAdjustmentSchema),
});

export const plannedWorkoutSchema = z.object({
  id: z.string().min(1),
  scheduledDate: z.string().date(),
  sourceWorkoutId: z.string().min(1),
  workout: workoutSchema,
  targetDurationSeconds: z.number().int().positive(),
  estimatedDurationSeconds: z.number().int().positive(),
  durationDeltaSeconds: z.number().int(),
  durationStatus: durationStatusSchema,
  adjustments: z.array(sessionAdjustmentSchema),
  weekNumber: z.number().int().min(1).max(TRAINING_PLAN_WEEK_COUNT),
  progressionPhase: progressionPhaseSchema,
  progression: progressionReasonSchema,
  feedbackAdaptations: z.array(feedbackAdaptationSchema),
  sections: sessionSectionsSchema,
  originalSessionSnapshot: originalSessionSnapshotSchema,
  todayAdaptations: z.array(sessionAdaptationSchema),
  isEdited: z.boolean(),
  status: z.preprocess(
    (value) => (value === "planned" ? "scheduled" : value),
    sessionLifecycleStatusSchema,
  ),
});

export const gameEventSchema = z.object({
  id: z.string().min(1),
  date: z.string().date(),
  label: z.string().min(1).max(80),
  importance: z.enum(matchImportanceValues).default("normal"),
});

const preFeedbackAdaptationPlannedWorkoutSchema = plannedWorkoutSchema
  .omit({
    feedbackAdaptations: true,
    sections: true,
    originalSessionSnapshot: true,
    todayAdaptations: true,
  })
  .strict();

const preTodayAdaptationPlannedWorkoutSchema = plannedWorkoutSchema
  .omit({
    sections: true,
    originalSessionSnapshot: true,
    todayAdaptations: true,
  })
  .strict();

const preSectionPlannedWorkoutSchema = plannedWorkoutSchema
  .omit({ sections: true, originalSessionSnapshot: true })
  .extend({
    originalSessionSnapshot: originalSessionSnapshotSchema.omit({
      sections: true,
    }),
  })
  .strict();

const migratedMainOnlySectionsSchema = z
  .array(sessionSectionSchema)
  .length(1)
  .refine((sections) => sections[0]?.type === "main", {
    message: "A migrated legacy session may contain only a main section.",
  });

const migratedMainOnlyPlannedWorkoutSchema = plannedWorkoutSchema
  .omit({ sections: true, originalSessionSnapshot: true })
  .extend({
    sections: migratedMainOnlySectionsSchema,
    originalSessionSnapshot: originalSessionSnapshotSchema
      .omit({ sections: true })
      .extend({ sections: migratedMainOnlySectionsSchema }),
  })
  .strict();

const preProgressionPlannedWorkoutSchema =
  preFeedbackAdaptationPlannedWorkoutSchema
    .omit({
      weekNumber: true,
      progressionPhase: true,
      progression: true,
    })
    .strict();

const legacyPlannedWorkoutSchema = preProgressionPlannedWorkoutSchema
  .omit({
    targetDurationSeconds: true,
    estimatedDurationSeconds: true,
    durationDeltaSeconds: true,
    durationStatus: true,
    adjustments: true,
  })
  .strict();

const storedTrainingPlanSchema = z.object({
  version: z.literal(1),
  profile: athleteProfileSchema,
  startDate: z.string().date(),
  endDate: z.string().date(),
  sessions: z.array(
    z.union([
      plannedWorkoutSchema,
      migratedMainOnlyPlannedWorkoutSchema,
      preSectionPlannedWorkoutSchema,
      preTodayAdaptationPlannedWorkoutSchema,
      preFeedbackAdaptationPlannedWorkoutSchema,
      preProgressionPlannedWorkoutSchema,
      legacyPlannedWorkoutSchema,
    ]),
  ),
  games: z.array(gameEventSchema),
  generation: planGenerationMetadataSchema.optional(),
  generatedAt: z.string().datetime(),
  lastRebalancedAt: z.string().datetime().optional(),
});

export const trainingPlanSchema = storedTrainingPlanSchema.transform((plan) => {
  const targetDurationSeconds = plan.profile.sessionDurationMinutes * 60;
  return {
    ...plan,
    generation: plan.generation ?? {
      source: "deterministic" as const,
      profileVersion: ATHLETE_PROFILE_VERSION,
      exerciseCatalogVersion: EXERCISE_CATALOG_VERSION,
      plannerVersion: PLANNER_VERSION,
      explanation:
        "Built locally from your goals, schedule, equipment, and safety constraints.",
      model: null,
    },
    profile: {
      ...plan.profile,
      matches: plan.games.map(({ date, importance }) => ({ date, importance })),
    },
    sessions: plan.sessions.map((session) => {
      if ("sections" in session) return session;
      if ("originalSessionSnapshot" in session) {
        const sections = [
          { type: "main" as const, items: session.workout.items },
        ];
        return {
          ...session,
          sections,
          originalSessionSnapshot: {
            ...session.originalSessionSnapshot,
            sections,
          },
        };
      }
      if ("feedbackAdaptations" in session) {
        const sections = [
          { type: "main" as const, items: session.workout.items },
        ];
        return {
          ...session,
          sections,
          originalSessionSnapshot: {
            workout: session.workout,
            sections,
            targetDurationSeconds: session.targetDurationSeconds,
            estimatedDurationSeconds: session.estimatedDurationSeconds,
            durationDeltaSeconds: session.durationDeltaSeconds,
            durationStatus: session.durationStatus,
            adjustments: session.adjustments,
          },
          todayAdaptations: [],
        };
      }
      if ("progressionPhase" in session) {
        const sections = [
          { type: "main" as const, items: session.workout.items },
        ];
        return {
          ...session,
          feedbackAdaptations: [],
          sections,
          originalSessionSnapshot: {
            workout: session.workout,
            sections,
            targetDurationSeconds: session.targetDurationSeconds,
            estimatedDurationSeconds: session.estimatedDurationSeconds,
            durationDeltaSeconds: session.durationDeltaSeconds,
            durationStatus: session.durationStatus,
            adjustments: session.adjustments,
          },
          todayAdaptations: [],
        };
      }
      const weekNumber =
        getPlanWeekNumber(plan.startDate, session.scheduledDate) ?? 1;
      const progressionPhase = getProgressionPhase(weekNumber);
      if ("targetDurationSeconds" in session) {
        const migrated = {
          ...session,
          weekNumber,
          progressionPhase,
          progression: {
            reason: "weekly_progression" as const,
            phase: progressionPhase,
            changes: [],
          },
          feedbackAdaptations: [],
        };
        return {
          ...migrated,
          sections: [{ type: "main" as const, items: migrated.workout.items }],
          originalSessionSnapshot: {
            workout: migrated.workout,
            sections: [
              { type: "main" as const, items: migrated.workout.items },
            ],
            targetDurationSeconds: migrated.targetDurationSeconds,
            estimatedDurationSeconds: migrated.estimatedDurationSeconds,
            durationDeltaSeconds: migrated.durationDeltaSeconds,
            durationStatus: migrated.durationStatus,
            adjustments: migrated.adjustments,
          },
          todayAdaptations: [],
        };
      }
      const estimatedDurationSeconds = calculateSessionDuration(
        session.workout,
      );
      const migrated = {
        ...session,
        targetDurationSeconds,
        estimatedDurationSeconds,
        durationDeltaSeconds: estimatedDurationSeconds - targetDurationSeconds,
        durationStatus: classifySessionDuration(
          estimatedDurationSeconds,
          targetDurationSeconds,
        ),
        adjustments: [],
        weekNumber,
        progressionPhase,
        progression: {
          reason: "weekly_progression" as const,
          phase: progressionPhase,
          changes: [],
        },
        feedbackAdaptations: [],
      };
      return {
        ...migrated,
        sections: [{ type: "main" as const, items: migrated.workout.items }],
        originalSessionSnapshot: {
          workout: migrated.workout,
          sections: [{ type: "main" as const, items: migrated.workout.items }],
          targetDurationSeconds: migrated.targetDurationSeconds,
          estimatedDurationSeconds: migrated.estimatedDurationSeconds,
          durationDeltaSeconds: migrated.durationDeltaSeconds,
          durationStatus: migrated.durationStatus,
          adjustments: migrated.adjustments,
        },
        todayAdaptations: [],
      };
    }),
  };
});
