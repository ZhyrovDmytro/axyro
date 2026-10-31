import type { Exercise } from "@/domain/exercise/exercise.types";

/** Keep duration additions in existing body regions; a full-body tag alone is not a match. */
export function sharesWorkoutFocus(
  exercise: Exercise,
  mainExercises: readonly Exercise[],
) {
  if (!mainExercises.length) return true;
  const areas = new Set(mainExercises.flatMap((item) => item.bodyAreas));
  const lower = (item: Exercise) =>
    item.bodyAreas.some((area) => area === "legs" || area === "glutes");
  const upper = (item: Exercise) =>
    item.bodyAreas.some((area) =>
      ["shoulders", "chest", "arms"].includes(area),
    );
  if (upper(exercise) && !mainExercises.some(upper)) return false;
  if (lower(exercise) && !mainExercises.some(lower)) return false;
  return exercise.bodyAreas.some(
    (area) => area !== "full-body" && areas.has(area),
  );
}
