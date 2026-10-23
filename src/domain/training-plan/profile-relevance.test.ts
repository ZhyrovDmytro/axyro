import { describe, expect, it } from "vitest";

import { exercises } from "@/content/exercises";
import { sportExerciseProfiles } from "@/content/sport-exercise-profiles";

import { exerciseMatchesDevelopmentArea } from "./profile-relevance";

describe("exerciseMatchesDevelopmentArea", () => {
  const exerciseById = new Map(
    exercises.map((exercise) => [exercise.id, exercise]),
  );
  const sportProfileByExerciseId = new Map(
    sportExerciseProfiles.map((profile) => [profile.exerciseId, profile]),
  );

  it("requires a dedicated grip or forearm role for that development area", () => {
    const overheadPress = exerciseById.get(
      "standing-single-arm-db-overhead-press",
    )!;
    const suitcaseMarch = exerciseById.get("suitcase-march")!;

    expect(
      exerciseMatchesDevelopmentArea(
        "elbow-forearm-grip",
        overheadPress,
        sportProfileByExerciseId.get(overheadPress.id),
      ),
    ).toBe(false);
    expect(
      exerciseMatchesDevelopmentArea(
        "elbow-forearm-grip",
        suitcaseMarch,
        sportProfileByExerciseId.get(suitcaseMarch.id),
      ),
    ).toBe(true);
  });
});
