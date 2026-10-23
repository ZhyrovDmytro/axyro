import type { Exercise } from "@/domain/exercise/exercise.types";
import {
  calculateSessionDurationBreakdown,
  classifySessionDuration,
} from "@/domain/workout/session-duration";
import {
  buildSessionSections,
  calculateMainWorkoutFitTarget,
  calculateSessionSectionDuration,
  calculateSessionSectionsDuration,
  validateGeneratedSessionSections,
} from "@/domain/workout/session-sections";
import { getWorkoutTrainingTitle } from "@/domain/workout/training-title";
import type { Workout } from "@/domain/workout/workout.types";

import {
  buildDefaultWorkoutItem,
  generateSessionPrescription,
  getBlockedBodyAreas,
  profileExerciseEquipment,
  type GeneratedTrainingSession,
} from "./generate-training-plan";
import {
  selectModelExerciseCandidates,
  type ModelCandidateEnvironment,
} from "./model-exercise-candidates";
import type { AthleteProfile } from "./training-plan.types";

const MAX_MODEL_SELECTIONS = 40;

export type CompileModelWorkoutInput = {
  id: string;
  name: string;
  targetDurationMinutes: number;
  selectedExerciseIds: readonly string[];
  profile: AthleteProfile;
  environment: ModelCandidateEnvironment;
  exerciseCatalog: readonly Exercise[];
};

export type CompiledModelWorkout = GeneratedTrainingSession & {
  sectionDurationSeconds: {
    warmup: number;
    main: number;
    cooldown: number;
  };
  timing: ReturnType<typeof calculateSessionDurationBreakdown>;
};

function assertValidIntent(input: CompileModelWorkoutInput) {
  if (!Number.isInteger(input.targetDurationMinutes)) {
    throw new Error("Target duration must be a whole number of minutes.");
  }
  if (input.targetDurationMinutes < 5 || input.targetDurationMinutes > 30) {
    throw new Error("Target duration must be between 5 and 30 minutes.");
  }
  if (input.selectedExerciseIds.length === 0) {
    throw new Error("At least one main exercise ID is required.");
  }
  if (input.selectedExerciseIds.length > MAX_MODEL_SELECTIONS) {
    throw new Error(
      `At most ${MAX_MODEL_SELECTIONS} exercise IDs are allowed.`,
    );
  }
  if (
    new Set(input.selectedExerciseIds).size !== input.selectedExerciseIds.length
  ) {
    throw new Error("Exercise IDs must be unique.");
  }
}

function compatibleCatalog(input: CompileModelWorkoutInput) {
  const sections = ["warmup", "main", "cooldown"] as const;
  const compatibleIds = new Set(
    sections.flatMap((section) =>
      selectModelExerciseCandidates({
        profile: input.profile,
        availableTimeSeconds: input.targetDurationMinutes * 60,
        environment: input.environment,
        section,
        limit: MAX_MODEL_SELECTIONS,
        exerciseCatalog: input.exerciseCatalog,
      }).map((candidate) => candidate.id),
    ),
  );
  return input.exerciseCatalog.filter((exercise) =>
    compatibleIds.has(exercise.id),
  );
}

/**
 * Turns an untrusted model exercise selection into an executable session.
 * The model may choose stable IDs and express intent; Axyro owns every timing,
 * section, side, recovery, safety, and duration decision.
 */
export function compileModelWorkout(
  input: CompileModelWorkoutInput,
): CompiledModelWorkout {
  assertValidIntent(input);
  const exerciseById = new Map(
    input.exerciseCatalog.map((exercise) => [exercise.id, exercise]),
  );
  const unknownIds = input.selectedExerciseIds.filter(
    (id) => !exerciseById.has(id),
  );
  if (unknownIds.length > 0) {
    throw new Error(`Unknown exercise ID(s): ${unknownIds.join(", ")}.`);
  }

  const compatible = compatibleCatalog(input);
  const compatibleIds = new Set(compatible.map((exercise) => exercise.id));
  const rejectedIds = input.selectedExerciseIds.filter(
    (id) => !compatibleIds.has(id),
  );
  if (rejectedIds.length > 0) {
    throw new Error(
      `Exercise selection violates content, experience, equipment, pain, time, or environment constraints: ${rejectedIds.join(", ")}.`,
    );
  }

  const selected = input.selectedExerciseIds.map((id) => exerciseById.get(id)!);
  const difficultyRank = { beginner: 0, intermediate: 1, advanced: 2 } as const;
  const difficulty = selected.reduce<Exercise["difficulty"]>(
    (current, exercise) =>
      difficultyRank[exercise.difficulty] > difficultyRank[current]
        ? exercise.difficulty
        : current,
    "beginner",
  );
  const focus = [
    ...new Set(selected.flatMap((exercise) => exercise.qualities)),
  ];
  const sourceWorkout: Workout = {
    id: input.id,
    slug: input.id,
    name: input.name,
    shortDescription:
      "A session compiled by Axyro from a model-assisted exercise selection.",
    difficulty,
    focus,
    estimatedMinutes: input.targetDurationMinutes,
    items: [],
  };
  sourceWorkout.name = getWorkoutTrainingTitle(sourceWorkout);
  sourceWorkout.items = selected.map((exercise, index) => {
    const item = buildDefaultWorkoutItem(sourceWorkout, exercise);
    if (!item) {
      throw new Error(`${exercise.id} has no executable timed prescription.`);
    }
    return {
      ...item,
      role: index < 2 ? ("core" as const) : ("accessory" as const),
      priority: Math.max(60, 100 - index * 10),
    };
  });

  const targetDurationSeconds = input.targetDurationMinutes * 60;
  const initialSections = buildSessionSections({
    mainWorkout: sourceWorkout,
    exerciseCatalog: compatible,
    targetDurationSeconds,
    availableEquipment: profileExerciseEquipment(input.profile),
    excludedBodyAreas: [...getBlockedBodyAreas(input.profile)],
  });
  const supportDurationSeconds = initialSections
    .filter((section) => section.type !== "main")
    .reduce(
      (total, section) => total + calculateSessionSectionDuration(section),
      0,
    );
  const mainTargetDurationSeconds = Math.max(
    60,
    targetDurationSeconds - supportDurationSeconds,
  );
  const mainWorkoutFitTargetSeconds = calculateMainWorkoutFitTarget(
    sourceWorkout,
    mainTargetDurationSeconds,
  );
  const fitted = generateSessionPrescription(
    sourceWorkout,
    mainWorkoutFitTargetSeconds / 60,
    compatible.filter(
      (exercise) =>
        exercise.sessionRoles.includes("main") &&
        !initialSections.some(
          (section) =>
            section.type !== "main" &&
            section.items.some((item) => item.exerciseId === exercise.id),
        ),
    ),
  );
  const sections = buildSessionSections({
    mainWorkout: fitted.workout,
    exerciseCatalog: compatible,
    targetDurationSeconds,
    availableEquipment: profileExerciseEquipment(input.profile),
    excludedBodyAreas: [...getBlockedBodyAreas(input.profile)],
  });
  const validationErrors = validateGeneratedSessionSections({
    sections,
    targetDurationSeconds,
    exerciseCatalog: input.exerciseCatalog,
    availableEquipment: profileExerciseEquipment(input.profile),
    excludedBodyAreas: [...getBlockedBodyAreas(input.profile)],
  });
  if (validationErrors.length > 0) {
    throw new Error(`Invalid compiled session: ${validationErrors.join(" ")}`);
  }

  const estimatedDurationSeconds = calculateSessionSectionsDuration(sections);
  const [warmup, main, cooldown] = sections;
  return {
    workout: {
      ...fitted.workout,
      estimatedMinutes: Math.max(1, Math.round(estimatedDurationSeconds / 60)),
    },
    sections,
    targetDurationSeconds,
    estimatedDurationSeconds,
    durationDeltaSeconds: estimatedDurationSeconds - targetDurationSeconds,
    durationStatus: classifySessionDuration(
      estimatedDurationSeconds,
      targetDurationSeconds,
    ),
    adjustments: fitted.adjustments,
    sectionDurationSeconds: {
      warmup: calculateSessionSectionDuration(warmup),
      main: calculateSessionSectionDuration(main),
      cooldown: calculateSessionSectionDuration(cooldown),
    },
    timing: calculateSessionDurationBreakdown({
      items: sections.flatMap((section) => section.items),
    }),
  };
}
