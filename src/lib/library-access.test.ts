import { describe, expect, it } from "vitest";
import { publishedExercises } from "@/content/exercises";
import { librarySelection } from "./library-access";

describe("library preview", () => {
  it("limits the stable preview to six without mutating the catalog or stripping media", () => {
    const originalIds = publishedExercises.map((e) => e.id);
    const preview = librarySelection(publishedExercises, false);
    expect(preview).toHaveLength(6);
    expect(preview).toEqual(
      librarySelection([...publishedExercises].reverse(), false),
    );
    for (const exercise of preview)
      expect(exercise).toBe(
        publishedExercises.find((e) => e.id === exercise.id),
      );
    expect(publishedExercises.map((e) => e.id)).toEqual(originalIds);
  });
  it("opens all 40 records for Pro in the same order", () => {
    const all = librarySelection(publishedExercises, true);
    expect(all).toHaveLength(40);
    expect(all.slice(0, 6)).toEqual(
      librarySelection(publishedExercises, false),
    );
  });
});
