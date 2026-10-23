import { requireProPage } from "@/services/auth/guards";
import { FREE_WORKOUT_ID } from "@/domain/access/entitlements";
import {
  buildDailyWorkout,
  parseDailyDuration,
} from "@/domain/workout/daily-duration";
import { notFound } from "next/navigation";

import { WorkoutPlayer } from "@/components/player/workout-player";
import { buildWorkoutSequence } from "@/domain/workout/build-workout-sequence";
import { parseIntensityLevel } from "@/domain/workout/intensity";
import { getWorkoutBySlug, getWorkoutExercises } from "@/lib/catalog";

type StartPageProps = {
  params: Promise<{ workoutId: string }>;
  searchParams: Promise<{
    intensity?: string | string[];
    minutes?: string | string[];
  }>;
};

export default async function StartPage({
  params,
  searchParams,
}: StartPageProps) {
  const { workoutId } = await params;
  const query = await searchParams;
  const workout = getWorkoutBySlug(workoutId);

  if (!workout) notFound();
  const continuation = new URLSearchParams();
  for (const key of ["intensity", "minutes"] as const) {
    const value = query[key];
    if (typeof value === "string") continuation.set(key, value);
    else if (value?.[0]) continuation.set(key, value[0]);
  }
  const destination = `/workouts/${encodeURIComponent(workoutId)}/start${continuation.size ? `?${continuation}` : ""}`;
  if (workout.id !== FREE_WORKOUT_ID)
    await requireProPage(destination, "workout");

  const intensity = parseIntensityLevel(query.intensity);
  const composedWorkout = buildDailyWorkout(
    workout,
    parseDailyDuration(query.minutes),
    intensity,
  );
  const exercises = getWorkoutExercises(composedWorkout);
  const sequence = buildWorkoutSequence(composedWorkout, exercises);

  return (
    <WorkoutPlayer
      workout={composedWorkout}
      exercises={exercises}
      sequence={sequence}
      intensity={intensity}
    />
  );
}
