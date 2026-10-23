import { publishedExercises as exercises } from "@/content/exercises";
import { sportExerciseProfiles } from "@/content/sport-exercise-profiles";
import type { BodyArea, Exercise } from "@/domain/exercise/exercise.types";
import type {
  Sport,
  SportExerciseProfile,
} from "@/domain/sport/sport-exercise-profile.types";

export type SportExercise = {
  exercise: Exercise;
  profile: SportExerciseProfile;
};

export function getSportExerciseProfile(
  sport: Sport,
  exerciseId: string,
): SportExerciseProfile | undefined {
  return sportExerciseProfiles.find(
    (profile) => profile.sport === sport && profile.exerciseId === exerciseId,
  );
}

export function getExercisesForSport(
  sport: Sport,
  bodyArea?: BodyArea,
): SportExercise[] {
  const exerciseById = new Map(
    exercises.map((exercise) => [exercise.id, exercise]),
  );

  return sportExerciseProfiles
    .filter((profile) => profile.sport === sport)
    .sort((left, right) => left.priority - right.priority)
    .flatMap((profile) => {
      const exercise = exerciseById.get(profile.exerciseId);
      if (!exercise || (bodyArea && !profile.bodyAreas.includes(bodyArea))) {
        return [];
      }
      return [{ exercise, profile }];
    });
}

export function getBodyAreasForSport(sport: Sport): BodyArea[] {
  const publishedIds = new Set(exercises.map((exercise) => exercise.id));
  return [
    ...new Set(
      sportExerciseProfiles
        .filter(
          (profile) =>
            profile.sport === sport && publishedIds.has(profile.exerciseId),
        )
        .flatMap((profile) => profile.bodyAreas),
    ),
  ];
}
