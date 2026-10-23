import { describe, expect, it } from "vitest";

import {
  applyIntensity,
  composeWorkoutForIntensity,
  getSequenceDurationSeconds,
  parseIntensityLevel,
} from "./intensity";
import { publishedExercises } from "@/content/exercises";
import { workouts } from "@/content/workouts";
import type { SessionStep } from "./session-step.types";

const sequence: SessionStep[] = [
  {
    type: "active",
    exerciseId: "squat",
    workoutItemId: "squat-item",
    sectionType: "main",
    sectionExerciseIndex: 1,
    sectionExerciseCount: 1,
    setNumber: 1,
    totalSets: 1,
    prescription: { type: "timed", durationSeconds: 30 },
    guidance: { enabledByDefault: false, pattern: { type: "none" } },
  },
  {
    type: "rest",
    after: "exercise",
    exerciseId: "squat",
    workoutItemId: "squat-item",
    sectionType: "main",
    sectionExerciseIndex: 1,
    sectionExerciseCount: 1,
    durationSeconds: 20,
    nextExerciseId: "lunge",
  },
  { type: "completed" },
];

describe("workout intensity", () => {
  it("scales work down and recovery up for light effort", () => {
    const result = applyIntensity(sequence, "light");

    expect(result[0]).toMatchObject({ prescription: { durationSeconds: 25 } });
    expect(result[1]).toMatchObject({ durationSeconds: 25 });
  });

  it("scales work up and recovery down for challenging effort", () => {
    const result = applyIntensity(sequence, "challenging");

    expect(result[0]).toMatchObject({ prescription: { durationSeconds: 40 } });
    expect(result[1]).toMatchObject({ durationSeconds: 15 });
  });

  it("keeps standard effort unchanged", () => {
    expect(applyIntensity(sequence, "standard")).toEqual(sequence);
  });

  it("removes the lowest-priority accessory movement for light effort", () => {
    const workout = workouts.find(
      (candidate) => candidate.id === "foundation-strength",
    )!;

    const result = composeWorkoutForIntensity(
      workout,
      publishedExercises,
      "light",
    );

    expect(result.items).toHaveLength(2);
    expect(result.items.map((item) => item.exerciseId)).not.toContain(
      "dead-bug",
    );
    expect(workout.items).toHaveLength(3);
  });

  it("adds one compatible movement for challenging effort", () => {
    const workout = workouts.find(
      (candidate) => candidate.id === "foundation-strength",
    )!;

    const result = composeWorkoutForIntensity(
      workout,
      publishedExercises,
      "challenging",
    );
    const added = result.items.find(
      (item) =>
        !workout.items.some(
          (sourceItem) => sourceItem.exerciseId === item.exerciseId,
        ),
    );
    const addedExercise = publishedExercises.find(
      (exercise) => exercise.id === added?.exerciseId,
    );

    expect(result.items).toHaveLength(workout.items.length + 1);
    expect(added).toMatchObject({ sets: 1, role: "optional" });
    expect(
      addedExercise?.qualities.some((quality) =>
        workout.focus.includes(quality),
      ),
    ).toBe(true);
  });

  it("does not apply overload scaling to warm-up or cooldown work", () => {
    const supportSequence: SessionStep[] = [
      {
        ...sequence[0],
        type: "active",
        sectionType: "warmup",
      } as Extract<SessionStep, { type: "active" }>,
      {
        ...sequence[0],
        type: "active",
        sectionType: "cooldown",
      } as Extract<SessionStep, { type: "active" }>,
      { type: "completed" },
    ];

    expect(applyIntensity(supportSequence, "challenging")).toEqual(
      supportSequence,
    );
  });

  it("falls back to standard for an unknown URL value", () => {
    expect(parseIntensityLevel("extreme")).toBe("standard");
  });

  it("totals every timed phase", () => {
    expect(getSequenceDurationSeconds(sequence)).toBe(50);
  });
});
