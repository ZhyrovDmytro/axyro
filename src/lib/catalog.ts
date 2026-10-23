import { publishedExercises as exercises } from "@/content/exercises";
import { starterWorkouts as workouts } from "@/content/workouts";
import type { Exercise } from "@/domain/exercise/exercise.types";
import type { Workout } from "@/domain/workout/workout.types";

export function getExerciseById(id: string): Exercise | undefined {
  return exercises.find((exercise) => exercise.id === id);
}

export function getExerciseBySlug(slug: string): Exercise | undefined {
  return exercises.find((exercise) => exercise.slug === slug);
}

export function getWorkoutBySlug(slug: string): Workout | undefined {
  return workouts.find((workout) => workout.slug === slug);
}

export function getWorkoutExercises(workout: Workout): Exercise[] {
  return workout.items.flatMap((item) => {
    const exercise = getExerciseById(item.exerciseId);
    return exercise ? [exercise] : [];
  });
}
