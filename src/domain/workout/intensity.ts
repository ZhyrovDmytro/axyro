import { isExercisePlanEligible } from "@/domain/content/catalog-quality";
import type { Exercise } from "../exercise/exercise.types";
import type { SessionStep } from "./session-step.types";
import type { Workout, WorkoutItem } from "./workout.types";

export const intensityLevels = ["light", "standard", "challenging"] as const;

export type IntensityLevel = (typeof intensityLevels)[number];

export type IntensityPreset = {
  id: IntensityLevel;
  label: string;
  description: string;
  workMultiplier: number;
  restMultiplier: number;
  cadenceMultiplier: number;
};

export const intensityPresets: Record<IntensityLevel, IntensityPreset> = {
  light: {
    id: "light",
    label: "Light",
    description:
      "A smaller movement mix with shorter intervals and more recovery.",
    workMultiplier: 0.8,
    restMultiplier: 1.25,
    cadenceMultiplier: 0.85,
  },
  standard: {
    id: "standard",
    label: "Standard",
    description:
      "The complete planned workout with balanced work and recovery.",
    workMultiplier: 1,
    restMultiplier: 1,
    cadenceMultiplier: 1,
  },
  challenging: {
    id: "challenging",
    label: "Challenging",
    description:
      "One extra matched movement with longer work and shorter recovery.",
    workMultiplier: 1.25,
    restMultiplier: 0.75,
    cadenceMultiplier: 1.15,
  },
};

const difficultyRank: Record<Exercise["difficulty"], number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

function buildChallengeItem(
  workout: Workout,
  exercise: Exercise,
): WorkoutItem | null {
  const defaults = exercise.defaultPrescription;
  let durationSeconds: number;
  let restSeconds: number;
  let perSide = exercise.laterality === "unilateral";

  if ("workDurationSeconds" in defaults) {
    durationSeconds = defaults.workDurationSeconds;
    restSeconds = defaults.restDurationSeconds;
    perSide = defaults.sideMode === "separate";
  } else if (defaults.durationSeconds) {
    durationSeconds = defaults.durationSeconds.min;
    restSeconds = defaults.restSeconds.min;
  } else {
    return null;
  }

  return {
    id: `${workout.id}-effort-${exercise.id}`,
    exerciseId: exercise.id,
    sets: 1,
    prescription: {
      type: "timed",
      durationSeconds,
      ...(perSide ? { perSide: true } : {}),
    },
    restAfterSetSeconds: restSeconds,
    restAfterExerciseSeconds: 15,
    role: "optional",
    priority: 1,
    minSets: 1,
    maxSets: 1,
    minWorkSeconds: durationSeconds,
    maxWorkSeconds: durationSeconds,
  };
}

/**
 * Changes the movement mix before timing is scaled. Light effort removes the
 * lowest-priority accessory work; challenging effort adds one compatible
 * movement that reinforces the workout's existing focus and body areas.
 */
export function composeWorkoutForIntensity(
  workout: Workout,
  exerciseCatalog: readonly Exercise[],
  level: IntensityLevel,
): Workout {
  if (level === "standard") return workout;

  if (level === "light") {
    const targetCount = Math.max(2, Math.floor(workout.items.length * 0.75));
    if (workout.items.length <= targetCount) return workout;

    const removableIds = workout.items
      .filter((item) => (item.role ?? "core") !== "core")
      .sort((left, right) => {
        const roleRank = { optional: 0, accessory: 1, core: 2 } as const;
        return (
          roleRank[left.role ?? "core"] - roleRank[right.role ?? "core"] ||
          (left.priority ?? 50) - (right.priority ?? 50) ||
          left.id.localeCompare(right.id)
        );
      })
      .slice(0, workout.items.length - targetCount)
      .map((item) => item.id);
    if (removableIds.length === 0) return workout;
    const removed = new Set(removableIds);
    return {
      ...workout,
      items: workout.items.filter((item) => !removed.has(item.id)),
    };
  }

  const usedExerciseIds = new Set(workout.items.map((item) => item.exerciseId));
  const exerciseById = new Map(
    exerciseCatalog.map((exercise) => [exercise.id, exercise]),
  );
  const currentExercises = workout.items.flatMap((item) => {
    const exercise = exerciseById.get(item.exerciseId);
    return exercise ? [exercise] : [];
  });
  const currentBodyAreas = new Set(
    currentExercises.flatMap((exercise) => exercise.bodyAreas),
  );
  const availableEquipment = new Set(
    currentExercises.flatMap((exercise) => exercise.equipment),
  );

  const candidate = exerciseCatalog
    .filter(
      (exercise) =>
        isExercisePlanEligible(exercise) &&
        !usedExerciseIds.has(exercise.id) &&
        exercise.sessionRoles.includes("main") &&
        exercise.supportedModes.includes("timed") &&
        difficultyRank[exercise.difficulty] <=
          difficultyRank[workout.difficulty] &&
        exercise.equipment.every(
          (equipment) =>
            equipment === "none" || availableEquipment.has(equipment),
        ),
    )
    .map((exercise) => ({
      exercise,
      focusMatches: exercise.qualities.filter((quality) =>
        workout.focus.includes(quality),
      ).length,
      bodyAreaMatches: exercise.bodyAreas.filter((area) =>
        currentBodyAreas.has(area),
      ).length,
    }))
    .filter(
      ({ focusMatches, bodyAreaMatches }) =>
        focusMatches > 0 && bodyAreaMatches > 0,
    )
    .sort(
      (left, right) =>
        right.focusMatches - left.focusMatches ||
        right.bodyAreaMatches - left.bodyAreaMatches ||
        left.exercise.id.localeCompare(right.exercise.id),
    )[0]?.exercise;
  if (!candidate) return workout;
  const item = buildChallengeItem(workout, candidate);
  return item ? { ...workout, items: [...workout.items, item] } : workout;
}

export function parseIntensityLevel(
  value: string | string[] | undefined,
): IntensityLevel {
  const candidate = Array.isArray(value) ? value[0] : value;
  return intensityLevels.includes(candidate as IntensityLevel)
    ? (candidate as IntensityLevel)
    : "standard";
}

export function scaleDurationSeconds(
  seconds: number,
  multiplier: number,
): number {
  if (multiplier === 1) return seconds;
  return Math.max(5, Math.round((seconds * multiplier) / 5) * 5);
}

export function applyIntensity(
  sequence: readonly SessionStep[],
  level: IntensityLevel,
): SessionStep[] {
  const preset = intensityPresets[level];

  return sequence.map((step) => {
    if (step.type === "active" && step.sectionType === "main") {
      return {
        ...step,
        prescription: {
          ...step.prescription,
          durationSeconds: scaleDurationSeconds(
            step.prescription.durationSeconds,
            preset.workMultiplier,
          ),
        },
      };
    }
    if (step.type === "rest" && step.sectionType === "main") {
      return {
        ...step,
        durationSeconds: scaleDurationSeconds(
          step.durationSeconds,
          preset.restMultiplier,
        ),
      };
    }
    return step;
  });
}

export function getSequenceDurationSeconds(
  sequence: readonly SessionStep[],
): number {
  return sequence.reduce((total, step) => {
    if (step.type === "completed") return total;
    if (step.type === "active")
      return total + step.prescription.durationSeconds;
    return total + step.durationSeconds;
  }, 0);
}
