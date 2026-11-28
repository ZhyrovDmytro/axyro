import { z } from "zod";

import { exercises } from "@/content/exercises";
import { workoutSchema } from "@/domain/workout/workout.schema";
import type { Workout } from "@/domain/workout/workout.types";
import {
  createBrowserUserStorage,
  customWorkoutsStorageKey,
} from "./user-storage";

const exerciseIds = new Set(exercises.map(({ id }) => id));
const customWorkoutSchema = workoutSchema.refine(
  (workout) =>
    workout.id === workout.slug &&
    /^custom-[a-f0-9-]{36}$/.test(workout.id) &&
    workout.name.trim().length > 0 &&
    workout.name.length <= 80 &&
    workout.items.every(({ exerciseId }) => exerciseIds.has(exerciseId)) &&
    new Set(workout.items.map(({ exerciseId }) => exerciseId)).size ===
      workout.items.length,
);
const customWorkoutsSchema = z.array(customWorkoutSchema);

export function readCustomWorkouts(userId: string): string | null {
  try {
    return (
      createBrowserUserStorage(userId)?.getItem(customWorkoutsStorageKey) ??
      null
    );
  } catch {
    return null;
  }
}

export function parseCustomWorkouts(serialized: string | null): Workout[] {
  if (!serialized) return [];
  try {
    const result = customWorkoutsSchema.safeParse(JSON.parse(serialized));
    return result.success ? result.data : [];
  } catch {
    return [];
  }
}

export function saveCustomWorkout(userId: string, workout: Workout): boolean {
  const validated = customWorkoutSchema.safeParse(workout);
  if (!validated.success) return false;
  try {
    const storage = createBrowserUserStorage(userId);
    if (!storage) return false;
    const saved = parseCustomWorkouts(
      storage.getItem(customWorkoutsStorageKey),
    );
    const next = JSON.stringify([
      validated.data,
      ...saved.filter(({ id }) => id !== workout.id),
    ]);
    storage.setItem(customWorkoutsStorageKey, next);
    return storage.getItem(customWorkoutsStorageKey) === next;
  } catch {
    return false;
  }
}
