import { describe, expect, it } from "vitest";

import { exercises } from "@/content/exercises";

import { buildWorkoutSequence } from "./build-workout-sequence";
import { getSequenceDurationSeconds } from "./intensity";
import {
  calculateSessionDurationBreakdown,
  getSessionDurationToleranceSeconds,
} from "./session-duration";
import type { Workout } from "./workout.types";

const workout: Workout = {
  id: "duration-fixture",
  slug: "duration-fixture",
  name: "Duration fixture",
  shortDescription: "A deterministic duration fixture.",
  difficulty: "beginner",
  focus: ["strength"],
  estimatedMinutes: 5,
  items: [
    {
      id: "lunges",
      exerciseId: "reverse-lunge",
      sets: 2,
      prescription: { type: "timed", durationSeconds: 25, perSide: true },
      restAfterSetSeconds: 30,
      restAfterExerciseSeconds: 20,
    },
    {
      id: "squats",
      exerciseId: "bodyweight-squat",
      sets: 2,
      prescription: { type: "timed", durationSeconds: 30 },
      restAfterSetSeconds: 30,
    },
  ],
};

describe("calculateSessionDuration", () => {
  it.each([
    [10, 60],
    [16, 96],
    [20, 120],
    [30, 120],
  ])(
    "uses the smaller of ten percent or two minutes for a %i-minute target",
    (targetMinutes, expectedToleranceSeconds) => {
      expect(getSessionDurationToleranceSeconds(targetMinutes * 60)).toBe(
        expectedToleranceSeconds,
      );
    },
  );

  it("includes work, set recovery, exercise transitions and side switches", () => {
    expect(calculateSessionDurationBreakdown(workout)).toEqual({
      warmupSeconds: 0,
      workSeconds: 160,
      intraExerciseRestSeconds: 80,
      exerciseTransitionSeconds: 10,
      sideTransitionSeconds: 8,
      cooldownSeconds: 0,
      totalSeconds: 258,
    });
  });

  it("matches the duration of the executable player sequence", () => {
    const sequence = buildWorkoutSequence(workout, exercises);
    expect(calculateSessionDurationBreakdown(workout).totalSeconds).toBe(
      getSequenceDurationSeconds(sequence),
    );
  });
});
