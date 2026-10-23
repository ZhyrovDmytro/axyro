"use client";
import { isHomeExercise } from "@/domain/content/catalog-quality";
import Link from "next/link";

import { ExerciseMedia } from "./exercise-media";
import { UiIcon } from "./ui-icon";
import { formatDumbbellAvailability, titleCase } from "@/lib/format";
import type { Exercise } from "@/domain/exercise/exercise.types";
import type {
  Sport,
  SportExerciseProfile,
} from "@/domain/sport/sport-exercise-profile.types";

type ExerciseCardProps = {
  exercise: Exercise;
  profile?: SportExerciseProfile;
  sport?: Sport;
};

export function ExerciseCard({ exercise, profile, sport }: ExerciseCardProps) {
  const href = sport
    ? "/exercises/" + exercise.slug + "?sport=" + sport
    : "/exercises/" + exercise.slug;

  return (
    <Link className="exercise-card" href={href}>
      <ExerciseMedia exercise={exercise} compact />
      <div className="exercise-card-copy">
        <div className="tag-row" aria-label="Exercise categories">
          <span className="pill pill--dark">
            {titleCase(exercise.difficulty)}
          </span>
          <span className="pill">{titleCase(exercise.roles[0])}</span>
        </div>
        <h2>{exercise.name}</h2>
        <p>{exercise.shortDescription}</p>
        {!isHomeExercise(exercise) && (
          <p className="sport-reason">
            Reference video · extra equipment · excluded from training
          </p>
        )}
        {profile && (
          <p className="sport-reason">{profile.sportSpecificReason}</p>
        )}
        <div className="exercise-card-footer">
          <span>
            {formatDumbbellAvailability(
              exercise.equipment,
              exercise.optionalEquipment,
            )}
          </span>
          <span className="text-link">
            View guide <UiIcon name="arrow-right" />
          </span>
        </div>
      </div>
    </Link>
  );
}
