import { describe, expect, it } from "vitest";
import { exercises } from "@/content/exercises";

import {
  sportExerciseProfileCatalogSchema,
  sportExerciseProfiles,
} from "@/content/sport-exercise-profiles";
import {
  getBodyAreasForSport,
  getExercisesForSport,
} from "@/lib/exercise-library";

describe("sport exercise profiles", () => {
  it("gives every curated exercise a distinct padel explanation", () => {
    expect(exercises).toHaveLength(40);
    const profiles = getExercisesForSport("padel");
    expect(profiles).toHaveLength(40);
    expect(new Set(profiles.map(({ exercise }) => exercise.id))).toEqual(
      new Set(exercises.map((exercise) => exercise.id)),
    );
    const reasons = profiles.map(({ profile }) => profile.sportSpecificReason);
    expect(new Set(reasons).size).toBe(40);
    expect(reasons.every((reason) => reason.length > 40)).toBe(true);
  });

  it("resolves the complete Padel shoulder library in curated order", () => {
    const library = getExercisesForSport("padel", "shoulders");

    expect(library.length).toBeGreaterThanOrEqual(9);
    expect(library[0].exercise.id).toBe("scapular-push-up");
    expect(library.map(({ exercise }) => exercise.id)).toEqual(
      expect.arrayContaining([
        "prone-foam-roller-plate-internal-external-rotation",
        "wall-slide-lift-off",
      ]),
    );
    expect(getBodyAreasForSport("padel")).toEqual([
      "shoulders",
      "core",
      "full-body",
      "back",
      "legs",
      "glutes",
      "arms",
    ]);
  });

  it("resolves the Padel core rotation library in curated order", () => {
    const library = getExercisesForSport("padel", "core");

    expect(library.length).toBeGreaterThan(7);
    expect(library.map(({ exercise }) => exercise.id).slice(0, 4)).toEqual([
      "standing-dumbbell-wood-chop",
      "side-plank-rotation",
      "dead-bug",
      "bird-dog",
    ]);
  });

  it("rejects profiles that reference unknown exercises", () => {
    expect(() =>
      sportExerciseProfileCatalogSchema.parse([
        {
          ...sportExerciseProfiles[0],
          exerciseId: "missing-exercise",
        },
      ]),
    ).toThrow("Unknown exercise id");
  });

  it("rejects duplicate sport-to-exercise associations", () => {
    expect(() =>
      sportExerciseProfileCatalogSchema.parse([
        sportExerciseProfiles[0],
        sportExerciseProfiles[0],
      ]),
    ).toThrow("Duplicate sport exercise profile");
  });
});
