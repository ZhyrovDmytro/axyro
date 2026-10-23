import { publishedExercises as exercises } from "@/content/exercises";
import { sportExerciseProfiles } from "@/content/sport-exercise-profiles";
import { isExercisePlanEligible } from "@/domain/content/catalog-quality";
import type {
  BodyArea,
  Equipment,
  Exercise,
} from "@/domain/exercise/exercise.types";
import type { SportExerciseProfile } from "@/domain/sport/sport-exercise-profile.types";
import {
  calculateSessionDuration,
  classifySessionDuration,
  getSessionDurationToleranceSeconds,
  SESSION_DURATION_TOLERANCE,
} from "@/domain/workout/session-duration";
import {
  buildSessionSections,
  reserveSupportExerciseIds,
  calculateMainWorkoutFitTarget,
  calculateSessionSectionDuration,
  calculateSessionSectionsDuration,
  validateGeneratedSessionSections,
} from "@/domain/workout/session-sections";
import type {
  SessionSection,
  Workout,
  WorkoutItem,
} from "@/domain/workout/workout.types";
import type { WorkoutFeedbackEvent } from "@/services/persistence/workout-activity-repository";

import { addDays, fromDateKey, preferredDayIndexes, toDateKey } from "./date";
import {
  applyFeedbackAdaptation,
  deriveAdaptation,
  feedbackAffectedBodyAreas,
} from "./feedback-adaptation";
import {
  getProgressionPhase,
  getProgressionPrescription,
  TRAINING_PLAN_DURATION_DAYS,
} from "./progression";
import {
  ATHLETE_PROFILE_VERSION,
  EXERCISE_CATALOG_VERSION,
  PLANNER_VERSION,
} from "./planner-versions";
import type { AdaptationProfile } from "./adaptation-profile";
import { exerciseMatchesDevelopmentArea } from "./profile-relevance";
import { questionnaireFocusForSlot } from "./questionnaire-context";
import {
  getPersonalizedSessionDescription,
  getPersonalizedSessionTitle,
} from "./personalized-session-title";
import type {
  AthleteProfile,
  DurationStatus,
  PlanGenerationMetadata,
  PlannedWorkout,
  SessionAdjustment,
  TrainingPlan,
} from "./training-plan.types";

const DURATION_STEP_SECONDS = 5;
const ON_TARGET_SECONDS = SESSION_DURATION_TOLERANCE.onTargetSeconds;
type DurationAdjustment = Extract<
  SessionAdjustment,
  { reason: "target_duration" }
>;

export type GeneratedTrainingSession = {
  workout: Workout;
  sections: SessionSection[];
  targetDurationSeconds: number;
  estimatedDurationSeconds: number;
  durationDeltaSeconds: number;
  durationStatus: DurationStatus;
  adjustments: DurationAdjustment[];
};

export class UnsupportedPlanDurationError extends Error {
  readonly targetMinutes: number;
  readonly closestMinutes: readonly number[];

  constructor(
    targetDurationSeconds: number,
    actualDurations: readonly number[],
  ) {
    const targetMinutes = Math.round(targetDurationSeconds / 60);
    const closestMinutes = [
      ...new Set(
        actualDurations.map((seconds) => Math.max(1, Math.round(seconds / 60))),
      ),
    ].sort((left, right) => left - right);
    const availableRange =
      closestMinutes.length === 0
        ? null
        : closestMinutes.length === 1
          ? `${closestMinutes[0]} minutes`
          : `${closestMinutes[0]}–${closestMinutes.at(-1)} minutes`;
    super(
      availableRange
        ? `Axyro cannot safely build a ${targetMinutes}-minute plan with these answers. The closest compatible sessions are ${availableRange}. Choose a shorter duration or adjust your equipment or discomfort constraints.`
        : `Axyro cannot safely build a ${targetMinutes}-minute plan with these answers because no compatible sessions are available. Adjust your equipment or discomfort constraints and try again.`,
    );
    this.name = "UnsupportedPlanDurationError";
    this.targetMinutes = targetMinutes;
    this.closestMinutes = closestMinutes;
  }
}

function assertPlanDurationFidelity(plan: TrainingPlan): TrainingPlan {
  if (plan.sessions.length === 0) {
    throw new UnsupportedPlanDurationError(
      plan.profile.sessionDurationMinutes * 60,
      [],
    );
  }
  const invalidSessions = plan.sessions.filter(
    (session) =>
      Math.abs(session.durationDeltaSeconds) >
      getSessionDurationToleranceSeconds(session.targetDurationSeconds),
  );
  if (invalidSessions.length > 0) {
    throw new UnsupportedPlanDurationError(
      invalidSessions[0].targetDurationSeconds,
      invalidSessions.map((session) => session.estimatedDurationSeconds),
    );
  }
  return plan;
}

export function refreshPlannedWorkoutDuration(
  session: PlannedWorkout,
): PlannedWorkout {
  const sections = session.sections.map((section) =>
    section.type === "main"
      ? { ...section, items: session.workout.items }
      : section,
  );
  const estimatedDurationSeconds = calculateSessionSectionsDuration(sections);
  return {
    ...session,
    sections,
    workout: {
      ...session.workout,
      estimatedMinutes: Math.max(1, Math.round(estimatedDurationSeconds / 60)),
    },
    estimatedDurationSeconds,
    durationDeltaSeconds:
      estimatedDurationSeconds - session.targetDurationSeconds,
    durationStatus: classifySessionDuration(
      estimatedDurationSeconds,
      session.targetDurationSeconds,
    ),
  };
}

function itemBounds(item: WorkoutItem) {
  return {
    role: item.role ?? "core",
    priority: item.priority ?? 50,
    minSets: item.minSets ?? item.sets,
    maxSets: item.maxSets ?? item.sets,
    minWorkSeconds: item.minWorkSeconds ?? item.prescription.durationSeconds,
    maxWorkSeconds: item.maxWorkSeconds ?? item.prescription.durationSeconds,
  } as const;
}

function updateItem(
  workout: Workout,
  itemId: string,
  update: (item: WorkoutItem) => WorkoutItem,
): Workout {
  return {
    ...workout,
    items: workout.items.map((item) =>
      item.id === itemId ? update(item) : item,
    ),
  };
}

function improvesTarget(before: number, after: number, targetSeconds: number) {
  return Math.abs(targetSeconds - after) < Math.abs(targetSeconds - before);
}

function addRoundsTowardTarget(
  source: Workout,
  targetSeconds: number,
  adjustments: DurationAdjustment[],
  protectedExerciseIds: ReadonlySet<string>,
) {
  let workout = source;
  while (
    calculateSessionDuration(workout) <
    targetSeconds - ON_TARGET_SECONDS
  ) {
    const before = calculateSessionDuration(workout);
    const candidates = workout.items
      .filter(
        (item) =>
          !protectedExerciseIds.has(item.exerciseId) &&
          item.sets < itemBounds(item).maxSets,
      )
      .sort((left, right) => {
        const leftBounds = itemBounds(left);
        const rightBounds = itemBounds(right);
        const roleOrder = { core: 0, accessory: 1, optional: 2 } as const;
        return (
          left.sets - leftBounds.minSets - (right.sets - rightBounds.minSets) ||
          roleOrder[leftBounds.role] - roleOrder[rightBounds.role] ||
          rightBounds.priority - leftBounds.priority ||
          left.id.localeCompare(right.id)
        );
      });
    const candidate = candidates.find((item) => {
      const next = updateItem(workout, item.id, (current) => ({
        ...current,
        sets: current.sets + 1,
      }));
      return improvesTarget(
        before,
        calculateSessionDuration(next),
        targetSeconds,
      );
    });
    if (!candidate) break;
    workout = updateItem(workout, candidate.id, (item) => ({
      ...item,
      sets: item.sets + 1,
    }));
    adjustments.push({
      source: "duration_fit",
      type: "round_added",
      exerciseId: candidate.exerciseId,
      reason: "target_duration",
    });
  }
  return workout;
}

function removeRoundsTowardTarget(
  source: Workout,
  targetSeconds: number,
  adjustments: DurationAdjustment[],
  protectedExerciseIds: ReadonlySet<string>,
) {
  let workout = source;
  while (
    calculateSessionDuration(workout) >
    targetSeconds + ON_TARGET_SECONDS
  ) {
    const before = calculateSessionDuration(workout);
    const candidates = workout.items
      .filter(
        (item) =>
          !protectedExerciseIds.has(item.exerciseId) &&
          item.sets > itemBounds(item).minSets,
      )
      .sort((left, right) => {
        const leftBounds = itemBounds(left);
        const rightBounds = itemBounds(right);
        const roleOrder = { optional: 0, accessory: 1, core: 2 } as const;
        return (
          roleOrder[leftBounds.role] - roleOrder[rightBounds.role] ||
          right.sets - rightBounds.minSets - (left.sets - leftBounds.minSets) ||
          leftBounds.priority - rightBounds.priority ||
          left.id.localeCompare(right.id)
        );
      });
    const candidate = candidates.find((item) => {
      const next = updateItem(workout, item.id, (current) => ({
        ...current,
        sets: current.sets - 1,
      }));
      return improvesTarget(
        before,
        calculateSessionDuration(next),
        targetSeconds,
      );
    });
    if (!candidate) break;
    workout = updateItem(workout, candidate.id, (item) => ({
      ...item,
      sets: item.sets - 1,
    }));
    adjustments.push({
      source: "duration_fit",
      type: "round_removed",
      exerciseId: candidate.exerciseId,
      reason: "target_duration",
    });
  }
  return workout;
}

function adjustWorkTowardTarget(
  source: Workout,
  targetSeconds: number,
  direction: "increase" | "reduce",
  adjustments: DurationAdjustment[],
  protectedExerciseIds: ReadonlySet<string>,
) {
  let workout = source;
  const shouldContinue = (duration: number) =>
    direction === "increase"
      ? duration < targetSeconds - ON_TARGET_SECONDS
      : duration > targetSeconds + ON_TARGET_SECONDS;

  while (shouldContinue(calculateSessionDuration(workout))) {
    const before = calculateSessionDuration(workout);
    const candidates = workout.items
      .filter((item) => {
        if (protectedExerciseIds.has(item.exerciseId)) return false;
        const bounds = itemBounds(item);
        return direction === "increase"
          ? item.prescription.durationSeconds < bounds.maxWorkSeconds
          : item.prescription.durationSeconds > bounds.minWorkSeconds;
      })
      .sort((left, right) => {
        const leftBounds = itemBounds(left);
        const rightBounds = itemBounds(right);
        const leftDistance =
          direction === "increase"
            ? left.prescription.durationSeconds - leftBounds.minWorkSeconds
            : leftBounds.maxWorkSeconds - left.prescription.durationSeconds;
        const rightDistance =
          direction === "increase"
            ? right.prescription.durationSeconds - rightBounds.minWorkSeconds
            : rightBounds.maxWorkSeconds - right.prescription.durationSeconds;
        return (
          leftDistance - rightDistance ||
          rightBounds.priority - leftBounds.priority ||
          left.id.localeCompare(right.id)
        );
      });
    let selected:
      { item: WorkoutItem; seconds: number; workout: Workout } | undefined;
    for (const item of candidates) {
      const bounds = itemBounds(item);
      const available =
        direction === "increase"
          ? bounds.maxWorkSeconds - item.prescription.durationSeconds
          : item.prescription.durationSeconds - bounds.minWorkSeconds;
      const seconds = Math.min(DURATION_STEP_SECONDS, available);
      const next = updateItem(workout, item.id, (current) => ({
        ...current,
        prescription: {
          ...current.prescription,
          durationSeconds:
            current.prescription.durationSeconds +
            (direction === "increase" ? seconds : -seconds),
        },
      }));
      if (
        improvesTarget(before, calculateSessionDuration(next), targetSeconds)
      ) {
        selected = { item, seconds, workout: next };
        break;
      }
    }
    if (!selected) break;
    workout = selected.workout;
    adjustments.push({
      source: "duration_fit",
      type:
        direction === "increase"
          ? "work_duration_increased"
          : "work_duration_reduced",
      exerciseId: selected.item.exerciseId,
      seconds: selected.seconds,
      reason: "target_duration",
    });
  }
  return workout;
}

function increaseRecoveryTowardTarget(
  source: Workout,
  targetSeconds: number,
  eligibleExercises: readonly Exercise[],
  adjustments: DurationAdjustment[],
  protectedExerciseIds: ReadonlySet<string>,
) {
  let workout = source;
  const exerciseById = new Map(
    eligibleExercises.map((exercise) => [exercise.id, exercise]),
  );
  while (
    calculateSessionDuration(workout) <
    targetSeconds - ON_TARGET_SECONDS
  ) {
    const before = calculateSessionDuration(workout);
    let selected:
      | {
          item: WorkoutItem;
          field: "restAfterSetSeconds" | "restAfterExerciseSeconds";
          recovery: "between_sets" | "between_exercises";
          seconds: number;
        }
      | undefined;

    for (const item of workout.items) {
      if (protectedExerciseIds.has(item.exerciseId)) continue;
      const maximum = exerciseById.get(item.exerciseId)?.planning
        .safeRestSeconds.max;
      if (maximum === undefined) continue;
      for (const candidate of [
        {
          field: "restAfterSetSeconds" as const,
          recovery: "between_sets" as const,
        },
        {
          field: "restAfterExerciseSeconds" as const,
          recovery: "between_exercises" as const,
        },
      ]) {
        const current = item[candidate.field] ?? 0;
        if (current >= maximum) continue;
        const seconds = Math.min(DURATION_STEP_SECONDS, maximum - current);
        const next = updateItem(workout, item.id, (currentItem) => ({
          ...currentItem,
          [candidate.field]: current + seconds,
        }));
        if (
          improvesTarget(before, calculateSessionDuration(next), targetSeconds)
        ) {
          selected = { item, ...candidate, seconds };
          break;
        }
      }
      if (selected) break;
    }
    if (!selected) break;
    workout = updateItem(workout, selected.item.id, (item) => ({
      ...item,
      [selected.field]: (item[selected.field] ?? 0) + selected.seconds,
    }));
    adjustments.push({
      source: "duration_fit",
      type: "recovery_increased",
      exerciseId: selected.item.exerciseId,
      recovery: selected.recovery,
      seconds: selected.seconds,
      reason: "target_duration",
    });
  }
  return workout;
}

function removeOptionalExerciseTowardTarget(
  source: Workout,
  targetSeconds: number,
  adjustments: DurationAdjustment[],
  protectedExerciseIds: ReadonlySet<string>,
) {
  let workout = source;
  while (
    workout.items.length > 2 &&
    calculateSessionDuration(workout) > targetSeconds + ON_TARGET_SECONDS
  ) {
    const before = calculateSessionDuration(workout);
    const candidates = workout.items
      .filter(
        (item) =>
          !protectedExerciseIds.has(item.exerciseId) &&
          itemBounds(item).role === "optional",
      )
      .sort(
        (left, right) =>
          itemBounds(left).priority - itemBounds(right).priority ||
          left.id.localeCompare(right.id),
      );
    const candidate = candidates.find((item) => {
      const next = {
        ...workout,
        items: workout.items.filter((current) => current.id !== item.id),
      };
      return improvesTarget(
        before,
        calculateSessionDuration(next),
        targetSeconds,
      );
    });
    if (!candidate) break;
    workout = {
      ...workout,
      items: workout.items.filter((item) => item.id !== candidate.id),
    };
    adjustments.push({
      source: "duration_fit",
      type: "exercise_removed",
      exerciseId: candidate.exerciseId,
      reason: "target_duration",
    });
  }
  return workout;
}

export function buildDefaultWorkoutItem(
  workout: Workout,
  exercise: Exercise,
): WorkoutItem | null {
  const defaults = exercise.defaultPrescription;
  let sets: number;
  let workSeconds: number;
  let restSeconds: number;
  let perSide = exercise.laterality === "unilateral";
  if ("workDurationSeconds" in defaults) {
    sets = Math.min(2, defaults.rounds);
    workSeconds = defaults.workDurationSeconds;
    restSeconds = defaults.restDurationSeconds;
    perSide = defaults.sideMode === "separate";
  } else if (defaults.durationSeconds) {
    sets = Math.min(2, defaults.sets.min);
    workSeconds = defaults.durationSeconds.min;
    restSeconds = defaults.restSeconds.min;
  } else {
    return null;
  }
  return {
    id: `${workout.id}-generated-${exercise.id}`,
    exerciseId: exercise.id,
    sets,
    prescription: {
      type: "timed",
      durationSeconds: workSeconds,
      ...(perSide ? { perSide: true } : {}),
    },
    restAfterSetSeconds: restSeconds,
    restAfterExerciseSeconds: Math.min(
      exercise.planning.safeRestSeconds.max,
      Math.max(exercise.planning.safeRestSeconds.min, 15),
    ),
    role: "optional",
    priority: 10,
    minSets: 1,
    maxSets: Math.min(3, sets + 1),
    minWorkSeconds: exercise.planning.safeWorkSeconds.min,
    maxWorkSeconds: exercise.planning.safeWorkSeconds.max,
  };
}

function addExerciseTowardTarget(
  source: Workout,
  targetSeconds: number,
  candidates: readonly Exercise[],
  adjustments: DurationAdjustment[],
) {
  if (source.items.length >= 6) return source;
  const usedIds = new Set(source.items.map((item) => item.exerciseId));
  const candidateById = new Map(
    candidates.map((exercise) => [exercise.id, exercise]),
  );
  const bodyAreaCounts = new Map<string, number>();
  for (const item of source.items) {
    candidateById
      .get(item.exerciseId)
      ?.bodyAreas.forEach((area) =>
        bodyAreaCounts.set(area, (bodyAreaCounts.get(area) ?? 0) + 1),
      );
  }
  const difficultyOrder = {
    beginner: 0,
    intermediate: 1,
    advanced: 2,
  } as const;
  const options = candidates
    .filter(
      (exercise) =>
        !usedIds.has(exercise.id) &&
        difficultyOrder[exercise.difficulty] <=
          difficultyOrder[source.difficulty],
    )
    .map((exercise) => ({
      exercise,
      item: buildDefaultWorkoutItem(source, exercise),
      focusMatches: exercise.qualities.filter((quality) =>
        source.focus.includes(quality),
      ).length,
      repeatedBodyAreas: exercise.bodyAreas.reduce(
        (total, area) => total + (bodyAreaCounts.get(area) ?? 0),
        0,
      ),
    }))
    .filter(
      (option): option is typeof option & { item: WorkoutItem } =>
        option.item !== null,
    )
    .sort(
      (left, right) =>
        right.focusMatches - left.focusMatches ||
        left.repeatedBodyAreas - right.repeatedBodyAreas ||
        left.exercise.id.localeCompare(right.exercise.id),
    );
  const before = calculateSessionDuration(source);
  for (const option of options) {
    const next = { ...source, items: [...source.items, option.item] };
    if (improvesTarget(before, calculateSessionDuration(next), targetSeconds)) {
      adjustments.push({
        source: "duration_fit",
        type: "exercise_added",
        exerciseId: option.exercise.id,
        reason: "target_duration",
      });
      return next;
    }
  }
  return source;
}

export function generateSessionPrescription(
  sourceWorkout: Workout,
  targetDurationMinutes: number,
  eligibleExercises: readonly Exercise[] = exercises,
  protectedExerciseIds: ReadonlySet<string> = new Set(),
): GeneratedTrainingSession {
  const targetDurationSeconds = targetDurationMinutes * 60;
  const adjustments: DurationAdjustment[] = [];
  const mainEligibleExercises = eligibleExercises.filter((exercise) =>
    exercise.sessionRoles.includes("main"),
  );
  let workout: Workout = {
    ...sourceWorkout,
    items: sourceWorkout.items.map((item) => ({
      ...item,
      prescription: { ...item.prescription },
      ...(item.notes ? { notes: [...item.notes] } : {}),
    })),
  };

  if (calculateSessionDuration(workout) < targetDurationSeconds) {
    while (
      calculateSessionDuration(workout) <
      targetDurationSeconds - ON_TARGET_SECONDS
    ) {
      const next = addExerciseTowardTarget(
        workout,
        targetDurationSeconds,
        mainEligibleExercises,
        adjustments,
      );
      if (next === workout) break;
      workout = next;
    }
    workout = addRoundsTowardTarget(
      workout,
      targetDurationSeconds,
      adjustments,
      protectedExerciseIds,
    );
    workout = adjustWorkTowardTarget(
      workout,
      targetDurationSeconds,
      "increase",
      adjustments,
      protectedExerciseIds,
    );
    workout = increaseRecoveryTowardTarget(
      workout,
      targetDurationSeconds,
      mainEligibleExercises,
      adjustments,
      protectedExerciseIds,
    );
    if (
      calculateSessionDuration(workout) >
      targetDurationSeconds + ON_TARGET_SECONDS
    ) {
      workout = removeRoundsTowardTarget(
        workout,
        targetDurationSeconds,
        adjustments,
        protectedExerciseIds,
      );
      workout = removeOptionalExerciseTowardTarget(
        workout,
        targetDurationSeconds,
        adjustments,
        protectedExerciseIds,
      );
      workout = adjustWorkTowardTarget(
        workout,
        targetDurationSeconds,
        "reduce",
        adjustments,
        protectedExerciseIds,
      );
    }
  } else if (calculateSessionDuration(workout) > targetDurationSeconds) {
    workout = removeRoundsTowardTarget(
      workout,
      targetDurationSeconds,
      adjustments,
      protectedExerciseIds,
    );
    workout = removeOptionalExerciseTowardTarget(
      workout,
      targetDurationSeconds,
      adjustments,
      protectedExerciseIds,
    );
    workout = adjustWorkTowardTarget(
      workout,
      targetDurationSeconds,
      "reduce",
      adjustments,
      protectedExerciseIds,
    );
  }

  const estimatedDurationSeconds = calculateSessionDuration(workout);
  workout = {
    ...workout,
    estimatedMinutes: Math.max(1, Math.round(estimatedDurationSeconds / 60)),
  };
  return {
    workout,
    sections: [{ type: "main", items: workout.items }],
    targetDurationSeconds,
    estimatedDurationSeconds,
    durationDeltaSeconds: estimatedDurationSeconds - targetDurationSeconds,
    durationStatus: classifySessionDuration(
      estimatedDurationSeconds,
      targetDurationSeconds,
    ),
    adjustments,
  };
}

const goalFocus: Record<AthleteProfile["goals"][number], string[]> = {
  "movement-speed": ["mobility", "stability", "warm-up", "speed"],
  "court-endurance": ["endurance", "strength"],
  power: ["power", "explosiveness", "rotation"],
  strength: ["strength"],
  "injury-resilience": ["stability", "mobility", "strength"],
};

function exercisePlanningScore(
  exercise: Exercise,
  profile: AthleteProfile,
  sportProfile: SportExerciseProfile | undefined,
  assignedDevelopmentAreas: readonly AthleteProfile["developmentAreas"][number][],
  assignedLimitations: readonly AthleteProfile["padelLimitations"][number][],
  preferredExerciseIds: ReadonlySet<string>,
  temporaryLoadAdjustment: AdaptationProfile["temporaryLoadAdjustment"],
) {
  const desiredQualities = new Set(
    profile.goals.flatMap((goal) => goalFocus[goal]),
  );
  const goalMatches = exercise.planning.trainingQualities.filter((quality) =>
    desiredQualities.has(quality),
  ).length;
  const challengeMatches = sportProfile
    ? sportProfile.problemsAddressed.filter((problem) =>
        assignedLimitations.includes(
          problem as AthleteProfile["padelLimitations"][number],
        ),
      ).length
    : 0;
  const developmentMatches = assignedDevelopmentAreas.filter((area) =>
    exerciseMatchesDevelopmentArea(area, exercise, sportProfile),
  ).length;
  const sportBonus = profile.sport === "padel" && sportProfile ? 3 : 0;
  const experiencePenalty =
    profile.experience === "beginner" && exercise.difficulty === "advanced"
      ? 4
      : 0;
  const familiarityBonus = preferredExerciseIds.has(exercise.id) ? 2 : 0;
  const intensityRank = { low: -1, moderate: 0, high: 1 } as const;
  const loadFitBonus =
    temporaryLoadAdjustment * intensityRank[exercise.sessionIntensity] * 2;
  return (
    goalMatches * 5 +
    challengeMatches * 8 +
    developmentMatches * 6 +
    sportBonus +
    familiarityBonus -
    experiencePenalty +
    loadFitBonus
  );
}

export function assembleMainWorkout({
  profile,
  slot,
  exerciseCatalog = exercises,
  profiles = sportExerciseProfiles,
  preferredExerciseIds = [],
  temporaryLoadAdjustment = 0,
}: {
  profile: AthleteProfile;
  slot: number;
  exerciseCatalog?: readonly Exercise[];
  profiles?: readonly SportExerciseProfile[];
  preferredExerciseIds?: readonly string[];
  temporaryLoadAdjustment?: AdaptationProfile["temporaryLoadAdjustment"];
}): Workout | null {
  const preferred = new Set(preferredExerciseIds);
  const profileByExerciseId = new Map(
    profiles
      .filter((candidate) => candidate.sport === profile.sport)
      .map((candidate) => [candidate.exerciseId, candidate]),
  );
  const difficultyOrder = {
    beginner: 0,
    intermediate: 1,
    advanced: 2,
  } as const;
  const maximumDifficulty = profile.experience === "beginner" ? 0 : 1;
  const assignedDevelopmentAreas = profile.developmentAreas.filter(
    (_, index) => index % profile.sessionsPerWeek === slot,
  );
  const assignedLimitations = profile.padelLimitations.filter(
    (_, index) => index % profile.sessionsPerWeek === slot,
  );
  const supportIds = reserveSupportExerciseIds(
    exerciseCatalog.filter(
      (exercise) =>
        isExercisePlanEligible(exercise) &&
        exerciseMatchesEquipment(exercise, profile) &&
        exerciseAvoidsPain(exercise, profile),
    ),
  );
  const ranked = exerciseCatalog
    .filter(
      (exercise) =>
        isExercisePlanEligible(exercise) &&
        !supportIds.has(exercise.id) &&
        exercise.planning.sectionRoles.includes("main") &&
        difficultyOrder[exercise.difficulty] <= maximumDifficulty &&
        exerciseMatchesEquipment(exercise, profile) &&
        exerciseAvoidsPain(exercise, profile),
    )
    .map((exercise) => ({
      exercise,
      score: exercisePlanningScore(
        exercise,
        profile,
        profileByExerciseId.get(exercise.id),
        assignedDevelopmentAreas,
        assignedLimitations,
        preferred,
        temporaryLoadAdjustment,
      ),
    }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.exercise.id.localeCompare(right.exercise.id),
    );
  if (ranked.length === 0) return null;

  const selected: Exercise[] = [];
  const targetExerciseCount = Math.min(
    ranked.length,
    profile.sessionDurationMinutes <= 5
      ? 2
      : profile.sessionDurationMinutes <= 10
        ? 4
        : profile.sessionDurationMinutes <= 20
          ? 5
          : 6,
  );
  const usedPatterns = new Set<string>();
  const rotated = ranked.map(
    (_, index) => ranked[(index + slot) % ranked.length],
  );
  const addCandidate = (
    predicate: (candidate: (typeof ranked)[number]) => boolean,
  ) => {
    const candidate = rotated.find(
      (option) =>
        !selected.some((exercise) => exercise.id === option.exercise.id) &&
        predicate(option),
    );
    if (!candidate) return false;
    selected.push(candidate.exercise);
    candidate.exercise.planning.movementPatterns.forEach((pattern) =>
      usedPatterns.add(pattern),
    );
    return true;
  };

  for (const area of assignedDevelopmentAreas) {
    if (selected.length >= targetExerciseCount) break;
    const matchesArea = (candidate: (typeof ranked)[number]) =>
      exerciseMatchesDevelopmentArea(
        area,
        candidate.exercise,
        profileByExerciseId.get(candidate.exercise.id),
      );
    const addedCapacityMatch = addCandidate(
      (candidate) =>
        matchesArea(candidate) &&
        profileByExerciseId.get(candidate.exercise.id)?.trainingFunction ===
          "capacity",
    );
    if (!addedCapacityMatch) addCandidate(matchesArea);
  }

  for (const limitation of assignedLimitations) {
    if (selected.length >= targetExerciseCount) break;
    addCandidate((candidate) =>
      Boolean(
        profileByExerciseId
          .get(candidate.exercise.id)
          ?.problemsAddressed.includes(limitation),
      ),
    );
  }

  if (
    profile.sport === "padel" &&
    selected.length < targetExerciseCount &&
    !selected.some(
      (exercise) =>
        profileByExerciseId.get(exercise.id)?.trainingFunction === "capacity",
    )
  ) {
    addCandidate(
      (candidate) =>
        profileByExerciseId.get(candidate.exercise.id)?.trainingFunction ===
        "capacity",
    );
  }

  for (const candidate of rotated) {
    if (selected.length >= targetExerciseCount) break;
    if (selected.some((exercise) => exercise.id === candidate.exercise.id)) {
      continue;
    }
    const introducesPattern = candidate.exercise.planning.movementPatterns.some(
      (pattern) => !usedPatterns.has(pattern),
    );
    if (selected.length >= 2 && !introducesPattern) continue;
    selected.push(candidate.exercise);
    candidate.exercise.planning.movementPatterns.forEach((pattern) =>
      usedPatterns.add(pattern),
    );
    if (selected.length === targetExerciseCount) break;
  }
  for (const candidate of rotated) {
    if (selected.length >= Math.min(targetExerciseCount, ranked.length)) break;
    if (!selected.some((exercise) => exercise.id === candidate.exercise.id)) {
      selected.push(candidate.exercise);
    }
  }

  const focus = [
    ...new Set(selected.flatMap((exercise) => exercise.qualities)),
  ];
  const difficulty = selected.some(
    (exercise) => exercise.difficulty === "intermediate",
  )
    ? "intermediate"
    : "beginner";
  const id = `generated-session-${slot + 1}`;
  const workout: Workout = {
    id,
    slug: id,
    name: "Personalized training",
    shortDescription: "A session built around your questionnaire answers.",
    difficulty,
    focus,
    estimatedMinutes: profile.sessionDurationMinutes,
    items: [],
  };
  const assembled = {
    ...workout,
    items: selected.flatMap((exercise, index) => {
      const item = buildDefaultWorkoutItem(workout, exercise);
      return item
        ? [
            {
              ...item,
              role: index < 3 ? ("core" as const) : ("accessory" as const),
              priority: Math.max(60, 100 - index * 10),
              restAfterExerciseSeconds: Math.min(
                exercise.planning.safeRestSeconds.max,
                Math.max(exercise.planning.safeRestSeconds.min, 15),
              ),
            },
          ]
        : [];
    }),
  };
  return {
    ...assembled,
    name: getPersonalizedSessionTitle({
      profile,
      workout: assembled,
      exerciseCatalog: exercises,
      sportProfiles: sportExerciseProfiles,
    }),
    shortDescription: getPersonalizedSessionDescription({
      profile,
      workout: assembled,
      exerciseCatalog: exercises,
      sportProfiles: sportExerciseProfiles,
      preferredPadelPriorities: assignedLimitations,
      preferredDevelopmentAreas: assignedDevelopmentAreas,
    }),
  };
}

function exerciseMatchesEquipment(exercise: Exercise, profile: AthleteProfile) {
  const available = new Set(profile.equipment);
  return exercise.equipment.every((equipment) => {
    if (equipment === "none") return true;
    if (equipment === "two_dumbbells") return available.has("two-dumbbells");
    return available.has("one-dumbbell") || available.has("two-dumbbells");
  });
}

export function profileExerciseEquipment(profile: AthleteProfile): Equipment[] {
  const equipment: Equipment[] = ["none"];
  if (
    profile.equipment.includes("one-dumbbell") ||
    profile.equipment.includes("two-dumbbells")
  ) {
    equipment.push("light_dumbbell", "dumbbell");
  }
  if (profile.equipment.includes("two-dumbbells")) {
    equipment.push("two_dumbbells");
  }
  return equipment;
}

export function getBlockedBodyAreas(profile: AthleteProfile) {
  const areas: Record<AthleteProfile["painAreas"][number], BodyArea[]> = {
    shoulder: ["shoulders", "arms"],
    "elbow-forearm": ["arms", "shoulders"],
    "wrist-hand": ["arms", "shoulders"],
    "neck-upper-back": ["shoulders", "back"],
    "lower-back": ["back", "core"],
    "hip-groin": ["legs", "glutes"],
    knee: ["legs"],
    "calf-achilles": ["legs"],
    "ankle-foot": ["legs"],
  };
  return new Set(profile.painAreas.flatMap((area) => areas[area]));
}

function exerciseAvoidsPain(exercise: Exercise, profile: AthleteProfile) {
  return !exercise.planning.avoidForPainAreas.some((area) =>
    profile.painAreas.includes(area),
  );
}

function progressionReasons(session: PlannedWorkout): SessionAdjustment[] {
  return session.progression.changes.map((change) => {
    if (change.type === "work_duration_increased") {
      return {
        source: "weekly_progression" as const,
        type: "increase_work_duration" as const,
        exerciseId: change.exerciseId,
        phase: session.progressionPhase,
        deltaSeconds: change.seconds,
      };
    }
    if (change.type === "work_duration_reduced") {
      return {
        source: "weekly_progression" as const,
        type: "decrease_work_duration" as const,
        exerciseId: change.exerciseId,
        phase: session.progressionPhase,
        deltaSeconds: change.seconds,
      };
    }
    if (change.type === "round_added" || change.type === "round_removed") {
      return {
        source: "weekly_progression" as const,
        type:
          change.type === "round_added"
            ? ("add_round" as const)
            : ("remove_round" as const),
        exerciseId: change.exerciseId,
        phase: session.progressionPhase,
        deltaRounds: change.rounds,
      };
    }
    if ("recovery" in change) {
      return {
        source: "weekly_progression" as const,
        type:
          change.type === "recovery_reduced"
            ? ("decrease_recovery" as const)
            : ("increase_recovery" as const),
        exerciseId: change.exerciseId,
        phase: session.progressionPhase,
        recovery: change.recovery,
        deltaSeconds: change.seconds,
      };
    }
    throw new Error(`Unsupported progression change: ${change.type}`);
  });
}

function feedbackReasons(session: PlannedWorkout): SessionAdjustment[] {
  return session.feedbackAdaptations.flatMap((adaptation) =>
    adaptation.changes.flatMap((change): SessionAdjustment[] => {
      if (change.type === "block_progression") {
        return adaptation.affectedArea
          ? [
              {
                source: "safety",
                type: "block_progression",
                exerciseId: change.exerciseId,
                feedbackEventId: adaptation.feedbackEventId,
                affectedArea: adaptation.affectedArea,
              },
            ]
          : [];
      }
      return [
        {
          source: "feedback",
          type: change.type,
          exerciseId: change.exerciseId,
          feedbackEventId: adaptation.feedbackEventId,
          rating: adaptation.rating,
          ...("deltaSeconds" in change
            ? { deltaSeconds: change.deltaSeconds }
            : {}),
          ...("deltaRounds" in change
            ? { deltaRounds: change.deltaRounds }
            : {}),
          ...("recovery" in change ? { recovery: change.recovery } : {}),
        },
      ];
    }),
  );
}

export function finalizeGeneratedTrainingPlan(
  plan: TrainingPlan,
  exerciseCatalog: readonly Exercise[] = exercises,
): TrainingPlan {
  const exerciseById = new Map(
    exerciseCatalog.map((exercise) => [exercise.id, exercise]),
  );
  return {
    ...plan,
    sessions: plan.sessions.map((session) => {
      const reasonsFromProgression = progressionReasons(session);
      const reasonsFromFeedback = feedbackReasons(session);
      const blockedBodyAreas = new Set(
        session.feedbackAdaptations.flatMap((adaptation) => {
          if (
            adaptation.rating === "pain-or-discomfort" &&
            adaptation.affectedArea &&
            adaptation.affectedArea !== "other"
          ) {
            return feedbackAffectedBodyAreas[adaptation.affectedArea];
          }
          return adaptation.changes.flatMap((change) =>
            change.type === "block_progression"
              ? (exerciseById.get(change.exerciseId)?.bodyAreas ?? [])
              : [],
          );
        }),
      );
      const compatibleCatalog = exerciseCatalog.filter(
        (exercise) =>
          exerciseMatchesEquipment(exercise, plan.profile) &&
          exerciseAvoidsPain(exercise, plan.profile) &&
          exercise.bodyAreas.every((area) => !blockedBodyAreas.has(area)),
      );
      const fittingCatalog = compatibleCatalog.filter((exercise) =>
        exercise.sessionRoles.includes("main"),
      );
      const supportSections = buildSessionSections({
        mainWorkout: session.workout,
        exerciseCatalog: compatibleCatalog,
        targetDurationSeconds: session.targetDurationSeconds,
        availableEquipment: profileExerciseEquipment(plan.profile),
        excludedBodyAreas: [...blockedBodyAreas],
      });
      const supportDurationSeconds = supportSections
        .filter((section) => section.type !== "main")
        .reduce(
          (total, section) => total + calculateSessionSectionDuration(section),
          0,
        );
      const mainTargetDurationSeconds = Math.max(
        60,
        session.targetDurationSeconds - supportDurationSeconds,
      );
      const mainWorkoutFitTargetSeconds = calculateMainWorkoutFitTarget(
        session.workout,
        mainTargetDurationSeconds,
      );
      const needsMoreDuration =
        calculateSessionDuration(session.workout) < mainWorkoutFitTargetSeconds;
      const opposingTypes = needsMoreDuration
        ? new Set([
            "decrease_work_duration",
            "remove_round",
            "increase_recovery",
          ])
        : new Set(["increase_work_duration", "add_round", "decrease_recovery"]);
      const protectedExerciseIds = new Set(
        [...reasonsFromProgression, ...reasonsFromFeedback].flatMap((reason) =>
          "exerciseId" in reason &&
          (reason.source === "safety" || opposingTypes.has(reason.type))
            ? [reason.exerciseId]
            : [],
        ),
      );
      const fitted = generateSessionPrescription(
        session.workout,
        mainWorkoutFitTargetSeconds / 60,
        fittingCatalog.filter(
          (exercise) =>
            !supportSections.some(
              (section) =>
                section.type !== "main" &&
                section.items.some((item) => item.exerciseId === exercise.id),
            ),
        ),
        protectedExerciseIds,
      );
      const adjustments: SessionAdjustment[] = [
        ...session.adjustments.filter(
          (adjustment) => adjustment.source === "base_prescription",
        ),
        ...reasonsFromProgression,
        ...reasonsFromFeedback,
        ...session.adjustments.filter(
          (adjustment) =>
            adjustment.source === "duration_fit" &&
            !reasonsFromFeedback.some(
              (reason) =>
                reason.source === "safety" &&
                reason.exerciseId === adjustment.exerciseId,
            ),
        ),
        ...fitted.adjustments,
      ];
      const sections = buildSessionSections({
        mainWorkout: fitted.workout,
        exerciseCatalog: compatibleCatalog,
        targetDurationSeconds: session.targetDurationSeconds,
        availableEquipment: profileExerciseEquipment(plan.profile),
        excludedBodyAreas: [...blockedBodyAreas],
      });
      const estimatedDurationSeconds =
        calculateSessionSectionsDuration(sections);
      const finalized = {
        ...session,
        workout: fitted.workout,
        sections,
        estimatedDurationSeconds,
        durationDeltaSeconds:
          estimatedDurationSeconds - session.targetDurationSeconds,
        durationStatus: classifySessionDuration(
          estimatedDurationSeconds,
          session.targetDurationSeconds,
        ),
        adjustments,
      };
      return {
        ...finalized,
        originalSessionSnapshot:
          session.todayAdaptations.length > 0
            ? session.originalSessionSnapshot
            : {
                workout: finalized.workout,
                sections: finalized.sections,
                targetDurationSeconds: finalized.targetDurationSeconds,
                estimatedDurationSeconds: finalized.estimatedDurationSeconds,
                durationDeltaSeconds: finalized.durationDeltaSeconds,
                durationStatus: finalized.durationStatus,
                adjustments: finalized.adjustments,
              },
      };
    }),
  };
}

export function normalizeScheduledExerciseFlow(
  plan: TrainingPlan,
  exerciseCatalog: readonly Exercise[] = exercises,
): TrainingPlan {
  const sessions = plan.sessions.map((session) => {
    if (session.status !== "scheduled") return session;
    const mainIds = new Set(
      session.workout.items.map((item) => item.exerciseId),
    );
    const hasDuplicates = mainIds.size !== session.workout.items.length;
    const overlaps = session.sections.some(
      (section) =>
        section.type !== "main" &&
        section.items.some((item) => mainIds.has(item.exerciseId)),
    );
    if (!overlaps && !hasDuplicates) return session;
    const compatible = exerciseCatalog.filter(
      (exercise) =>
        isExercisePlanEligible(exercise) &&
        exerciseMatchesEquipment(exercise, plan.profile) &&
        exerciseAvoidsPain(exercise, plan.profile),
    );
    const supportIds = reserveSupportExerciseIds(compatible);
    const items: WorkoutItem[] = [];
    for (const item of session.workout.items) {
      if (overlaps && supportIds.has(item.exerciseId)) continue;
      const existing = items.find(
        (candidate) => candidate.exerciseId === item.exerciseId,
      );
      if (existing) {
        existing.sets = Math.min(
          existing.maxSets ?? 20,
          existing.sets + item.sets,
        );
      } else {
        items.push({ ...item });
      }
    }
    const workout = { ...session.workout, items };
    return finalizeGeneratedTrainingPlan(
      {
        ...plan,
        sessions: [{ ...session, workout }],
      },
      exerciseCatalog,
    ).sessions[0];
  });
  return sessions.every((session, index) => session === plan.sessions[index])
    ? plan
    : { ...plan, sessions };
}

export function generateTrainingPlan(
  profile: AthleteProfile,
  today = new Date(),
  recentFeedback: readonly WorkoutFeedbackEvent[] = [],
  options: {
    sourceWorkouts?: readonly Workout[];
    exerciseCatalog?: readonly Exercise[];
    generation?: PlanGenerationMetadata;
    adaptationProfile?: AdaptationProfile;
  } = {},
): TrainingPlan {
  const startDate = toDateKey(today);
  const endDate = addDays(startDate, TRAINING_PLAN_DURATION_DAYS - 1);
  const preferredDays = new Set(preferredDayIndexes(profile));
  const avoidedExerciseIds = new Set(
    options.adaptationProfile?.avoidExercises ?? [],
  );
  const exerciseCatalog = options.exerciseCatalog ?? exercises;
  const eligibleExercises = exerciseCatalog.filter(
    (exercise) =>
      isExercisePlanEligible(exercise) &&
      !avoidedExerciseIds.has(exercise.id) &&
      exerciseMatchesEquipment(exercise, profile) &&
      exerciseAvoidsPain(exercise, profile),
  );
  const eligibleMainExercises = eligibleExercises.filter((exercise) =>
    exercise.sessionRoles.includes("main"),
  );
  const assembledWorkouts =
    options.sourceWorkouts ??
    Array.from({ length: profile.sessionsPerWeek }, (_, slot) =>
      assembleMainWorkout({
        profile,
        slot,
        exerciseCatalog: eligibleExercises,
        preferredExerciseIds:
          options.adaptationProfile?.preferredExercises ?? [],
        temporaryLoadAdjustment:
          options.adaptationProfile?.temporaryLoadAdjustment ?? 0,
      }),
    ).filter((workout): workout is Workout => workout !== null);
  const scheduledDates: Array<{
    date: string;
    weekNumber: number;
    sessionIndex: number;
  }> = [];
  const sessionsPerWeek = Array.from(
    { length: Math.ceil(TRAINING_PLAN_DURATION_DAYS / 7) },
    () => 0,
  );
  for (let offset = 0; offset < TRAINING_PLAN_DURATION_DAYS; offset += 1) {
    const key = addDays(startDate, offset);
    if (preferredDays.has(fromDateKey(key).getDay())) {
      const weekIndex = Math.floor(offset / 7);
      scheduledDates.push({
        date: key,
        weekNumber: weekIndex + 1,
        sessionIndex: sessionsPerWeek[weekIndex],
      });
      sessionsPerWeek[weekIndex] += 1;
    }
  }
  const sessions =
    assembledWorkouts.length === 0
      ? []
      : scheduledDates.map((scheduled, index) => {
          const sourceWorkout =
            assembledWorkouts[
              scheduled.sessionIndex % assembledWorkouts.length
            ];
          const initialSections = buildSessionSections({
            mainWorkout: sourceWorkout,
            exerciseCatalog: eligibleExercises,
            targetDurationSeconds: profile.sessionDurationMinutes * 60,
            availableEquipment: profileExerciseEquipment(profile),
          });
          const supportDurationSeconds = initialSections
            .filter((section) => section.type !== "main")
            .reduce(
              (total, section) =>
                total + calculateSessionSectionDuration(section),
              0,
            );
          const mainTargetDurationSeconds = Math.max(
            60,
            profile.sessionDurationMinutes * 60 - supportDurationSeconds,
          );
          const mainWorkoutFitTargetSeconds = calculateMainWorkoutFitTarget(
            sourceWorkout,
            mainTargetDurationSeconds,
          );
          const baseline = generateSessionPrescription(
            sourceWorkout,
            mainWorkoutFitTargetSeconds / 60,
            eligibleMainExercises.filter(
              (exercise) =>
                !initialSections.some(
                  (section) =>
                    section.type !== "main" &&
                    section.items.some(
                      (item) => item.exerciseId === exercise.id,
                    ),
                ),
            ),
          );
          const targetDurationSeconds = profile.sessionDurationMinutes * 60;
          const progressed = getProgressionPrescription({
            week: scheduled.weekNumber,
            baseline: baseline.workout,
            exerciseCatalog: eligibleExercises,
            targetDurationSeconds: mainWorkoutFitTargetSeconds,
          });
          const sections = buildSessionSections({
            mainWorkout: progressed.workout,
            exerciseCatalog: eligibleExercises,
            targetDurationSeconds,
            availableEquipment: profileExerciseEquipment(profile),
          });
          const estimatedDurationSeconds =
            calculateSessionSectionsDuration(sections);
          const workout = {
            ...progressed.workout,
            shortDescription: getPersonalizedSessionDescription({
              profile,
              workout: progressed.workout,
              exerciseCatalog: eligibleExercises,
              sportProfiles: sportExerciseProfiles,
              preferredPadelPriorities: questionnaireFocusForSlot(
                profile,
                scheduled.sessionIndex,
              ).padelPriorities,
              preferredDevelopmentAreas: questionnaireFocusForSlot(
                profile,
                scheduled.sessionIndex,
              ).developmentAreas,
              outcomeIndex: scheduled.weekNumber - 1,
            }),
            estimatedMinutes: Math.max(
              1,
              Math.round(estimatedDurationSeconds / 60),
            ),
          };
          const progressionPhase = getProgressionPhase(scheduled.weekNumber);
          const validationErrors = validateGeneratedSessionSections({
            sections,
            targetDurationSeconds,
            exerciseCatalog: eligibleExercises,
            availableEquipment: profileExerciseEquipment(profile),
            excludedBodyAreas: [...getBlockedBodyAreas(profile)],
          });
          if (validationErrors.length > 0) {
            throw new Error(
              `Invalid generated session ${scheduled.date}: ${validationErrors.join(" ")}`,
            );
          }
          return {
            id: `session-${scheduled.date}-${index + 1}`,
            scheduledDate: scheduled.date,
            sourceWorkoutId: sourceWorkout.id,
            workout,
            targetDurationSeconds,
            estimatedDurationSeconds,
            durationDeltaSeconds:
              estimatedDurationSeconds - targetDurationSeconds,
            durationStatus: classifySessionDuration(
              estimatedDurationSeconds,
              targetDurationSeconds,
            ),
            adjustments: baseline.adjustments.map((adjustment) => ({
              ...adjustment,
              source: "base_prescription" as const,
            })),
            weekNumber: scheduled.weekNumber,
            progressionPhase,
            progression: progressed.progression,
            feedbackAdaptations: [],
            sections,
            originalSessionSnapshot: {
              workout,
              sections,
              targetDurationSeconds,
              estimatedDurationSeconds,
              durationDeltaSeconds:
                estimatedDurationSeconds - targetDurationSeconds,
              durationStatus: classifySessionDuration(
                estimatedDurationSeconds,
                targetDurationSeconds,
              ),
              adjustments: [],
            },
            todayAdaptations: [],
            isEdited: false,
            status: "scheduled" as const,
          };
        });
  const plan: TrainingPlan = {
    version: 1,
    profile,
    startDate,
    endDate,
    sessions,
    games: profile.matches.map((match) => ({
      id: `game-${match.date}`,
      date: match.date,
      label: profile.sport === "padel" ? "Padel match" : "Match",
      importance: match.importance,
    })),
    generation: options.generation ?? {
      source: "deterministic",
      profileVersion: ATHLETE_PROFILE_VERSION,
      exerciseCatalogVersion: EXERCISE_CATALOG_VERSION,
      plannerVersion: PLANNER_VERSION,
      explanation:
        profile.sport === "padel"
          ? `Built around your goals, ${profile.developmentAreas.length || "balanced"} physical ${profile.developmentAreas.length === 1 ? "focus" : "focus areas"}, and ${profile.padelLimitations.length || "balanced"} padel ${profile.padelLimitations.length === 1 ? "priority" : "priorities"}, with current discomfort treated only as a safety constraint.`
          : `Built around your goals, ${profile.developmentAreas.length || "balanced"} physical ${profile.developmentAreas.length === 1 ? "focus" : "focus areas"}, schedule, equipment, and safety constraints.`,
      model: null,
    },
    generatedAt: new Date().toISOString(),
  };
  const feedbackProposal = deriveAdaptation({
    recentFeedback,
    upcomingSessions: plan.sessions,
    exerciseCatalog: eligibleExercises,
  });
  const adaptedPlan = feedbackProposal
    ? applyFeedbackAdaptation(plan, feedbackProposal)
    : plan;
  const finalizedPlan = finalizeGeneratedTrainingPlan(
    adaptedPlan,
    eligibleExercises,
  );
  return assertPlanDurationFidelity(
    profile.matches.length > 0
      ? rebalancePlanAroundGames(finalizedPlan)
      : finalizedPlan,
  );
}

function gameRecoveryDays(plan: TrainingPlan) {
  return new Set(
    plan.games.flatMap((game) => [
      game.date,
      addDays(game.date, -1),
      ...(game.importance === "important" ? [addDays(game.date, -2)] : []),
    ]),
  );
}

export function describePlanRebalance(
  before: TrainingPlan,
  after: TrainingPlan,
): string {
  const moved = after.sessions.filter((session) =>
    before.sessions.some(
      (previous) =>
        previous.id === session.id &&
        previous.scheduledDate !== session.scheduledDate,
    ),
  );
  const protectedDays = gameRecoveryDays(after);
  const remaining = after.sessions.filter((session) =>
    protectedDays.has(session.scheduledDate),
  );
  const messages = [
    moved.length
      ? `Moved ${moved.length} ${moved.length === 1 ? "workout" : "workouts"} around your matches.`
      : "No workouts moved.",
  ];
  if (remaining.some((session) => session.status === "in-progress")) {
    messages.push(
      "A workout is already in progress on a match or recovery day. Rebalancing only moves workouts that have not started.",
    );
  }
  if (remaining.some((session) => session.status === "scheduled")) {
    messages.push(
      "Some workouts have no free date within four days. Use Move training to choose another date.",
    );
  }
  if (
    remaining.some(
      (session) =>
        session.status !== "scheduled" && session.status !== "in-progress",
    )
  ) {
    messages.push("Recorded workouts stay on their original dates.");
  }
  if (!remaining.length && !moved.length)
    messages.push("Your training is already clear of match and recovery days.");
  return messages.join(" ");
}

export function rebalancePlanAroundGames(plan: TrainingPlan): TrainingPlan {
  const gameDays = gameRecoveryDays(plan);
  const occupied = new Set(
    plan.sessions.map((session) => session.scheduledDate),
  );
  const sessions = plan.sessions.map((session) => {
    if (
      session.status !== "scheduled" ||
      !gameDays.has(session.scheduledDate)
    ) {
      return session;
    }
    for (let distance = 1; distance <= 4; distance += 1) {
      for (const direction of [1, -1]) {
        const candidate = addDays(session.scheduledDate, distance * direction);
        if (
          candidate >= plan.startDate &&
          candidate <= plan.endDate &&
          !gameDays.has(candidate) &&
          !occupied.has(candidate)
        ) {
          occupied.delete(session.scheduledDate);
          occupied.add(candidate);
          return { ...session, scheduledDate: candidate };
        }
      }
    }
    return session;
  });
  return { ...plan, sessions, lastRebalancedAt: new Date().toISOString() };
}
