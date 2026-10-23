import { describe, expect, it } from "vitest";

import {
  defaultAdaptationProfile,
  updateAdaptationProfile,
} from "./adaptation-profile";

describe("adaptation profile", () => {
  it("records difficulty and skipped exercises without mutating completed plans", () => {
    const next = updateAdaptationProfile({
      current: defaultAdaptationProfile,
      feedback: "too-hard",
      snapshot: {
        workoutName: "Movement",
        focus: [],
        bodyAreas: [],
        items: [
          {
            section: "main",
            status: "skipped",
            exerciseId: "lateral-bound-stick",
            sets: 2,
            workDurationSeconds: 30,
            perSide: false,
            restAfterSetSeconds: 20,
            restAfterExerciseSeconds: 20,
          },
        ],
        targetDurationSeconds: 1200,
        estimatedDurationSeconds: 1200,
      },
    });

    expect(next).toEqual({
      recentDifficultyTrend: "too-hard",
      avoidExercises: ["lateral-bound-stick"],
      preferredExercises: [],
      temporaryLoadAdjustment: -1,
    });
    expect(defaultAdaptationProfile.avoidExercises).toEqual([]);
  });
});
