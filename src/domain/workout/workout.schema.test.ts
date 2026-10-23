import { describe, expect, it } from "vitest";

import { exerciseSchema } from "../exercise/exercise.schema";
import { workoutSchema } from "./workout.schema";

describe("content schemas", () => {
  it("reports invalid exercise content", () => {
    const result = exerciseSchema.safeParse({ id: "incomplete" });

    expect(result.success).toBe(false);
  });

  it("rejects invalid workout prescriptions", () => {
    const result = workoutSchema.safeParse({
      id: "invalid",
      slug: "invalid",
      name: "Invalid",
      shortDescription: "Invalid fixture",
      difficulty: "beginner",
      focus: ["strength"],
      estimatedMinutes: 5,
      items: [
        {
          id: "item",
          exerciseId: "bodyweight-squat",
          sets: 0,
          prescription: { type: "timed", durationSeconds: -1 },
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});
