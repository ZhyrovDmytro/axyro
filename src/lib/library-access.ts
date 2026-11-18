import { publishedExercises } from "@/content/exercises";
import type { Exercise } from "@/domain/exercise/exercise.types";
import { getExerciseMediaAvailability } from "@/domain/exercise/exercise-media-state";

export const FREE_LIBRARY_LIMIT = 10;
export const GUEST_LIBRARY_LIMIT = 6;
/** Select before search/pagination so the preview stays consistent across filters. */
export function librarySelection(
  exercises: readonly Exercise[],
  fullCatalog: boolean,
): Exercise[] {
  const rank = { video: 0, image: 1, guide: 2 } as const;
  const sorted = [...exercises].sort(
    (a, b) =>
      rank[getExerciseMediaAvailability(a.media)] -
        rank[getExerciseMediaAvailability(b.media)] ||
      a.name.localeCompare(b.name, "en"),
  );
  return fullCatalog ? sorted : sorted.slice(0, FREE_LIBRARY_LIMIT);
}

/** Access is tied to the global catalog order, never the current filter. */
export const freeExerciseIds: ReadonlySet<string> = new Set(
  librarySelection(publishedExercises, false).map((exercise) => exercise.id),
);
