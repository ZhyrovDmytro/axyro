import type { Exercise } from "../exercise/exercise.types";
import type { IntensityLevel } from "./intensity";
import { calculateSessionDuration } from "./session-duration";
import type { Workout } from "./workout.types";

export const dailyDurations = [5, 10, 20] as const;
export type DailyDuration = (typeof dailyDurations)[number];
export const defaultDailyDuration: DailyDuration = 10;

export function parseDailyDuration(value: unknown): DailyDuration {
  const minutes = Number(value);
  return minutes === 5 || minutes === 20 ? minutes : defaultDailyDuration;
}

/** One minute per movement, including count-in, both sides and recovery. */
export function buildDailyWorkout(
  source: Workout,
  minutes: DailyDuration = defaultDailyDuration,
  effort: IntensityLevel = "standard",
): Workout {
  const workSeconds = { light: 30, standard: 40, challenging: 46 }[effort];
  const items = Array.from({ length: minutes }, (_, index) => {
    const original = source.items[index % source.items.length];
    const durationSeconds = Math.min(
      original.maxWorkSeconds ?? original.prescription.durationSeconds,
      original.prescription.perSide ? workSeconds / 2 : workSeconds,
    );
    return {
      ...original,
      id: `${original.id}-interval-${index + 1}`,
      sets: 1,
      minSets: 1,
      maxSets: 1,
      minWorkSeconds: Math.min(
        original.minWorkSeconds ?? durationSeconds,
        durationSeconds,
      ),
      maxWorkSeconds: original.maxWorkSeconds ?? durationSeconds,
      prescription: { ...original.prescription, durationSeconds },
      restAfterSetSeconds: 0,
      restAfterExerciseSeconds: 0,
    };
  });
  // Distribute the remaining budget over real recovery phases; never truncate a side.
  const recoverySeconds = minutes * 60 - calculateSessionDuration({ items });
  const boundaries = items.length - 1;
  items.forEach((item, index) => {
    if (index < boundaries)
      item.restAfterExerciseSeconds =
        Math.floor(recoverySeconds / boundaries) +
        Number(index < recoverySeconds % boundaries);
  });
  return {
    ...source,
    items,
    estimatedMinutes: minutes,
    timingMode: "fixed-budget",
  };
}

/** Preserve the complete planned duration by exchanging work and recovery seconds. */
export function applyBudgetedEffort(
  source: Workout,
  effort: IntensityLevel,
  exercises: readonly Exercise[],
): Workout {
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  return {
    ...source,
    timingMode: "fixed-budget",
    items: source.items.map((item) => {
      const work = item.prescription.durationSeconds;
      const intervals = item.sets * (item.prescription.perSide ? 2 : 1);
      const recovery = item.restAfterExerciseSeconds ?? 0;
      const exercise = byId.get(item.exerciseId);
      const explosive =
        exercise?.qualities.includes("explosiveness") ||
        exercise?.tempo.mode === "explosive_reset";
      const delta =
        effort === "light"
          ? -Math.min(
              Math.round(work * 0.2),
              work - (item.minWorkSeconds ?? work),
            )
          : effort === "challenging" && !explosive
            ? Math.min(
                Math.round(work * 0.15),
                (item.maxWorkSeconds ?? work) - work,
                Math.max(0, Math.floor((recovery - 5) / intervals)),
              )
            : 0;
      return {
        ...item,
        prescription: { ...item.prescription, durationSeconds: work + delta },
        restAfterExerciseSeconds: recovery - delta * intervals,
      };
    }),
  };
}
