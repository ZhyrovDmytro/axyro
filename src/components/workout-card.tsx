"use client";
import { useEntitlement } from "@/components/membership/entitlement-provider";
import Link from "next/link";

import { ExerciseMedia } from "@/components/exercise-media";
import { UiIcon } from "@/components/ui-icon";
import { getWorkoutExercises } from "@/lib/catalog";
import { formatDumbbellAvailability, titleCase } from "@/lib/format";
import type { Workout } from "@/domain/workout/workout.types";

type WorkoutCardProps = {
  workout: Workout;
  featured?: boolean;
};

export function WorkoutCard({ workout, featured = false }: WorkoutCardProps) {
  const { hasPro } = useEntitlement();
  const locked = workout.access !== "free" && !hasPro;
  const exerciseList = getWorkoutExercises(workout);
  const equipment = [
    ...new Set(exerciseList.flatMap((exercise) => exercise.equipment)),
  ];

  return (
    <Link
      className={`workout-card${featured ? " workout-card--featured" : ""}`}
      href={`/workouts/${workout.slug}`}
    >
      {exerciseList[0] && (
        <div className="workout-card__media">
          <ExerciseMedia
            exercise={
              exerciseList.find(
                (exercise) => exercise.media.type === "animation",
              ) ?? exerciseList[0]
            }
            compact
          />
        </div>
      )}
      <div className="card-topline">
        <span className="pill pill--dark">{titleCase(workout.difficulty)}</span>
        <span>
          {locked ? "Pro · " : workout.access === "free" ? "Free · " : ""}
          {workout.estimatedMinutes} min
        </span>
      </div>
      <div>
        <h3>{workout.name}</h3>
        <p className="workout-card__focus">
          {titleCase(workout.primaryFamily ?? "conditioning")}
        </p>
        <p className="card-description">{workout.shortDescription}</p>
      </div>
      <div className="card-footer">
        <span>
          {new Set(workout.items.map((item) => item.exerciseId)).size} exercise
          {workout.items.length === 1 ? "" : "s"}
        </span>
        <span>
          {formatDumbbellAvailability(
            equipment,
            exerciseList.flatMap(
              (exercise) => exercise.optionalEquipment ?? [],
            ),
          )}
        </span>
        <UiIcon name="arrow-up-right" />
      </div>
    </Link>
  );
}
