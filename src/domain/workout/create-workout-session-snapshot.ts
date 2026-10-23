import type { Exercise } from "@/domain/exercise/exercise.types";
import type {
  PlannedWorkout,
  ProgressionPhase,
  SessionAdaptation,
} from "@/domain/training-plan/training-plan.types";
import type { WorkoutSessionSnapshot } from "@/services/persistence/workout-activity-repository";
import {
  intensityPresets,
  scaleDurationSeconds,
  type IntensityLevel,
} from "./intensity";
import type { Workout } from "./workout.types";
import type { SessionSection } from "./workout.types";
import { flattenSessionSections } from "./session-sections";

export function createWorkoutSessionSnapshot({
  workout,
  sections = [{ type: "main", items: workout.items }],
  exercises,
  intensity,
  targetDurationSeconds,
  estimatedDurationSeconds,
  progressionWeek,
  progressionPhase,
  originalSession,
  todayAdaptations,
  skippedWorkoutItemIds = new Set(),
  completedSetKeys,
}: {
  workout: Workout;
  sections?: SessionSection[];
  exercises: readonly Exercise[];
  intensity: IntensityLevel;
  targetDurationSeconds: number;
  estimatedDurationSeconds: number;
  progressionWeek?: number;
  progressionPhase?: ProgressionPhase;
  originalSession?: {
    workout: Workout;
    sections: SessionSection[];
    targetDurationSeconds: number;
    estimatedDurationSeconds: number;
  };
  todayAdaptations?: SessionAdaptation[];
  skippedWorkoutItemIds?: ReadonlySet<string>;
  completedSetKeys?: ReadonlySet<string>;
}): WorkoutSessionSnapshot {
  const preset =
    intensityPresets[
      workout.timingMode === "fixed-budget" ? "standard" : intensity
    ];
  const exerciseById = new Map(
    exercises.map((exercise) => [exercise.id, exercise]),
  );
  const bodyAreas = [
    ...new Set(
      flattenSessionSections(sections).flatMap(
        (item) => exerciseById.get(item.exerciseId)?.bodyAreas ?? [],
      ),
    ),
  ];
  return {
    workoutName: workout.name,
    focus: [...workout.focus],
    bodyAreas,
    items: sections.flatMap((section) =>
      section.items.map((item) => {
        const completedSets = completedSetKeys
          ? Array.from({ length: item.sets }, (_, index) => index + 1).filter(
              (setNumber) => completedSetKeys.has(`${item.id}:${setNumber}`),
            ).length
          : skippedWorkoutItemIds.has(item.id)
            ? 0
            : item.sets;
        return {
          section: section.type,
          status:
            completedSets === item.sets
              ? ("completed" as const)
              : ("skipped" as const),
          workoutItemId: item.id,
          exerciseId: item.exerciseId,
          ...(exerciseById.get(item.exerciseId)?.name
            ? { exerciseName: exerciseById.get(item.exerciseId)?.name }
            : {}),
          sets: item.sets,
          completedSets,
          workDurationSeconds: scaleDurationSeconds(
            item.prescription.durationSeconds,
            section.type === "main" ? preset.workMultiplier : 1,
          ),
          perSide: item.prescription.perSide ?? false,
          restAfterSetSeconds: item.restAfterSetSeconds
            ? scaleDurationSeconds(
                item.restAfterSetSeconds,
                section.type === "main" ? preset.restMultiplier : 1,
              )
            : 0,
          restAfterExerciseSeconds: item.restAfterExerciseSeconds
            ? scaleDurationSeconds(
                item.restAfterExerciseSeconds,
                section.type === "main" ? preset.restMultiplier : 1,
              )
            : 0,
        };
      }),
    ),
    ...(progressionWeek ? { progressionWeek } : {}),
    ...(progressionPhase ? { progressionPhase } : {}),
    targetDurationSeconds,
    estimatedDurationSeconds,
    ...(originalSession
      ? {
          originalSession: {
            targetDurationSeconds: originalSession.targetDurationSeconds,
            estimatedDurationSeconds: originalSession.estimatedDurationSeconds,
            items: originalSession.sections.flatMap((section) =>
              section.items.map((item) => ({
                section: section.type,
                status: "planned",
                workoutItemId: item.id,
                exerciseId: item.exerciseId,
                ...(exerciseById.get(item.exerciseId)?.name
                  ? { exerciseName: exerciseById.get(item.exerciseId)?.name }
                  : {}),
                sets: item.sets,
                workDurationSeconds: item.prescription.durationSeconds,
                perSide: item.prescription.perSide ?? false,
                restAfterSetSeconds: item.restAfterSetSeconds ?? 0,
                restAfterExerciseSeconds: item.restAfterExerciseSeconds ?? 0,
              })),
            ),
          },
        }
      : {}),
    ...(todayAdaptations && todayAdaptations.length > 0
      ? { todayAdaptations: [...todayAdaptations] }
      : {}),
  };
}

export function createPlannedSessionSnapshot(
  session: PlannedWorkout,
  exercises: readonly Exercise[],
): WorkoutSessionSnapshot {
  const exerciseById = new Map(
    exercises.map((exercise) => [exercise.id, exercise]),
  );
  const snapshotItems = (sections: readonly SessionSection[]) =>
    sections.flatMap((section) =>
      section.items.map((item) => ({
        section: section.type,
        status: "planned" as const,
        workoutItemId: item.id,
        exerciseId: item.exerciseId,
        ...(exerciseById.get(item.exerciseId)?.name
          ? { exerciseName: exerciseById.get(item.exerciseId)?.name }
          : {}),
        sets: item.sets,
        workDurationSeconds: item.prescription.durationSeconds,
        perSide: item.prescription.perSide ?? false,
        restAfterSetSeconds: item.restAfterSetSeconds ?? 0,
        restAfterExerciseSeconds: item.restAfterExerciseSeconds ?? 0,
      })),
    );
  const planned = session.originalSessionSnapshot;
  return {
    workoutName: planned.workout.name,
    focus: [...planned.workout.focus],
    bodyAreas: [
      ...new Set(
        planned.sections.flatMap((section) =>
          section.items.flatMap(
            (item) => exerciseById.get(item.exerciseId)?.bodyAreas ?? [],
          ),
        ),
      ),
    ],
    items: snapshotItems(planned.sections),
    progressionWeek: session.weekNumber,
    progressionPhase: session.progressionPhase,
    targetDurationSeconds: planned.targetDurationSeconds,
    estimatedDurationSeconds: planned.estimatedDurationSeconds,
  };
}

export function createAdaptedSessionSnapshot(
  session: PlannedWorkout,
  exercises: readonly Exercise[],
): WorkoutSessionSnapshot | undefined {
  if (session.todayAdaptations.length === 0) return undefined;
  return createWorkoutSessionSnapshot({
    workout: session.workout,
    sections: session.sections,
    exercises,
    intensity: "standard",
    targetDurationSeconds: session.targetDurationSeconds,
    estimatedDurationSeconds: session.estimatedDurationSeconds,
    progressionWeek: session.weekNumber,
    progressionPhase: session.progressionPhase,
    originalSession: {
      workout: session.originalSessionSnapshot.workout,
      sections: session.originalSessionSnapshot.sections,
      targetDurationSeconds:
        session.originalSessionSnapshot.targetDurationSeconds,
      estimatedDurationSeconds:
        session.originalSessionSnapshot.estimatedDurationSeconds,
    },
    todayAdaptations: session.todayAdaptations,
  });
}
