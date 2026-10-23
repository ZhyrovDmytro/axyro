import { starterWorkouts } from "@/content/workouts";
import { publishedExercises } from "@/content/exercises";
import { FREE_WORKOUT_ID } from "@/domain/access/entitlements";
import { composeWorkoutForIntensity } from "@/domain/workout/intensity";
const freeWorkout = starterWorkouts.find(
  (workout) => workout.id === FREE_WORKOUT_ID,
);
/** Include every effort variant so the complete free workout retains its guidance. */
export const freeExerciseIds = new Set(
  freeWorkout
    ? (["light", "standard", "challenging"] as const).flatMap((level) =>
        composeWorkoutForIntensity(
          freeWorkout,
          publishedExercises,
          level,
        ).items.map((item) => item.exerciseId),
      )
    : [],
);
