"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { UiIcon } from "@/components/ui-icon";
import { intensityPresets } from "@/domain/workout/intensity";
import type { Workout } from "@/domain/workout/workout.types";
import { createBrowserWorkoutActivityRepository } from "@/services/persistence/local-workout-activity-repository";
import type { WorkoutActivity } from "@/services/persistence/workout-activity-repository";

type RecentWorkoutProps = {
  workouts: Pick<Workout, "id" | "slug" | "name" | "shortDescription">[];
};

export function RecentWorkout({ workouts }: RecentWorkoutProps) {
  const [activity, setActivity] = useState<WorkoutActivity | null>(null);

  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(() => {
      const recent = createBrowserWorkoutActivityRepository().list()[0] ?? null;
      if (active) setActivity(recent);
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, []);

  const workout = workouts.find((item) => item.id === activity?.workoutId);
  if (!activity || !workout) return null;

  const effort = intensityPresets[activity.lastIntensity].label;

  return (
    <section className="recent-workout" aria-labelledby="recent-heading">
      <div>
        <p className="kicker">Your recent workout</p>
        <h2 id="recent-heading">{workout.name}</h2>
        <p>{workout.shortDescription}</p>
      </div>
      <div className="recent-workout__meta">
        <span>{effort} effort</span>
        <span>
          {activity.completionCount > 0
            ? `${activity.completionCount} completed`
            : "Ready to finish"}
        </span>
      </div>
      <Link className="button button--dark" href={`/workouts/${workout.slug}`}>
        Train again <UiIcon name="arrow-right" />
      </Link>
    </section>
  );
}
