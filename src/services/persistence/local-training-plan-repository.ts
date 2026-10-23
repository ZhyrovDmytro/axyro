import { createBrowserUserStorage } from "./user-storage";
import { isHomeExercise } from "@/domain/content/catalog-quality";
import { exercises } from "@/content/exercises";
import { sportExerciseProfiles } from "@/content/sport-exercise-profiles";
import { addDays } from "@/domain/training-plan/date";
import {
  getPersonalizedSessionDescription,
  getPersonalizedSessionTitle,
  isLegacyOutcomeBasedSessionTitle,
} from "@/domain/training-plan/personalized-session-title";
import { PLANNER_VERSION } from "@/domain/training-plan/planner-versions";
import { TRAINING_PLAN_DURATION_DAYS } from "@/domain/training-plan/progression";
import { questionnaireFocusForSlot } from "@/domain/training-plan/questionnaire-context";
import { trainingPlanSchema } from "@/domain/training-plan/training-plan.schema";
import type { TrainingPlan } from "@/domain/training-plan/training-plan.types";

import type { StorageLike } from "./storage";
import type { TrainingPlanRepository } from "./training-plan-repository";

export const trainingPlanStorageKey = "veyro.training-plan.v1";

const exerciseIdKeys = new Set([
  "exerciseId",
  "originalExerciseId",
  "replacementExerciseId",
]);

function findUnknownExerciseIds(plan: TrainingPlan): string[] {
  const knownExerciseIds = new Set(
    exercises.filter(isHomeExercise).map((exercise) => exercise.id),
  );
  const unknownExerciseIds = new Set<string>();

  function visit(value: unknown): void {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (value === null || typeof value !== "object") return;

    for (const [key, nestedValue] of Object.entries(value)) {
      if (exerciseIdKeys.has(key) && typeof nestedValue === "string") {
        if (!knownExerciseIds.has(nestedValue)) {
          unknownExerciseIds.add(nestedValue);
        }
        continue;
      }
      if (key === "exerciseIds" && Array.isArray(nestedValue)) {
        nestedValue.forEach((exerciseId) => {
          if (
            typeof exerciseId === "string" &&
            !knownExerciseIds.has(exerciseId)
          ) {
            unknownExerciseIds.add(exerciseId);
          }
        });
        continue;
      }
      visit(nestedValue);
    }
  }

  visit(plan);
  return [...unknownExerciseIds];
}

function migrateLegacySessionCopy(plan: TrainingPlan): TrainingPlan {
  if (plan.generation.plannerVersion === PLANNER_VERSION) return plan;

  const migrateWorkout = ({
    workout,
    slot,
    weekNumber,
  }: {
    workout: TrainingPlan["sessions"][number]["workout"];
    slot: number;
    weekNumber: number;
  }) => ({
    ...workout,
    name: isLegacyOutcomeBasedSessionTitle(workout.name)
      ? getPersonalizedSessionTitle({
          profile: plan.profile,
          workout,
          exerciseCatalog: exercises,
          sportProfiles: sportExerciseProfiles,
        })
      : workout.name,
    shortDescription: getPersonalizedSessionDescription({
      profile: plan.profile,
      workout,
      exerciseCatalog: exercises,
      sportProfiles: sportExerciseProfiles,
      preferredPadelPriorities: questionnaireFocusForSlot(plan.profile, slot)
        .padelPriorities,
      preferredDevelopmentAreas: questionnaireFocusForSlot(plan.profile, slot)
        .developmentAreas,
      outcomeIndex: weekNumber - 1,
    }),
  });

  return {
    ...plan,
    generation: { ...plan.generation, plannerVersion: PLANNER_VERSION },
    sessions: plan.sessions.map((session, sessionIndex) => {
      const sourceMatch = session.sourceWorkoutId.match(
        /^(?:generated|model)-session-(\d+)$/,
      );
      const slot = sourceMatch
        ? Number(sourceMatch[1]) - 1
        : sessionIndex % plan.profile.sessionsPerWeek;
      const copyContext = { slot, weekNumber: session.weekNumber };
      return {
        ...session,
        workout: migrateWorkout({
          workout: session.workout,
          ...copyContext,
        }),
        originalSessionSnapshot: {
          ...session.originalSessionSnapshot,
          workout: migrateWorkout({
            workout: session.originalSessionSnapshot.workout,
            ...copyContext,
          }),
        },
      };
    }),
  };
}

export class LocalTrainingPlanRepository implements TrainingPlanRepository {
  constructor(private readonly storage: StorageLike | null) {}

  hasOutdatedPlan = false;

  load(): TrainingPlan | null {
    this.hasOutdatedPlan = false;
    if (!this.storage) return null;
    try {
      const serialized = this.storage.getItem(trainingPlanStorageKey);
      if (!serialized) return null;
      const result = trainingPlanSchema.safeParse(JSON.parse(serialized));
      if (!result.success) return null;
      if (findUnknownExerciseIds(result.data).length > 0) {
        this.hasOutdatedPlan = true;
        return null;
      }
      if (
        result.data.endDate !==
        addDays(result.data.startDate, TRAINING_PLAN_DURATION_DAYS - 1)
      ) {
        this.clear();
        return null;
      }
      const migrated = migrateLegacySessionCopy(result.data);
      const minimized = JSON.stringify(migrated);
      if (minimized !== serialized) {
        try {
          this.storage.setItem(trainingPlanStorageKey, minimized);
        } catch {
          // A valid plan remains usable when a privacy setting blocks migration writes.
        }
      }
      return migrated;
    } catch {
      return null;
    }
  }

  save(plan: TrainingPlan): TrainingPlan {
    const validated = trainingPlanSchema.parse(plan);
    const unknownExerciseIds = findUnknownExerciseIds(validated);
    if (unknownExerciseIds.length > 0) {
      throw new Error(
        `Training plan references unknown exercise ID(s): ${unknownExerciseIds.join(", ")}.`,
      );
    }
    try {
      this.storage?.setItem(trainingPlanStorageKey, JSON.stringify(validated));
    } catch {
      // The plan remains usable in memory when browser storage is unavailable.
    }
    return validated;
  }

  clear() {
    try {
      this.storage?.removeItem?.(trainingPlanStorageKey);
    } catch {
      // Storage can be blocked by browser privacy settings.
    }
  }
}

export function createBrowserTrainingPlanRepository(): LocalTrainingPlanRepository {
  try {
    return new LocalTrainingPlanRepository(createBrowserUserStorage());
  } catch {
    return new LocalTrainingPlanRepository(null);
  }
}
