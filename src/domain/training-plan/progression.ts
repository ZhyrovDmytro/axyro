import type { Exercise } from "@/domain/exercise/exercise.types";
import {
  calculateSessionDuration,
  getSessionDurationToleranceSeconds,
  SESSION_DURATION_TOLERANCE,
} from "@/domain/workout/session-duration";
import type { Workout, WorkoutItem } from "@/domain/workout/workout.types";

export const progressionPhases = [
  "foundation",
  "build",
  "peak",
  "consolidate",
] as const;

export type ProgressionPhase = (typeof progressionPhases)[number];

export type ProgressionChange =
  | {
      type: "work_duration_increased" | "work_duration_reduced";
      exerciseId: string;
      seconds: number;
    }
  | {
      type: "round_added" | "round_removed";
      exerciseId: string;
      rounds: number;
    }
  | {
      type: "recovery_reduced" | "recovery_increased";
      exerciseId: string;
      recovery: "between_sets" | "between_exercises";
      seconds: number;
    };

export type ProgressionReason = {
  reason: "weekly_progression";
  phase: ProgressionPhase;
  changes: ProgressionChange[];
};

export type ProgressionPrescription = {
  workout: Workout;
  progression: ProgressionReason;
};

export const TRAINING_PLAN_DURATION_DAYS = 60;
export const TRAINING_PLAN_WEEK_COUNT = Math.ceil(
  TRAINING_PLAN_DURATION_DAYS / 7,
);

const WORK_STEP_SECONDS = 5;
const RECOVERY_STEP_SECONDS = 5;
const MIN_RECOVERY_SECONDS = 10;
const MAX_CONSOLIDATE_RECOVERY_INCREASE_SECONDS = 10;

const phaseWorkMultiplier: Record<ProgressionPhase, number> = {
  foundation: 1,
  build: 1.075,
  peak: 1.15,
  consolidate: 0.9,
};

export function getProgressionPhase(week: number): ProgressionPhase {
  if (week >= 1 && week <= 2) return "foundation";
  if (week >= 3 && week <= 5) return "build";
  if (week >= 6 && week <= 7) return "peak";
  if (week >= 8 && week <= TRAINING_PLAN_WEEK_COUNT) return "consolidate";
  throw new Error(
    `Progression week must be between 1 and ${TRAINING_PLAN_WEEK_COUNT}. Received ${week}.`,
  );
}

function dateKeyToUtcMilliseconds(dateKey: string) {
  return Date.parse(`${dateKey}T12:00:00Z`);
}

export function getPlanWeekNumber(
  planStartDate: string,
  dateKey: string,
): number | null {
  const dayOffset = Math.floor(
    (dateKeyToUtcMilliseconds(dateKey) -
      dateKeyToUtcMilliseconds(planStartDate)) /
      86_400_000,
  );
  if (dayOffset < 0 || dayOffset >= TRAINING_PLAN_DURATION_DAYS) return null;
  return Math.floor(dayOffset / 7) + 1;
}

export function calculateEffectiveWorkSeconds(workout: Pick<Workout, "items">) {
  return workout.items.reduce(
    (total, item) =>
      total +
      item.prescription.durationSeconds *
        item.sets *
        (item.prescription.perSide ? 2 : 1),
    0,
  );
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

function cloneWorkout(workout: Workout): Workout {
  return {
    ...workout,
    items: workout.items.map((item) => ({
      ...item,
      prescription: { ...item.prescription },
      ...(item.notes ? { notes: [...item.notes] } : {}),
    })),
  };
}

function updateItem(
  workout: Workout,
  itemId: string,
  update: (item: WorkoutItem) => WorkoutItem,
) {
  return {
    ...workout,
    items: workout.items.map((item) =>
      item.id === itemId ? update(item) : item,
    ),
  };
}

function recordChange(changes: ProgressionChange[], change: ProgressionChange) {
  const existing = changes.find(
    (candidate) =>
      candidate.type === change.type &&
      candidate.exerciseId === change.exerciseId &&
      ("recovery" in candidate
        ? "recovery" in change && candidate.recovery === change.recovery
        : !("recovery" in change)),
  );
  if (!existing) {
    changes.push(change);
    return;
  }
  if ("seconds" in existing && "seconds" in change) {
    existing.seconds += change.seconds;
  } else if ("rounds" in existing && "rounds" in change) {
    existing.rounds += change.rounds;
  }
}

function progressionEligibleExercise(exercise: Exercise | undefined) {
  if (!exercise) return false;
  const techniqueFirst = exercise.roles.some((role) =>
    ["mobility", "activation"].includes(role),
  );
  const explosive = exercise.qualities.some((quality) =>
    ["power", "explosiveness"].includes(quality),
  );
  return (
    !techniqueFirst &&
    !explosive &&
    exercise.roles.some((role) => ["strength", "stability"].includes(role))
  );
}

function increaseWork(
  source: Workout,
  desiredWorkSeconds: number,
  maximumDurationSeconds: number,
  exerciseById: ReadonlyMap<string, Exercise>,
  changes: ProgressionChange[],
) {
  let workout = source;
  const increases = new Map<string, number>();
  while (calculateEffectiveWorkSeconds(workout) < desiredWorkSeconds) {
    const beforeWork = calculateEffectiveWorkSeconds(workout);
    const candidates = workout.items
      .filter(
        (item) =>
          progressionEligibleExercise(exerciseById.get(item.exerciseId)) &&
          item.prescription.durationSeconds < itemBounds(item).maxWorkSeconds,
      )
      .sort(
        (left, right) =>
          (increases.get(left.id) ?? 0) - (increases.get(right.id) ?? 0) ||
          itemBounds(right).priority - itemBounds(left).priority ||
          left.id.localeCompare(right.id),
      );
    const candidate = candidates.find((item) => {
      const seconds = Math.min(
        WORK_STEP_SECONDS,
        itemBounds(item).maxWorkSeconds - item.prescription.durationSeconds,
      );
      const next = updateItem(workout, item.id, (current) => ({
        ...current,
        prescription: {
          ...current.prescription,
          durationSeconds: current.prescription.durationSeconds + seconds,
        },
      }));
      return (
        Math.abs(desiredWorkSeconds - calculateEffectiveWorkSeconds(next)) <
          Math.abs(desiredWorkSeconds - beforeWork) &&
        calculateSessionDuration(next) <= maximumDurationSeconds
      );
    });
    if (!candidate) break;
    const seconds = Math.min(
      WORK_STEP_SECONDS,
      itemBounds(candidate).maxWorkSeconds -
        candidate.prescription.durationSeconds,
    );
    workout = updateItem(workout, candidate.id, (item) => ({
      ...item,
      prescription: {
        ...item.prescription,
        durationSeconds: item.prescription.durationSeconds + seconds,
      },
    }));
    increases.set(candidate.id, (increases.get(candidate.id) ?? 0) + seconds);
    recordChange(changes, {
      type: "work_duration_increased",
      exerciseId: candidate.exerciseId,
      seconds,
    });
  }
  return workout;
}

function addOneRound(
  source: Workout,
  desiredWorkSeconds: number,
  maximumDurationSeconds: number,
  exerciseById: ReadonlyMap<string, Exercise>,
  changes: ProgressionChange[],
) {
  const beforeWork = calculateEffectiveWorkSeconds(source);
  const candidates = source.items
    .filter(
      (item) =>
        progressionEligibleExercise(exerciseById.get(item.exerciseId)) &&
        item.sets < itemBounds(item).maxSets,
    )
    .sort(
      (left, right) =>
        itemBounds(right).priority - itemBounds(left).priority ||
        left.id.localeCompare(right.id),
    );
  const candidate = candidates.find((item) => {
    const next = updateItem(source, item.id, (current) => ({
      ...current,
      sets: current.sets + 1,
    }));
    return (
      Math.abs(desiredWorkSeconds - calculateEffectiveWorkSeconds(next)) <
        Math.abs(desiredWorkSeconds - beforeWork) &&
      calculateSessionDuration(next) <= maximumDurationSeconds
    );
  });
  if (!candidate) return source;
  recordChange(changes, {
    type: "round_added",
    exerciseId: candidate.exerciseId,
    rounds: 1,
  });
  return updateItem(source, candidate.id, (item) => ({
    ...item,
    sets: item.sets + 1,
  }));
}

function reduceRecoveryToTarget(
  source: Workout,
  targetDurationSeconds: number,
  exerciseById: ReadonlyMap<string, Exercise>,
  changes: ProgressionChange[],
) {
  let workout = source;
  while (
    calculateSessionDuration(workout) >
    targetDurationSeconds + SESSION_DURATION_TOLERANCE.onTargetSeconds
  ) {
    const candidates = workout.items
      .filter((item) =>
        progressionEligibleExercise(exerciseById.get(item.exerciseId)),
      )
      .sort(
        (left, right) =>
          itemBounds(right).priority - itemBounds(left).priority ||
          left.id.localeCompare(right.id),
      );
    let selected:
      | {
          item: WorkoutItem;
          recovery: "between_sets" | "between_exercises";
          minimumSeconds: number;
        }
      | undefined;
    for (const item of candidates) {
      const minimumSeconds = Math.max(
        MIN_RECOVERY_SECONDS,
        exerciseById.get(item.exerciseId)?.planning.safeRestSeconds.min ?? 0,
      );
      if ((item.restAfterSetSeconds ?? 0) > minimumSeconds) {
        selected = { item, recovery: "between_sets", minimumSeconds };
        break;
      }
      if ((item.restAfterExerciseSeconds ?? 0) > minimumSeconds) {
        selected = { item, recovery: "between_exercises", minimumSeconds };
        break;
      }
    }
    if (!selected) break;
    const field =
      selected.recovery === "between_sets"
        ? "restAfterSetSeconds"
        : "restAfterExerciseSeconds";
    const currentSeconds = selected.item[field] ?? 0;
    const seconds = Math.min(
      RECOVERY_STEP_SECONDS,
      currentSeconds - selected.minimumSeconds,
    );
    workout = updateItem(workout, selected.item.id, (item) => ({
      ...item,
      [field]: currentSeconds - seconds,
    }));
    recordChange(changes, {
      type: "recovery_reduced",
      exerciseId: selected.item.exerciseId,
      recovery: selected.recovery,
      seconds,
    });
  }
  return workout;
}

function reduceRounds(
  source: Workout,
  desiredWorkSeconds: number,
  minimumDurationSeconds: number,
  changes: ProgressionChange[],
) {
  let workout = source;
  while (calculateEffectiveWorkSeconds(workout) > desiredWorkSeconds) {
    const beforeWork = calculateEffectiveWorkSeconds(workout);
    const candidates = workout.items
      .filter((item) => item.sets > itemBounds(item).minSets)
      .sort((left, right) => {
        const roleOrder = { optional: 0, accessory: 1, core: 2 } as const;
        return (
          roleOrder[itemBounds(left).role] -
            roleOrder[itemBounds(right).role] ||
          itemBounds(left).priority - itemBounds(right).priority ||
          left.id.localeCompare(right.id)
        );
      });
    const candidate = candidates.find((item) => {
      const next = updateItem(workout, item.id, (current) => ({
        ...current,
        sets: current.sets - 1,
      }));
      return (
        Math.abs(desiredWorkSeconds - calculateEffectiveWorkSeconds(next)) <
          Math.abs(desiredWorkSeconds - beforeWork) &&
        calculateSessionDuration(next) >= minimumDurationSeconds
      );
    });
    if (!candidate) break;
    workout = updateItem(workout, candidate.id, (item) => ({
      ...item,
      sets: item.sets - 1,
    }));
    recordChange(changes, {
      type: "round_removed",
      exerciseId: candidate.exerciseId,
      rounds: 1,
    });
  }
  return workout;
}

function reduceWork(
  source: Workout,
  desiredWorkSeconds: number,
  minimumDurationSeconds: number,
  exerciseById: ReadonlyMap<string, Exercise>,
  changes: ProgressionChange[],
) {
  let workout = source;
  while (calculateEffectiveWorkSeconds(workout) > desiredWorkSeconds) {
    const beforeWork = calculateEffectiveWorkSeconds(workout);
    const candidates = workout.items
      .filter(
        (item) =>
          progressionEligibleExercise(exerciseById.get(item.exerciseId)) &&
          item.prescription.durationSeconds > itemBounds(item).minWorkSeconds,
      )
      .sort(
        (left, right) =>
          itemBounds(left).priority - itemBounds(right).priority ||
          left.id.localeCompare(right.id),
      );
    const candidate = candidates.find((item) => {
      const seconds = Math.min(
        WORK_STEP_SECONDS,
        item.prescription.durationSeconds - itemBounds(item).minWorkSeconds,
      );
      const next = updateItem(workout, item.id, (current) => ({
        ...current,
        prescription: {
          ...current.prescription,
          durationSeconds: current.prescription.durationSeconds - seconds,
        },
      }));
      return (
        Math.abs(desiredWorkSeconds - calculateEffectiveWorkSeconds(next)) <
          Math.abs(desiredWorkSeconds - beforeWork) &&
        calculateSessionDuration(next) >= minimumDurationSeconds
      );
    });
    if (!candidate) break;
    const seconds = Math.min(
      WORK_STEP_SECONDS,
      candidate.prescription.durationSeconds -
        itemBounds(candidate).minWorkSeconds,
    );
    workout = updateItem(workout, candidate.id, (item) => ({
      ...item,
      prescription: {
        ...item.prescription,
        durationSeconds: item.prescription.durationSeconds - seconds,
      },
    }));
    recordChange(changes, {
      type: "work_duration_reduced",
      exerciseId: candidate.exerciseId,
      seconds,
    });
  }
  return workout;
}

function increaseRecoveryTowardTarget(
  source: Workout,
  targetDurationSeconds: number,
  baseline: Workout,
  exerciseById: ReadonlyMap<string, Exercise>,
  changes: ProgressionChange[],
) {
  let workout = source;
  const baselineById = new Map(baseline.items.map((item) => [item.id, item]));
  while (
    calculateSessionDuration(workout) <
    targetDurationSeconds - SESSION_DURATION_TOLERANCE.onTargetSeconds
  ) {
    let selected:
      | {
          item: WorkoutItem;
          recovery: "between_sets" | "between_exercises";
          currentSeconds: number;
        }
      | undefined;
    for (const item of workout.items) {
      const baselineItem = baselineById.get(item.id);
      if (!baselineItem) continue;
      const maximumSeconds =
        exerciseById.get(item.exerciseId)?.planning.safeRestSeconds.max ??
        Number.POSITIVE_INFINITY;
      const setRest = item.restAfterSetSeconds ?? 0;
      const baselineSetRest = baselineItem.restAfterSetSeconds ?? 0;
      if (
        setRest > 0 &&
        setRest + RECOVERY_STEP_SECONDS <= maximumSeconds &&
        setRest < baselineSetRest + MAX_CONSOLIDATE_RECOVERY_INCREASE_SECONDS
      ) {
        selected = {
          item,
          recovery: "between_sets",
          currentSeconds: setRest,
        };
        break;
      }
      const exerciseRest = item.restAfterExerciseSeconds ?? 0;
      const baselineExerciseRest = baselineItem.restAfterExerciseSeconds ?? 0;
      if (
        exerciseRest > 0 &&
        exerciseRest + RECOVERY_STEP_SECONDS <= maximumSeconds &&
        exerciseRest <
          baselineExerciseRest + MAX_CONSOLIDATE_RECOVERY_INCREASE_SECONDS
      ) {
        selected = {
          item,
          recovery: "between_exercises",
          currentSeconds: exerciseRest,
        };
        break;
      }
    }
    if (!selected) break;
    const field =
      selected.recovery === "between_sets"
        ? "restAfterSetSeconds"
        : "restAfterExerciseSeconds";
    const next = updateItem(workout, selected.item.id, (item) => ({
      ...item,
      [field]: selected.currentSeconds + RECOVERY_STEP_SECONDS,
    }));
    if (calculateSessionDuration(next) > targetDurationSeconds + 30) break;
    workout = next;
    recordChange(changes, {
      type: "recovery_increased",
      exerciseId: selected.item.exerciseId,
      recovery: selected.recovery,
      seconds: RECOVERY_STEP_SECONDS,
    });
  }
  return workout;
}

export function getProgressionPrescription({
  week,
  baseline,
  exerciseCatalog,
  targetDurationSeconds,
}: {
  week: number;
  baseline: Workout;
  exerciseCatalog: readonly Exercise[];
  targetDurationSeconds: number;
}): ProgressionPrescription {
  const phase = getProgressionPhase(week);
  const changes: ProgressionChange[] = [];
  const exerciseById = new Map(
    exerciseCatalog.map((exercise) => [exercise.id, exercise]),
  );
  const baselineWorkSeconds = calculateEffectiveWorkSeconds(baseline);
  const desiredWorkSeconds = Math.round(
    baselineWorkSeconds * phaseWorkMultiplier[phase],
  );
  const toleranceSeconds = getSessionDurationToleranceSeconds(
    targetDurationSeconds,
  );
  const minimumDurationSeconds = targetDurationSeconds - toleranceSeconds;
  const maximumDurationSeconds = targetDurationSeconds + toleranceSeconds;
  let workout = cloneWorkout(baseline);

  if (phase === "build" || phase === "peak") {
    workout = increaseWork(
      workout,
      desiredWorkSeconds,
      maximumDurationSeconds,
      exerciseById,
      changes,
    );
    if (
      phase === "peak" &&
      calculateEffectiveWorkSeconds(workout) < desiredWorkSeconds
    ) {
      workout = addOneRound(
        workout,
        desiredWorkSeconds,
        maximumDurationSeconds,
        exerciseById,
        changes,
      );
    }
    if (phase === "peak") {
      workout = reduceRecoveryToTarget(
        workout,
        targetDurationSeconds,
        exerciseById,
        changes,
      );
    }
  }

  if (phase === "consolidate") {
    workout = reduceRounds(
      workout,
      desiredWorkSeconds,
      minimumDurationSeconds,
      changes,
    );
    workout = reduceWork(
      workout,
      desiredWorkSeconds,
      minimumDurationSeconds,
      exerciseById,
      changes,
    );
    workout = increaseRecoveryTowardTarget(
      workout,
      targetDurationSeconds,
      baseline,
      exerciseById,
      changes,
    );
  }

  return {
    workout,
    progression: { reason: "weekly_progression", phase, changes },
  };
}
