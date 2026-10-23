import { describe, expect, it } from "vitest";

import type { Workout } from "./workout.types";
import {
  formatTrainingTitle,
  getWorkoutOutcomeTitle,
  getWorkoutTrainingTitle,
} from "./training-title";

function workout(name: string, focus: Workout["focus"]): Workout {
  return {
    id: "training-title-test",
    slug: "training-title-test",
    name,
    shortDescription: "A workout used to verify calendar titles.",
    difficulty: "beginner",
    focus,
    estimatedMinutes: 20,
    items: [
      {
        id: "test-item",
        exerciseId: "bodyweight-squat",
        sets: 1,
        prescription: { type: "timed", durationSeconds: 30 },
      },
    ],
  };
}

describe("training titles", () => {
  it("replaces weekday and numbered session labels with the workout focus", () => {
    expect(
      getWorkoutTrainingTitle(
        workout("Monday Session", ["strength", "stability"]),
      ),
    ).toBe("Strength & Stability");
    expect(
      getWorkoutTrainingTitle(
        workout("Personalized session 2", ["mobility", "rotation"]),
      ),
    ).toBe("Mobility & Rotation");
  });

  it("preserves an authored training title", () => {
    expect(
      getWorkoutTrainingTitle(
        workout("Shoulder Strength & Stability", ["strength", "stability"]),
      ),
    ).toBe("Shoulder Strength & Stability");
  });

  it("omits warm-up when building a main training title", () => {
    expect(formatTrainingTitle(["warm-up", "power"])).toBe("Power");
  });

  it.each([
    ["Supports steadier single-leg movement.", "Steadier single-leg movement"],
    ["Supports quicker lob recovery.", "Quicker lob recovery"],
    ["Builds grip and forearm capacity.", "Grip and forearm capacity"],
    ["Develops power and stability.", "Power and stability"],
  ])(
    "promotes %s into a concise outcome title",
    (shortDescription, expected) => {
      expect(
        getWorkoutOutcomeTitle({
          ...workout("Endurance & Stability", ["endurance", "stability"]),
          shortDescription,
        }),
      ).toBe(expected);
    },
  );
});
