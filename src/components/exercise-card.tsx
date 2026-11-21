"use client";
import { freeExerciseIds } from "@/lib/library-access";
import { isHomeExercise } from "@/domain/content/catalog-quality";
import { PaywallLink } from "@/components/membership/paywall-modal";

import { useEntitlement } from "@/components/membership/entitlement-provider";
import { ExercisePreview } from "./exercise-media";
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
  const { hasPro } = useEntitlement();
  const locked = !hasPro && !freeExerciseIds.has(exercise.id);
  const href = sport
    ? "/exercises/" + exercise.slug + "?sport=" + sport
    : "/exercises/" + exercise.slug;

  return (
    <PaywallLink
      className="exercise-card"
      href={href}
      context="library"
      returnTo={href}
      requirePro={!freeExerciseIds.has(exercise.id)}
    >
      <ExercisePreview exercise={exercise} />
      <div className="exercise-card-copy">
        <div className="tag-row" aria-label="Exercise categories">
          <span className="pill pill--dark">
            {titleCase(exercise.difficulty)} technique
          </span>
          <span className="pill">{titleCase(exercise.roles[0])}</span>
          {locked && <span className="membership-lock">Pro</span>}
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
            {locked ? "Unlock guide" : "View guide"}{" "}
            <UiIcon name="arrow-right" />
          </span>
        </div>
      </div>
    </PaywallLink>
  );
}
