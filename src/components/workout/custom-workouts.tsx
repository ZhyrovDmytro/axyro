"use client";

import Link from "next/link";

import { CustomWorkoutEditor } from "@/components/plan/planned-workout-editor";
import { WorkoutPlayer } from "@/components/player/workout-player";
import { PageSkeleton } from "@/components/page-skeleton";
import { buildWorkoutSequence } from "@/domain/workout/build-workout-sequence";
import { applyBudgetedEffort } from "@/domain/workout/daily-duration";
import { parseIntensityLevel } from "@/domain/workout/intensity";
import type { Workout } from "@/domain/workout/workout.types";
import { useCustomWorkouts } from "@/hooks/use-custom-workouts";
import { getWorkoutExercises } from "@/lib/catalog";

const workoutDraft: Workout = {
  id: "new",
  slug: "new",
  name: "",
  shortDescription: "Your own guided workout.",
  difficulty: "beginner",
  focus: ["strength"],
  estimatedMinutes: 1,
  items: [],
};

export function CustomWorkoutRoute({
  id,
  intensityQuery,
  start = false,
}: {
  id: string;
  intensityQuery?: string | string[];
  start?: boolean;
}) {
  const { workouts, ready, userId } = useCustomWorkouts();
  if (!ready)
    return (
      <PageSkeleton
        title="Your workout"
        message="Loading your workout…"
        layout="list"
      />
    );
  const source =
    id === "new" && !start
      ? workoutDraft
      : workouts.find((workout) => workout.id === id);
  if (!source || !userId) {
    return (
      <main className="page-shell plan-empty">
        <section>
          <h1>Workout unavailable</h1>
          <p>Custom workouts are saved on the device where you create them.</p>
          <Link className="button button--primary" href="/workouts">
            Back to workouts
          </Link>
        </section>
      </main>
    );
  }

  if (!start)
    return (
      <CustomWorkoutEditor
        key={`${userId}:${id}`}
        workout={source}
        userId={userId}
      />
    );

  const intensity = parseIntensityLevel(intensityQuery);
  const exercises = getWorkoutExercises(source);
  const workout = applyBudgetedEffort(source, intensity, exercises);
  const editorHref = `/workouts/custom/${id}`;
  return (
    <WorkoutPlayer
      key={`${userId}:${id}`}
      workout={workout}
      exercises={exercises}
      intensity={intensity}
      sequence={buildWorkoutSequence(workout, exercises)}
      exitHref={editorHref}
      completionHref="/workouts"
      resumeHref={`${editorHref}/start?intensity=${intensity}`}
    />
  );
}
