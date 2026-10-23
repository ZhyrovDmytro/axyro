import type { Exercise } from "@/domain/exercise/exercise.types";
import { getExerciseMediaAvailability } from "@/domain/exercise/exercise-media-state";

export const FREE_LIBRARY_LIMIT = 6;
/** Select before search/pagination so the preview stays consistent across filters. */
export function librarySelection(
  exercises: readonly Exercise[],
  hasPro: boolean,
): Exercise[] {
  const rank = { video: 0, image: 1, guide: 2 } as const;
  const sorted = [...exercises].sort(
    (a, b) =>
      rank[getExerciseMediaAvailability(a.media)] -
        rank[getExerciseMediaAvailability(b.media)] ||
      a.name.localeCompare(b.name),
  );
  return hasPro ? sorted : sorted.slice(0, FREE_LIBRARY_LIMIT);
}
