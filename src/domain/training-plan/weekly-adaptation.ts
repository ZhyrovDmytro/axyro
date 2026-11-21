import { z } from "zod";
import { exercises as defaultExerciseCatalog } from "@/content/exercises";
import { sportExerciseProfiles } from "@/content/sport-exercise-profiles";
import type { Exercise } from "@/domain/exercise/exercise.types";
import { calculateSessionSectionsDuration } from "@/domain/workout/session-sections";
import {
  classifySessionDuration,
  getSessionDurationToleranceSeconds,
} from "@/domain/workout/session-duration";
import type {
  SessionActivity,
  WorkoutFeedbackEvent,
} from "@/services/persistence/workout-activity-repository";
import { getWorkoutTechnique } from "./generate-training-plan";
import {
  planAvoidedExercisesOnDate,
  planProfileOnDate,
} from "./plan-adjustment";
import { isCompatiblePlanExercise } from "./model-exercise-candidates";
import { feedbackAffectedBodyAreas } from "./feedback-adaptation";
import { weeklyAssessmentSchema } from "./weekly-adaptation.schema";
import { weeklyAdaptationProposalSchema } from "./training-plan.schema";
import type { PlannedWorkout, TrainingPlan } from "./training-plan.types";

export type WeeklyTrainingAssessment = z.infer<typeof weeklyAssessmentSchema>;
export type PlanAdaptationProposal = z.infer<
  typeof weeklyAdaptationProposalSchema
>;

// Explicit feedback dominates; behavior corroborates rather than diagnosing missed sessions.
export const weeklyAdaptationConfig = {
  minimumFeedback: 2,
  minimumFeedbackForHighConfidence: 3,
  recencyWeight: 0.1,
  completionWeight: 0.6,
  skipWeight: 0.35,
  adaptTodayWeight: 0.25,
  previousWeekWeight: 0.15,
  hardFeedbackThreshold: 0.45,
  significantThreshold: 1.2,
  maximumWeeklyIncrease: 10,
  maximumWeeklyDecrease: 15,
  workStepSeconds: 5,
  recoveryStepSeconds: 5,
  incompleteThreshold: 0.8,
  completionTarget: 0.85,
  meaningfulSkipRate: 0.1,
  maximumSkipSignal: 0.25,
  repeatedExerciseObservations: 2,
  modestIncrease: 5,
  modestDecrease: 7,
} as const;

function fingerprint(value: unknown) {
  let hash = 2166136261;
  for (const character of JSON.stringify(value))
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(36);
}

function difficulty(event: WorkoutFeedbackEvent) {
  const values = {
    TOO_EASY: -2,
    SLIGHTLY_EASY: -1,
    JUST_RIGHT: 0,
    HARD: 1,
    TOO_HARD: 2,
  };
  return event.perceivedDifficulty
    ? values[event.perceivedDifficulty]
    : event.rating === "too-easy"
      ? -2
      : event.rating === "too-hard"
        ? 2
        : 0;
}

function isPain(event: WorkoutFeedbackEvent) {
  return (
    event.rating === "pain-or-discomfort" ||
    event.reasons?.includes("PAIN_OR_DISCOMFORT")
  );
}

function snapshotFor(activity: SessionActivity) {
  return (
    activity.executedSnapshot ??
    activity.adaptedSnapshot ??
    activity.plannedSnapshot
  );
}

function painExerciseIds(
  event: WorkoutFeedbackEvent,
  exerciseById: ReadonlyMap<string, Exercise>,
) {
  if (event.affectedExerciseIds?.length) return event.affectedExerciseIds;
  return (
    event.snapshot?.items
      .filter(
        (item) =>
          !event.affectedArea ||
          event.affectedArea === "other" ||
          exerciseById
            .get(item.exerciseId)
            ?.bodyAreas.some((area) =>
              feedbackAffectedBodyAreas[
                event.affectedArea as keyof typeof feedbackAffectedBodyAreas
              ]?.includes(area),
            ),
      )
      .map((item) => item.exerciseId) ?? []
  );
}

export function assessTrainingWeek({
  plan,
  weekNumber,
  activities,
  feedback,
  previousAssessment,
  exerciseCatalog = defaultExerciseCatalog,
  now = new Date(),
}: {
  plan: TrainingPlan;
  weekNumber: number;
  activities: readonly SessionActivity[];
  feedback: readonly WorkoutFeedbackEvent[];
  previousAssessment?: WeeklyTrainingAssessment;
  exerciseCatalog?: readonly Exercise[];
  now?: Date;
}): WeeklyTrainingAssessment {
  const sessions = plan.sessions.filter(
    (session) => session.weekNumber === weekNumber,
  );
  const sessionIds = new Set(sessions.map((session) => session.id));
  const observations = activities
    .filter(
      (activity) =>
        activity.planId === plan.generatedAt &&
        sessionIds.has(activity.sessionId),
    )
    .sort((a, b) => a.id.localeCompare(b.id));
  const completions = new Set(
    observations
      .filter((activity) => activity.status === "completed")
      .map((activity) => activity.sessionId),
  );
  const latest = new Map<string, WorkoutFeedbackEvent>();
  for (const event of [...feedback].sort((a, b) =>
    (a.updatedAt ?? a.recordedAt).localeCompare(b.updatedAt ?? b.recordedAt),
  )) {
    const activity = observations.find(
      (observation) => observation.sessionId === event.sessionId,
    );
    const exactCompletion =
      !activity?.completionId ||
      activity.completionId === event.completionId ||
      isPain(event);
    if (
      exactCompletion &&
      sessionIds.has(event.sessionId) &&
      (!event.planId || event.planId === plan.generatedAt) &&
      (!event.planWeek || event.planWeek === weekNumber)
    )
      latest.set(event.sessionId, event);
  }
  const events = [...latest.values()].sort(
    (a, b) =>
      a.completedAt.localeCompare(b.completedAt) || a.id.localeCompare(b.id),
  );
  const pain = events.filter(isPain);
  const localized = events.filter(
    (event) =>
      isPain(event) ||
      (event.reasons?.includes("TECHNIQUE_DIFFICULTY") &&
        Boolean(event.affectedExerciseIds?.length)),
  );
  const localIds = new Set(
    localized.flatMap((event) => event.affectedExerciseIds ?? []),
  );
  const exerciseById = new Map(
    exerciseCatalog.map((exercise) => [exercise.id, exercise]),
  );
  const painIds = new Set(
    pain.flatMap((event) => painExerciseIds(event, exerciseById)),
  );
  const explicit = events.filter(
    (event) =>
      !localized.includes(event) && event.rating !== "pain-or-discomfort",
  );
  let weighted = 0;
  let weights = 0;
  explicit.forEach((event, index) => {
    const weight =
      1 +
      (weeklyAdaptationConfig.recencyWeight * index) /
        Math.max(1, explicit.length - 1);
    weighted += difficulty(event) * weight;
    weights += weight;
  });
  const average = explicit.length
    ? explicit.reduce((sum, event) => sum + difficulty(event), 0) /
      explicit.length
    : 0;
  const completionFractions = observations
    .filter((activity) => ["completed", "incomplete"].includes(activity.status))
    .map((activity) => {
      const items = snapshotFor(activity)?.items ?? [];
      const explicitFraction = events.find(
        (event) => event.completionId === activity.completionId,
      )?.workoutCompletionPercent;
      if (explicitFraction !== undefined) return explicitFraction / 100;
      if (!items.length) return activity.status === "completed" ? 1 : 0;
      const totalWork = items.reduce(
        (sum, item) =>
          sum + item.workDurationSeconds * item.sets * (item.perSide ? 2 : 1),
        0,
      );
      const completedWork = items.reduce(
        (sum, item) =>
          sum +
          item.workDurationSeconds *
            Math.min(
              item.sets,
              item.completedSets ??
                (item.status === "completed" ? item.sets : 0),
            ) *
            (item.perSide ? 2 : 1),
        0,
      );
      return totalWork ? completedWork / totalWork : 0;
    });
  const eventFractions = events.flatMap((event) =>
    event.workoutCompletionPercent === undefined
      ? []
      : [event.workoutCompletionPercent / 100],
  );
  const fractions = completionFractions.length
    ? completionFractions
    : eventFractions;
  const completionRate = fractions.length
    ? fractions.reduce((a, b) => a + b, 0) / fractions.length
    : completions.size / Math.max(1, sessions.length);
  const items = observations.flatMap(
    (activity) => snapshotFor(activity)?.items ?? [],
  );
  const skipRate =
    items.filter((item) => item.status === "skipped").length /
    Math.max(1, items.length);
  const adaptations = observations.flatMap(
    (activity) => snapshotFor(activity)?.todayAdaptations ?? [],
  );
  const passiveProblems = new Map<string, number>();
  for (const observation of observations) {
    const snapshot = snapshotFor(observation);
    const ids = new Set([
      ...(snapshot?.items
        .filter(
          (item) =>
            item.status === "skipped" ||
            (item.completedSets !== undefined &&
              item.completedSets < item.sets),
        )
        .map((item) => item.exerciseId) ?? []),
      ...(snapshot?.todayAdaptations?.flatMap((adaptation) =>
        adaptation.type === "replace_exercise" ? [adaptation.exerciseId] : [],
      ) ?? []),
    ]);
    ids.forEach((id) =>
      passiveProblems.set(id, (passiveProblems.get(id) ?? 0) + 1),
    );
  }
  passiveProblems.forEach((count, id) => {
    if (count >= weeklyAdaptationConfig.repeatedExerciseObservations)
      localIds.add(id);
  });
  const lighterCount = adaptations.filter(
    (adaptation) =>
      adaptation.type === "lighter_session" ||
      adaptation.type === "body_area_discomfort",
  ).length;
  const replacements = adaptations.filter(
    (adaptation) => adaptation.type === "replace_exercise",
  ).length;
  const substitutionRate = replacements / Math.max(1, items.length);
  const conflicting =
    (explicit.some((event) => difficulty(event) < 0) &&
      (skipRate > weeklyAdaptationConfig.meaningfulSkipRate ||
        completionRate < weeklyAdaptationConfig.incompleteThreshold)) ||
    (average === 0 &&
      fractions.length >= 2 &&
      completionRate < weeklyAdaptationConfig.incompleteThreshold) ||
    (explicit.some((event) => difficulty(event) < 0) &&
      explicit.some((event) => difficulty(event) > 0));
  let signal = weights ? weighted / weights : 0;
  if (fractions.length >= 2)
    signal +=
      Math.max(0, weeklyAdaptationConfig.completionTarget - completionRate) *
      weeklyAdaptationConfig.completionWeight;
  if (skipRate > weeklyAdaptationConfig.meaningfulSkipRate)
    signal += Math.min(
      weeklyAdaptationConfig.maximumSkipSignal,
      skipRate * weeklyAdaptationConfig.skipWeight,
    );
  if (lighterCount >= 2 && signal > 0)
    signal += weeklyAdaptationConfig.adaptTodayWeight;
  if (
    previousAssessment &&
    previousAssessment.weightedDifficultySignal * signal > 0
  )
    signal += Math.sign(signal) * weeklyAdaptationConfig.previousWeekWeight;
  const enough = explicit.length >= weeklyAdaptationConfig.minimumFeedback;
  const timingPreference =
    explicit.filter((event) => event.reasons?.includes("WORKOUT_TOO_LONG"))
      .length >= weeklyAdaptationConfig.minimumFeedback
      ? "shorter"
      : explicit.filter((event) =>
            event.reasons?.includes("INSUFFICIENT_RECOVERY"),
          ).length >= weeklyAdaptationConfig.minimumFeedback
        ? "more-recovery"
        : undefined;
  let assessment: WeeklyTrainingAssessment["assessment"] = !enough
    ? "INSUFFICIENT_DATA"
    : signal >= weeklyAdaptationConfig.significantThreshold
      ? "SIGNIFICANTLY_TOO_HARD"
      : signal >= weeklyAdaptationConfig.hardFeedbackThreshold
        ? "SLIGHTLY_TOO_HARD"
        : signal <= -weeklyAdaptationConfig.significantThreshold
          ? "SIGNIFICANTLY_TOO_EASY"
          : signal <= -weeklyAdaptationConfig.hardFeedbackThreshold
            ? "SLIGHTLY_TOO_EASY"
            : "APPROPRIATE";
  if (conflicting && signal < 0) assessment = "INSUFFICIENT_DATA";
  if (pain.length && assessment.endsWith("TOO_EASY"))
    assessment = "INSUFFICIENT_DATA";
  let adjustment =
    assessment === "SIGNIFICANTLY_TOO_EASY"
      ? weeklyAdaptationConfig.maximumWeeklyIncrease
      : assessment === "SLIGHTLY_TOO_EASY"
        ? weeklyAdaptationConfig.modestIncrease
        : assessment === "SIGNIFICANTLY_TOO_HARD"
          ? -weeklyAdaptationConfig.maximumWeeklyDecrease
          : assessment === "SLIGHTLY_TOO_HARD"
            ? -weeklyAdaptationConfig.modestDecrease
            : 0;
  if (
    previousAssessment &&
    previousAssessment.suggestedAdjustment < 0 &&
    adjustment > 0
  )
    adjustment = Math.min(weeklyAdaptationConfig.modestIncrease, adjustment);
  const confidence =
    !enough || conflicting || completions.size < 2
      ? "LOW"
      : explicit.length >=
            weeklyAdaptationConfig.minimumFeedbackForHighConfidence &&
          completions.size >= 3
        ? "HIGH"
        : "MEDIUM";
  const reasons = [
    `${events.length} workout${events.length === 1 ? "" : "s"} with feedback`,
    ...(explicit.filter((event) => difficulty(event) > 0).length
      ? [
          `${explicit.filter((event) => difficulty(event) > 0).length} workouts felt hard`,
        ]
      : []),
    ...(explicit.filter((event) => difficulty(event) < 0).length
      ? [
          `${explicit.filter((event) => difficulty(event) < 0).length} workouts felt easy`,
        ]
      : []),
    ...(lighterCount >= 2
      ? ["Lighter sessions were requested repeatedly"]
      : []),
    ...(conflicting
      ? ["Your ratings and workout completion give mixed signals"]
      : []),
    ...(pain.length
      ? ["Discomfort needs attention before increasing difficulty"]
      : []),
    ...(localIds.size ? ["Some exercises need an easier alternative"] : []),
  ];
  const state = fingerprint({
    weekNumber,
    observations,
    events,
    previous: previousAssessment?.fingerprint,
  });
  return {
    id: `assessment-${plan.generatedAt}-${weekNumber}-${state}`,
    fingerprint: state,
    planId: plan.generatedAt,
    weekNumber,
    completedSessions: completions.size,
    scheduledSessions: sessions.length,
    explicitFeedbackCount: events.length,
    averageDifficultySignal: average,
    weightedDifficultySignal: signal,
    completionRate,
    skipRate,
    substitutionRate,
    painSignalCount: pain.length,
    confidence,
    assessment,
    suggestedAdjustment: adjustment,
    timingPreference,
    reasons,
    affectedExerciseIds: [...localIds],
    painExerciseIds: [...painIds],
    generatedAt: now.toISOString(),
  };
}

function snapshot(session: PlannedWorkout) {
  return {
    workout: session.workout,
    sections: session.sections,
    targetDurationSeconds: session.targetDurationSeconds,
    estimatedDurationSeconds: session.estimatedDurationSeconds,
    durationDeltaSeconds: session.durationDeltaSeconds,
    durationStatus: session.durationStatus,
    adjustments: session.adjustments,
  };
}

export function buildWeeklyAdaptationProposal({
  assessment,
  plan,
  exerciseCatalog,
  activePainFeedback = [],
  now = new Date(),
}: {
  assessment: WeeklyTrainingAssessment;
  plan: TrainingPlan;
  exerciseCatalog: readonly Exercise[];
  feedback?: readonly WorkoutFeedbackEvent[];
  activePainFeedback?: readonly WorkoutFeedbackEvent[];
  now?: Date;
}): PlanAdaptationProposal | null {
  if (assessment.planId !== plan.generatedAt) return null;
  const exerciseById = new Map(
    exerciseCatalog.map((exercise) => [exercise.id, exercise]),
  );
  const activePain = activePainFeedback.filter(isPain);
  const painIds = new Set([
    ...assessment.painExerciseIds,
    ...activePain.flatMap((event) => painExerciseIds(event, exerciseById)),
  ]);
  const adjustment =
    activePain.length || assessment.painSignalCount
      ? Math.min(0, assessment.suggestedAdjustment)
      : assessment.suggestedAdjustment;
  const targetSessions = plan.sessions.filter(
    (session) => session.weekNumber === assessment.weekNumber + 1,
  );
  for (const event of activePain) {
    if (event.affectedArea && event.affectedArea !== "other") {
      targetSessions
        .flatMap((session) => session.workout.items)
        .forEach((item) => {
          if (
            exerciseById
              .get(item.exerciseId)
              ?.planning.avoidForPainAreas.includes(
                event.affectedArea as Exclude<
                  typeof event.affectedArea,
                  "other"
                >,
              )
          )
            painIds.add(item.exerciseId);
        });
    }
  }
  // Without localization, hold progression until discomfort can be reviewed.
  if ((activePain.length || assessment.painSignalCount) && !painIds.size)
    targetSessions
      .flatMap((session) => session.workout.items)
      .forEach((item) => painIds.add(item.exerciseId));
  const problemIds = new Set([...assessment.affectedExerciseIds, ...painIds]);
  if (!adjustment && !problemIds.size) return null;
  const profiles = new Map(
    sportExerciseProfiles
      .filter((profile) => profile.sport === plan.profile.sport)
      .map((profile) => [profile.exerciseId, profile]),
  );
  const changes: PlanAdaptationProposal["changes"] = [];
  for (const before of plan.sessions.filter(
    (session) =>
      session.weekNumber === assessment.weekNumber + 1 &&
      session.status === "scheduled",
  )) {
    const hasPain = before.workout.items.some((item) =>
      painIds.has(item.exerciseId),
    );
    const explicitlyAdjusted = plan.adjustmentWindows?.some(
      (entry) =>
        entry.sessionIds.includes(before.id) &&
        before.scheduledDate >= entry.start &&
        before.scheduledDate <= entry.end,
    );
    if (
      (before.todayAdaptations.length ||
        before.isEdited ||
        explicitlyAdjusted) &&
      !hasPain
    )
      continue;
    const effectiveProfile = planProfileOnDate(plan, before.scheduledDate);
    const avoided = planAvoidedExercisesOnDate(plan, before.scheduledDate);
    const summaries = new Set<string>();
    const sections = before.sections.map((section) => ({
      ...section,
      items: section.items.map((source) => {
        if (section.type !== "main") return source;
        const exercise = exerciseById.get(source.exerciseId);
        if (!exercise) return source;
        let item = { ...source, prescription: { ...source.prescription } };
        if (problemIds.has(exercise.id)) {
          const regression = exerciseById.get(
            exercise.planning.regressionExerciseId ?? "",
          );
          const originalRoles = profiles.get(exercise.id)?.movementRoles ?? [];
          if (
            regression &&
            regression.id !== exercise.id &&
            isCompatiblePlanExercise(regression, effectiveProfile, "main") &&
            !avoided.includes(regression.id) &&
            regression.laterality === exercise.laterality &&
            originalRoles.length > 0 &&
            profiles
              .get(regression.id)
              ?.movementRoles.includes(originalRoles[0]) &&
            regression.equipment.every(
              (equipment) =>
                equipment === "none" || exercise.equipment.includes(equipment),
            ) &&
            regression.setupRequirements.every((setup) =>
              exercise.setupRequirements.includes(setup),
            ) &&
            !before.workout.items.some(
              (candidate) => candidate.exerciseId === regression.id,
            ) &&
            !painIds.has(regression.id)
          ) {
            item = {
              ...item,
              exerciseId: regression.id,
              prescription: {
                type: "timed",
                durationSeconds: Math.max(
                  regression.planning.safeWorkSeconds.min,
                  Math.min(
                    item.prescription.durationSeconds,
                    regression.planning.safeWorkSeconds.max,
                  ),
                ),
                ...(regression.laterality === "unilateral"
                  ? { perSide: true }
                  : {}),
              },
            };
            delete item.guidanceOverride;
            item.minWorkSeconds = regression.planning.safeWorkSeconds.min;
            item.maxWorkSeconds = regression.planning.safeWorkSeconds.max;
            item.restAfterSetSeconds = Math.max(
              regression.planning.safeRestSeconds.min,
              Math.min(
                item.restAfterSetSeconds ?? 0,
                regression.planning.safeRestSeconds.max,
              ),
            );
            item.restAfterExerciseSeconds = Math.max(
              regression.planning.safeRestSeconds.min,
              Math.min(
                item.restAfterExerciseSeconds ?? 0,
                regression.planning.safeRestSeconds.max,
              ),
            );
            summaries.add("An easier movement with the same training purpose");
          } else {
            const minimum = Math.max(
              source.minWorkSeconds ?? 1,
              exercise.planning.safeWorkSeconds.min,
            );
            item.prescription.durationSeconds = Math.max(
              minimum,
              source.prescription.durationSeconds -
                weeklyAdaptationConfig.workStepSeconds,
            );
            summaries.add("Less work for an exercise that caused difficulty");
          }
          if (painIds.has(exercise.id) && item.exerciseId === exercise.id) {
            for (const change of before.progression.changes.filter(
              (change) => change.exerciseId === exercise.id,
            )) {
              if (change.type === "work_duration_increased")
                item.prescription.durationSeconds = Math.max(
                  exercise.planning.safeWorkSeconds.min,
                  Math.min(
                    item.prescription.durationSeconds,
                    source.prescription.durationSeconds - change.seconds,
                  ),
                );
              if (change.type === "round_added")
                item.sets = Math.max(
                  source.minSets ?? 1,
                  source.sets - change.rounds,
                );
              if (change.type === "recovery_reduced") {
                const field =
                  change.recovery === "between_sets"
                    ? "restAfterSetSeconds"
                    : "restAfterExerciseSeconds";
                item[field] = Math.min(
                  exercise.planning.safeRestSeconds.max,
                  (source[field] ?? 0) + change.seconds,
                );
              }
            }
          }
          return item;
        }
        if (
          !adjustment ||
          (assessment.painSignalCount && adjustment > 0) ||
          exercise.qualities.some((quality) =>
            ["power", "explosiveness", "warm-up"].includes(quality),
          ) ||
          exercise.roles.some((role) =>
            ["mobility", "activation"].includes(role),
          )
        )
          return source;
        const rest = source.restAfterSetSeconds ?? 0;
        const lowerRest = Math.max(10, exercise.planning.safeRestSeconds.min);
        const upperRest = exercise.planning.safeRestSeconds.max;
        const delta = Math.max(
          1,
          Math.round(
            (Math.abs(adjustment) / 100) * source.prescription.durationSeconds,
          ),
        );
        if (adjustment > 0 && source.sets > 1 && rest > lowerRest) {
          item.restAfterSetSeconds = Math.max(
            lowerRest,
            rest - Math.min(weeklyAdaptationConfig.recoveryStepSeconds, delta),
          );
          summaries.add("Slightly shorter recovery");
        } else if (
          adjustment < 0 &&
          assessment.timingPreference !== "shorter" &&
          source.sets > 1 &&
          rest > 0 &&
          rest < upperRest
        ) {
          item.restAfterSetSeconds = Math.min(
            upperRest,
            rest + Math.min(weeklyAdaptationConfig.recoveryStepSeconds, delta),
          );
          summaries.add("Slightly longer recovery");
        } else {
          const minimum = Math.max(
            source.minWorkSeconds ?? source.prescription.durationSeconds,
            exercise.planning.safeWorkSeconds.min,
          );
          const maximum = Math.min(
            source.maxWorkSeconds ?? source.prescription.durationSeconds,
            exercise.planning.safeWorkSeconds.max,
          );
          item.prescription.durationSeconds = Math.max(
            minimum,
            Math.min(
              maximum,
              source.prescription.durationSeconds +
                Math.sign(adjustment) * delta,
            ),
          );
          summaries.add(
            adjustment > 0
              ? "A little more time moving"
              : "A little less time moving",
          );
        }
        return item;
      }),
    }));
    const duration = calculateSessionSectionsDuration(sections);
    if (
      Math.abs(duration - before.targetDurationSeconds) >
        getSessionDurationToleranceSeconds(before.targetDurationSeconds) &&
      !hasPain
    )
      continue;
    const main = sections.find((section) => section.type === "main");
    const workout = {
      ...before.workout,
      items: main?.items ?? before.workout.items,
    };
    const after: PlannedWorkout = {
      ...before,
      sections,
      workout: {
        ...workout,
        difficulty: getWorkoutTechnique(workout, exerciseCatalog),
        estimatedMinutes: Math.max(1, Math.round(duration / 60)),
      },
      estimatedDurationSeconds: duration,
      durationDeltaSeconds: duration - before.targetDurationSeconds,
      durationStatus: classifySessionDuration(
        duration,
        before.targetDurationSeconds,
      ),
    };
    if (JSON.stringify(before.sections) === JSON.stringify(after.sections))
      continue;
    after.weeklyAdaptedSessionSnapshot = snapshot(after);
    changes.push({
      sessionId: before.id,
      summary: [...summaries].join(". "),
      before,
      after,
    });
  }
  if (!changes.length) return null;
  const density = (session: PlannedWorkout) => {
    const work = session.workout.items.reduce(
      (sum, item) =>
        sum +
        item.prescription.durationSeconds *
          item.sets *
          (item.prescription.perSide ? 2 : 1),
      0,
    );
    return work / session.estimatedDurationSeconds;
  };
  const achievedPercent = Math.round(
    (changes.reduce((sum, change) => sum + density(change.after), 0) /
      changes.reduce((sum, change) => sum + density(change.before), 0) -
      1) *
      100,
  );
  return {
    id: `proposal-${assessment.id}`,
    planId: plan.generatedAt,
    assessmentId: assessment.id,
    sourceWeek: assessment.weekNumber,
    targetWeek: assessment.weekNumber + 1,
    assessment: assessment.assessment,
    confidence: assessment.confidence,
    overallAdjustmentPercent: Math.max(-20, Math.min(15, achievedPercent)),
    reasons: assessment.reasons,
    changes,
    status: "PENDING",
    createdAt: now.toISOString(),
  };
}

export function applyWeeklyAdaptationProposal(
  plan: TrainingPlan,
  proposalId: string,
  decision: "ACCEPTED" | "DECLINED",
  now = new Date(),
): TrainingPlan {
  const proposal = plan.weeklyAdaptationProposals?.find(
    (candidate) => candidate.id === proposalId,
  );
  if (
    !proposal ||
    proposal.status !== "PENDING" ||
    proposal.planId !== plan.generatedAt
  )
    return plan;
  const fresh = proposal.changes.every((change) => {
    const current = plan.sessions.find(
      (session) => session.id === change.sessionId,
    );
    return (
      current?.status === "scheduled" &&
      current.weekNumber === proposal.targetWeek &&
      JSON.stringify(current) === JSON.stringify(change.before)
    );
  });
  if (decision === "ACCEPTED" && !fresh)
    throw new Error(
      "Your upcoming workouts changed. Review a refreshed recommendation before adjusting your plan.",
    );
  const replacements = new Map(
    proposal.changes.map((change) => [change.sessionId, change.after]),
  );
  return {
    ...plan,
    sessions:
      decision === "ACCEPTED"
        ? plan.sessions.map(
            (session) => replacements.get(session.id) ?? session,
          )
        : plan.sessions,
    weeklyAdaptationProposals: plan.weeklyAdaptationProposals?.map(
      (candidate) =>
        candidate.id === proposalId
          ? { ...candidate, status: decision, resolvedAt: now.toISOString() }
          : candidate,
    ),
  };
}
