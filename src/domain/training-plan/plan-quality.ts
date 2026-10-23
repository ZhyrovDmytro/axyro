import { isExercisePlanEligible } from "@/domain/content/catalog-quality";
import type { Exercise } from "@/domain/exercise/exercise.types";
import type { SportExerciseProfile } from "@/domain/sport/sport-exercise-profile.types";
import {
  calculateSessionDuration,
  getSessionDurationToleranceSeconds,
} from "@/domain/workout/session-duration";

import { addDays } from "./date";
import { exerciseMatchesDevelopmentArea } from "./profile-relevance";
import { TRAINING_PLAN_WEEK_COUNT } from "./progression";
import type { PlannedWorkout, TrainingPlan } from "./training-plan.types";

export const hardPlanConstraintCodes = [
  "unknown_exercise",
  "pain_conflict",
  "unavailable_equipment",
  "duration_out_of_tolerance",
  "invalid_timing",
  "hard_strength_before_match",
  "missing_warmup",
  "missing_cooldown",
  "unpublished_exercise",
  "missing_development_area",
  "missing_padel_foundation",
  "missing_padel_priority",
] as const;

export type HardPlanConstraintCode = (typeof hardPlanConstraintCodes)[number];

export type PlanValidationError = {
  code: HardPlanConstraintCode;
  message: string;
  sessionId: string;
  exerciseId?: string;
};

export type SoftPlanQualityTarget =
  | "workout_variety"
  | "main_exercise_variety"
  | "weekly_limitation_coverage"
  | "whole_body_balance"
  | "visible_progression"
  | "familiarity_balance"
  | "preferred_movements";

export type SoftPlanQualityMetric = {
  target: SoftPlanQualityTarget;
  score: number;
  maximum: number;
  message: string;
};

export type PlanQualityReport = {
  valid: boolean;
  hardErrors: PlanValidationError[];
  softScore: number;
  softScoreMaximum: 100;
  softMetrics: SoftPlanQualityMetric[];
};

type PlanQualityInput = {
  plan: TrainingPlan;
  exerciseCatalog: readonly Exercise[];
  sportProfiles?: readonly SportExerciseProfile[];
  preferredExerciseIds?: readonly string[];
};

function hasEquipment(exercise: Exercise, plan: TrainingPlan) {
  const available = new Set(plan.profile.equipment);
  return exercise.equipment.every((equipment) => {
    if (equipment === "none") return true;
    if (equipment === "two_dumbbells") return available.has("two-dumbbells");
    return available.has("one-dumbbell") || available.has("two-dumbbells");
  });
}

function isHardStrengthSession(
  session: PlannedWorkout,
  exerciseById: ReadonlyMap<string, Exercise>,
) {
  const main = session.sections.find((section) => section.type === "main");
  const mainExercises =
    main?.items.flatMap((item) => {
      const exercise = exerciseById.get(item.exerciseId);
      return exercise ? [exercise] : [];
    }) ?? [];
  if (mainExercises.length === 0) return false;
  const strengthCount = mainExercises.filter((exercise) =>
    exercise.planning.trainingQualities.includes("strength"),
  ).length;
  const hasHighIntensityStrength = mainExercises.some(
    (exercise) =>
      exercise.sessionIntensity === "high" &&
      exercise.planning.trainingQualities.includes("strength"),
  );
  return (
    hasHighIntensityStrength ||
    (session.progressionPhase === "peak" &&
      strengthCount / mainExercises.length >= 0.5)
  );
}

function timingErrors(
  session: PlannedWorkout,
  exerciseById: ReadonlyMap<string, Exercise>,
) {
  const errors: PlanValidationError[] = [];
  for (const section of session.sections) {
    for (const item of section.items) {
      const exercise = exerciseById.get(item.exerciseId);
      if (!exercise) continue;
      const work = item.prescription.durationSeconds;
      const minimumSets = item.minSets ?? 1;
      const maximumSets = item.maxSets ?? 20;
      // Support sections own fixed, conservative construction bounds. Main
      // work must satisfy both its copied item bounds and the catalog envelope.
      const minimumWork =
        section.type === "main"
          ? Math.max(
              item.minWorkSeconds ?? 1,
              exercise.planning.safeWorkSeconds.min,
            )
          : (item.minWorkSeconds ?? 1);
      const maximumWork =
        section.type === "main"
          ? Math.min(
              item.maxWorkSeconds ?? 3600,
              exercise.planning.safeWorkSeconds.max,
            )
          : (item.maxWorkSeconds ?? 3600);
      const restValues = [
        item.restAfterSetSeconds,
        item.restAfterExerciseSeconds,
      ].filter((value): value is number => value !== undefined);
      const invalidRest =
        section.type === "main" &&
        restValues.some(
          (value) =>
            value < exercise.planning.safeRestSeconds.min ||
            value > exercise.planning.safeRestSeconds.max,
        );
      if (
        item.sets < minimumSets ||
        item.sets > maximumSets ||
        work < minimumWork ||
        work > maximumWork ||
        invalidRest
      ) {
        errors.push({
          code: "invalid_timing",
          sessionId: session.id,
          exerciseId: item.exerciseId,
          message: `${item.exerciseId} has timing outside its safe construction range.`,
        });
      }
    }
  }
  return errors;
}

export function validateTrainingPlanHardConstraints({
  plan,
  exerciseCatalog,
  sportProfiles = [],
}: PlanQualityInput): PlanValidationError[] {
  const exerciseById = new Map(
    exerciseCatalog.map((exercise) => [exercise.id, exercise]),
  );
  const matchDays = new Set(plan.games.map((game) => game.date));
  const sportProfileByExerciseId = new Map(
    sportProfiles
      .filter((profile) => profile.sport === plan.profile.sport)
      .map((profile) => [profile.exerciseId, profile]),
  );
  const errors: PlanValidationError[] = [];

  for (const session of plan.sessions) {
    const warmup = session.sections.find(
      (section) => section.type === "warmup",
    );
    const cooldown = session.sections.find(
      (section) => section.type === "cooldown",
    );
    if (!warmup?.items.length) {
      errors.push({
        code: "missing_warmup",
        sessionId: session.id,
        message: "A warm-up section with at least one exercise is required.",
      });
    }
    if (!cooldown?.items.length) {
      errors.push({
        code: "missing_cooldown",
        sessionId: session.id,
        message: "A cooldown section with at least one exercise is required.",
      });
    }

    const actualDuration = calculateSessionDuration({
      items: session.sections.flatMap((section) => section.items),
    });
    if (
      Math.abs(actualDuration - session.targetDurationSeconds) >
      getSessionDurationToleranceSeconds(session.targetDurationSeconds)
    ) {
      errors.push({
        code: "duration_out_of_tolerance",
        sessionId: session.id,
        message: `Session duration is ${actualDuration - session.targetDurationSeconds} seconds from target.`,
      });
    }

    for (const item of session.sections.flatMap((section) => section.items)) {
      const exercise = exerciseById.get(item.exerciseId);
      if (!exercise) {
        errors.push({
          code: "unknown_exercise",
          sessionId: session.id,
          exerciseId: item.exerciseId,
          message: `Unknown exercise ID: ${item.exerciseId}.`,
        });
        continue;
      }
      if (!isExercisePlanEligible(exercise)) {
        errors.push({
          code: "unpublished_exercise",
          sessionId: session.id,
          exerciseId: exercise.id,
          message: `${exercise.id} is not published for plan use.`,
        });
      }
      if (
        exercise.planning.avoidForPainAreas.some((area) =>
          plan.profile.painAreas.includes(area),
        )
      ) {
        errors.push({
          code: "pain_conflict",
          sessionId: session.id,
          exerciseId: exercise.id,
          message: `${exercise.id} conflicts with a reported pain area.`,
        });
      }
      if (!hasEquipment(exercise, plan)) {
        errors.push({
          code: "unavailable_equipment",
          sessionId: session.id,
          exerciseId: exercise.id,
          message: `${exercise.id} requires unavailable equipment.`,
        });
      }
    }

    errors.push(...timingErrors(session, exerciseById));
    if (
      matchDays.has(addDays(session.scheduledDate, 1)) &&
      isHardStrengthSession(session, exerciseById)
    ) {
      errors.push({
        code: "hard_strength_before_match",
        sessionId: session.id,
        message:
          "A hard strength session cannot be scheduled the day before a match.",
      });
    }
  }

  for (const sessions of weekGroups(plan)) {
    if (sessions.length < plan.profile.sessionsPerWeek) continue;
    const mainExercises = sessions.flatMap((session) =>
      mainExerciseIds(session).flatMap((id) => {
        const exercise = exerciseById.get(id);
        return exercise ? [exercise] : [];
      }),
    );
    for (const area of plan.profile.developmentAreas) {
      const covered = mainExercises.some((exercise) =>
        exerciseMatchesDevelopmentArea(
          area,
          exercise,
          sportProfileByExerciseId.get(exercise.id),
        ),
      );
      if (!covered) {
        errors.push({
          code: "missing_development_area",
          sessionId: sessions[0].id,
          message: `Week ${sessions[0].weekNumber} does not train the selected development area: ${area}.`,
        });
      }
    }
    if (
      plan.profile.sport === "padel" &&
      sportProfileByExerciseId.size > 0 &&
      !mainExercises.some(
        (exercise) =>
          sportProfileByExerciseId.get(exercise.id)?.trainingFunction ===
          "capacity",
      )
    ) {
      errors.push({
        code: "missing_padel_foundation",
        sessionId: sessions[0].id,
        message: `Week ${sessions[0].weekNumber} needs at least one capacity exercise that builds a padel physical foundation.`,
      });
    }
  }

  const planExerciseIds = new Set(plan.sessions.flatMap(mainExerciseIds));
  for (const priority of plan.profile.padelLimitations) {
    // Never require a goal that is unavailable under the athlete's pain/equipment constraints.
    const achievable = exerciseCatalog.some(
      (exercise) =>
        isExercisePlanEligible(exercise) &&
        hasEquipment(exercise, plan) &&
        !exercise.planning.avoidForPainAreas.some((area) =>
          plan.profile.painAreas.includes(area),
        ) &&
        sportProfileByExerciseId
          .get(exercise.id)
          ?.problemsAddressed.includes(priority),
    );
    if (!achievable) continue;
    const covered = [...planExerciseIds].some((exerciseId) =>
      sportProfileByExerciseId
        .get(exerciseId)
        ?.problemsAddressed.includes(priority),
    );
    if (!covered && plan.sessions[0]) {
      errors.push({
        code: "missing_padel_priority",
        sessionId: plan.sessions[0].id,
        message: `The plan does not include an exercise for the selected padel priority: ${priority}.`,
      });
    }
  }
  return errors;
}

function metric(
  target: SoftPlanQualityTarget,
  ratio: number,
  maximum: number,
  message: string,
): SoftPlanQualityMetric {
  return {
    target,
    score: Math.round(Math.max(0, Math.min(1, ratio)) * maximum),
    maximum,
    message,
  };
}

function weekGroups(plan: TrainingPlan) {
  return Array.from(
    { length: TRAINING_PLAN_WEEK_COUNT },
    (_, index) => index + 1,
  ).map((week) =>
    plan.sessions.filter((session) => session.weekNumber === week),
  );
}

function mainExerciseIds(session: PlannedWorkout) {
  return (
    session.sections
      .find((section) => section.type === "main")
      ?.items.map((item) => item.exerciseId) ?? []
  );
}

export function scoreTrainingPlanSoftQuality({
  plan,
  exerciseCatalog,
  sportProfiles = [],
  preferredExerciseIds = [],
}: PlanQualityInput): SoftPlanQualityMetric[] {
  const exerciseById = new Map(
    exerciseCatalog.map((exercise) => [exercise.id, exercise]),
  );
  const signatures = plan.sessions.map((session) =>
    [...mainExerciseIds(session)].sort().join("|"),
  );
  const consecutiveDuplicates = signatures
    .slice(1)
    .filter((signature, index) => signature === signatures[index]).length;
  const occurrence = new Map<string, number>();
  plan.sessions
    .flatMap(mainExerciseIds)
    .forEach((id) => occurrence.set(id, (occurrence.get(id) ?? 0) + 1));
  const repetitionLimit = Math.max(2, Math.ceil(plan.sessions.length / 2));
  const overRepeated = [...occurrence.values()].filter(
    (count) => count > repetitionLimit,
  ).length;

  const profileByExerciseId = new Map(
    sportProfiles
      .filter((profile) => profile.sport === plan.profile.sport)
      .map((profile) => [profile.exerciseId, profile]),
  );
  const completeWeeks = weekGroups(plan).filter(
    (sessions) => sessions.length === plan.profile.sessionsPerWeek,
  );
  const limitations = plan.profile.padelLimitations;
  const weeklyLimitationChecks = completeWeeks.flatMap((sessions) =>
    limitations.map((limitation) =>
      sessions.some((session) =>
        mainExerciseIds(session).some((id) =>
          profileByExerciseId.get(id)?.problemsAddressed.includes(limitation),
        ),
      ),
    ),
  );
  const limitationRatio =
    weeklyLimitationChecks.length === 0
      ? 1
      : weeklyLimitationChecks.filter(Boolean).length /
        weeklyLimitationChecks.length;

  const balanceGroups = [
    new Set(["legs", "glutes"]),
    new Set(["shoulders", "chest", "back", "arms"]),
    new Set(["core", "full-body"]),
  ];
  const balanceChecks = completeWeeks.flatMap((sessions) => {
    const bodyAreas = new Set(
      sessions
        .flatMap(mainExerciseIds)
        .flatMap((id) => exerciseById.get(id)?.bodyAreas ?? []),
    );
    return balanceGroups.map((group) =>
      [...group].some((area) =>
        bodyAreas.has(area as Exercise["bodyAreas"][number]),
      ),
    );
  });
  const progressionGroups = new Map<string, PlannedWorkout[]>();
  plan.sessions.forEach((session) => {
    const group = progressionGroups.get(session.sourceWorkoutId) ?? [];
    group.push(session);
    progressionGroups.set(session.sourceWorkoutId, group);
  });
  const progressionChecks = [...progressionGroups.values()].map((sessions) => {
    const ordered = [...sessions].sort((left, right) =>
      left.scheduledDate.localeCompare(right.scheduledDate),
    );
    const loads = ordered.map((session) =>
      calculateSessionDuration({ items: session.workout.items }),
    );
    return (
      new Set(loads).size > 1 ||
      ordered.some((session) => session.progression.changes.length > 0)
    );
  });
  const familiarCounts = [...occurrence.values()];
  const familiarityRatio =
    familiarCounts.length === 0
      ? 0
      : familiarCounts.filter((count) => count >= 2 && count <= repetitionLimit)
          .length / familiarCounts.length;
  const usedIds = new Set(plan.sessions.flatMap(mainExerciseIds));
  const preferredRatio =
    preferredExerciseIds.length === 0
      ? 1
      : preferredExerciseIds.filter((id) => usedIds.has(id)).length /
        preferredExerciseIds.length;

  return [
    metric(
      "workout_variety",
      signatures.length <= 1
        ? 1
        : 1 - consecutiveDuplicates / (signatures.length - 1),
      15,
      "Avoid consecutive duplicate workouts.",
    ),
    metric(
      "main_exercise_variety",
      occurrence.size === 0 ? 0 : 1 - overRepeated / occurrence.size,
      15,
      "Avoid repeating the same main exercise too often.",
    ),
    metric(
      "weekly_limitation_coverage",
      limitationRatio,
      20,
      "Cover primary limitations every week.",
    ),
    metric(
      "whole_body_balance",
      balanceChecks.filter(Boolean).length / Math.max(1, balanceChecks.length),
      15,
      "Maintain lower-body, upper-body, and trunk coverage.",
    ),
    metric(
      "visible_progression",
      progressionChecks.filter(Boolean).length /
        Math.max(1, progressionChecks.length),
      15,
      "Make progression visible across repeated sessions.",
    ),
    metric(
      "familiarity_balance",
      familiarityRatio,
      10,
      "Repeat enough movements for familiarity without overuse.",
    ),
    metric(
      "preferred_movements",
      preferredRatio,
      10,
      "Prioritize preferred movements when they remain safe.",
    ),
  ];
}

export function assessTrainingPlanQuality(
  input: PlanQualityInput,
): PlanQualityReport {
  const hardErrors = validateTrainingPlanHardConstraints(input);
  const softMetrics = scoreTrainingPlanSoftQuality(input);
  return {
    valid: hardErrors.length === 0,
    hardErrors,
    softScore: softMetrics.reduce((total, item) => total + item.score, 0),
    softScoreMaximum: 100,
    softMetrics,
  };
}

export type ResolveTrainingPlanResult = {
  plan: TrainingPlan;
  source: "initial" | "repair" | "fallback";
  repairAttempted: boolean;
  quality: PlanQualityReport;
};

/**
 * Accepts at most one model repair. The fallback is deterministic application
 * policy and is held to the same hard constraints before it can be returned.
 */
export async function resolveTrainingPlanWithRepair({
  initialPlan,
  repair,
  fallback,
  qualityInput,
}: {
  initialPlan: TrainingPlan;
  repair: (
    errors: readonly PlanValidationError[],
  ) => Promise<TrainingPlan> | TrainingPlan;
  fallback: () => Promise<TrainingPlan> | TrainingPlan;
  qualityInput: Omit<PlanQualityInput, "plan">;
}): Promise<ResolveTrainingPlanResult> {
  const assess = (plan: TrainingPlan) =>
    assessTrainingPlanQuality({ ...qualityInput, plan });
  const initialQuality = assess(initialPlan);
  if (initialQuality.valid) {
    return {
      plan: initialPlan,
      source: "initial",
      repairAttempted: false,
      quality: initialQuality,
    };
  }
  const repairedPlan = await repair(initialQuality.hardErrors);
  const repairedQuality = assess(repairedPlan);
  if (repairedQuality.valid) {
    return {
      plan: repairedPlan,
      source: "repair",
      repairAttempted: true,
      quality: repairedQuality,
    };
  }
  const fallbackPlan = await fallback();
  const fallbackQuality = assess(fallbackPlan);
  if (!fallbackQuality.valid) {
    throw new Error(
      `Deterministic fallback failed hard validation: ${fallbackQuality.hardErrors
        .map((error) => error.message)
        .join(" ")}`,
    );
  }
  return {
    plan: fallbackPlan,
    source: "fallback",
    repairAttempted: true,
    quality: fallbackQuality,
  };
}
