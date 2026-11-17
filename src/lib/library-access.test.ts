import { describe, expect, it } from "vitest";
import { publishedExercises } from "@/content/exercises";
import { freeExerciseIds, librarySelection } from "./library-access";

describe("library preview", () => {
  it("limits the stable preview to ten without mutating the catalog or stripping media", () => {
    const originalIds = publishedExercises.map((e) => e.id);
    const preview = librarySelection(publishedExercises, false);
    expect(preview).toHaveLength(10);
    expect(preview).toEqual(
      librarySelection([...publishedExercises].reverse(), false),
    );
    for (const exercise of preview)
      expect(exercise).toBe(
        publishedExercises.find((e) => e.id === exercise.id),
      );
    expect(publishedExercises.map((e) => e.id)).toEqual(originalIds);
  });
  it("grants only the first ten exercises, including the boundary", () => {
    const ordered = librarySelection(publishedExercises, true);
    expect(
      ordered.filter((exercise) => freeExerciseIds.has(exercise.id)),
    ).toHaveLength(10);
    expect(freeExerciseIds.has(ordered[9].id)).toBe(true);
    expect(freeExerciseIds.has(ordered[10].id)).toBe(false);
    expect(freeExerciseIds.has("unknown-exercise")).toBe(false);
  });
  it("opens all 40 records for Pro in the same order", () => {
    const all = librarySelection(publishedExercises, true);
    expect(all).toHaveLength(40);
    expect(all.slice(0, 10)).toEqual(
      librarySelection(publishedExercises, false),
    );
  });
});
