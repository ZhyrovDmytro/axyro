import type {
  Exercise,
  GuidanceConfig,
  SessionSectionType,
} from "../exercise/exercise.types";
import type { SessionStep, Side } from "./session-step.types";
import type { SessionSection, Workout, WorkoutItem } from "./workout.types";
import { SESSION_TIMING } from "./session-duration";

const SILENT_GUIDANCE: GuidanceConfig = {
  enabledByDefault: false,
  pattern: { type: "none" },
};

function resolveGuidance(
  exercise: Exercise,
  item: WorkoutItem,
): GuidanceConfig {
  const base = exercise.defaultGuidance ?? SILENT_GUIDANCE;

  return {
    ...base,
    ...item.guidanceOverride,
    pattern: item.guidanceOverride?.pattern ?? base.pattern,
  };
}

function activeStep(
  exercise: Exercise,
  item: WorkoutItem,
  setNumber: number,
  side: Side | undefined,
  section: {
    sectionType: SessionSectionType;
    sectionExerciseIndex: number;
    sectionExerciseCount: number;
    sectionStart?: boolean;
  },
  announceWorkoutStart = false,
  announceStartAfterSwitch = false,
): SessionStep {
  return {
    type: "active",
    exerciseId: exercise.id,
    workoutItemId: item.id,
    ...section,
    setNumber,
    totalSets: item.sets,
    ...(side ? { side } : {}),
    ...(announceWorkoutStart ? { announceWorkoutStart: true } : {}),
    ...(announceStartAfterSwitch ? { announceStartAfterSwitch: true } : {}),
    prescription: {
      type: "timed",
      durationSeconds: item.prescription.durationSeconds,
    },
    guidance: resolveGuidance(exercise, item),
  };
}

export function buildWorkoutSequence(
  workout: Workout,
  exercises: readonly Exercise[],
  sections: readonly SessionSection[] = [
    { type: "main", items: workout.items },
  ],
): SessionStep[] {
  const exerciseById = new Map(
    exercises.map((exercise) => [exercise.id, exercise]),
  );
  const steps: SessionStep[] = [];

  const sectionedItems = sections.flatMap((section) =>
    section.items.map((item, sectionIndex) => ({
      item,
      sectionType: section.type,
      sectionExerciseIndex: sectionIndex + 1,
      sectionExerciseCount: section.items.length,
      sectionStart: sectionIndex === 0,
    })),
  );

  sectionedItems.forEach((entry, itemIndex) => {
    const { item } = entry;
    const sectionContext = {
      sectionType: entry.sectionType,
      sectionExerciseIndex: entry.sectionExerciseIndex,
      sectionExerciseCount: entry.sectionExerciseCount,
      ...(entry.sectionStart ? { sectionStart: true } : {}),
    };
    const exercise = exerciseById.get(item.exerciseId);
    if (!exercise) {
      throw new Error(
        `Workout "${workout.id}" references unknown exercise "${item.exerciseId}".`,
      );
    }
    if (!exercise.supportedModes.includes(item.prescription.type)) {
      throw new Error(
        `Exercise "${exercise.id}" does not support ${item.prescription.type} prescriptions.`,
      );
    }
    if (item.prescription.perSide && exercise.laterality === "bilateral") {
      throw new Error(
        `Bilateral exercise "${exercise.id}" cannot be prescribed per side.`,
      );
    }

    steps.push({
      type: "ready",
      exerciseId: exercise.id,
      workoutItemId: item.id,
      sectionType: entry.sectionType,
      sectionExerciseIndex: entry.sectionExerciseIndex,
      sectionExerciseCount: entry.sectionExerciseCount,
      ...(entry.sectionStart ? { sectionStart: true } : {}),
      durationSeconds:
        itemIndex === 0
          ? SESSION_TIMING.initialReadySeconds
          : SESSION_TIMING.exerciseTransitionSeconds,
      ...(itemIndex > 0 ? { announceNextExercise: true } : {}),
    });

    for (let setNumber = 1; setNumber <= item.sets; setNumber += 1) {
      const announceWorkoutStart = itemIndex === 0 && setNumber === 1;
      if (item.prescription.perSide) {
        steps.push(
          activeStep(
            exercise,
            item,
            setNumber,
            "left",
            sectionContext,
            announceWorkoutStart,
          ),
        );
        steps.push({
          type: "side-transition",
          exerciseId: exercise.id,
          workoutItemId: item.id,
          sectionType: entry.sectionType,
          sectionExerciseIndex: entry.sectionExerciseIndex,
          sectionExerciseCount: entry.sectionExerciseCount,
          from: "left",
          to: "right",
          switchTarget: exercise.switchTarget ?? "side",
          durationSeconds: SESSION_TIMING.sideTransitionSeconds,
        });
        steps.push(
          activeStep(
            exercise,
            item,
            setNumber,
            "right",
            sectionContext,
            false,
            true,
          ),
        );
      } else {
        steps.push(
          activeStep(
            exercise,
            item,
            setNumber,
            undefined,
            sectionContext,
            announceWorkoutStart,
          ),
        );
      }

      const hasAnotherSet = setNumber < item.sets;
      if (hasAnotherSet && item.restAfterSetSeconds) {
        steps.push({
          type: "rest",
          after: "set",
          exerciseId: exercise.id,
          workoutItemId: item.id,
          sectionType: entry.sectionType,
          sectionExerciseIndex: entry.sectionExerciseIndex,
          sectionExerciseCount: entry.sectionExerciseCount,
          durationSeconds: item.restAfterSetSeconds,
          nextExerciseId: exercise.id,
        });
      }
    }

    const nextEntry = sectionedItems[itemIndex + 1];
    if (nextEntry) {
      if (item.restAfterExerciseSeconds) {
        steps.push({
          type: "rest",
          after: "exercise",
          exerciseId: exercise.id,
          workoutItemId: item.id,
          sectionType: entry.sectionType,
          sectionExerciseIndex: entry.sectionExerciseIndex,
          sectionExerciseCount: entry.sectionExerciseCount,
          durationSeconds: item.restAfterExerciseSeconds,
          nextExerciseId: nextEntry.item.exerciseId,
        });
      }
    }
  });

  steps.push({ type: "completed" });
  return steps;
}
