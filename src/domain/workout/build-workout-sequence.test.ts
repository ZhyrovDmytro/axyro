import { buildDailyWorkout } from "./daily-duration";
import { describe, expect, it } from "vitest";

import { exercises } from "@/content/exercises";
import { workouts } from "@/content/workouts";
import type { Workout } from "./workout.types";
import { buildWorkoutSequence } from "./build-workout-sequence";
import { getSequenceDurationSeconds } from "./intensity";

function workoutWith(items: Workout["items"]): Workout {
  return {
    id: "test-workout",
    slug: "test-workout",
    name: "Test workout",
    shortDescription: "Sequence builder test fixture.",
    difficulty: "beginner",
    focus: ["strength"],
    estimatedMinutes: 5,
    items,
  };
}

describe("buildWorkoutSequence", () => {
  it("builds a time-based exercise", () => {
    const sequence = buildWorkoutSequence(
      workoutWith([
        {
          id: "squats",
          exerciseId: "bodyweight-squat",
          sets: 1,
          prescription: { type: "timed", durationSeconds: 30 },
        },
      ]),
      exercises,
    );

    expect(sequence.map((step) => step.type)).toEqual([
      "ready",
      "active",
      "completed",
    ]);
    expect(sequence[1]).toMatchObject({
      type: "active",
      setNumber: 1,
      announceWorkoutStart: true,
      prescription: { type: "timed", durationSeconds: 30 },
    });
  });

  it("preserves a timed prescription", () => {
    const sequence = buildWorkoutSequence(
      workoutWith([
        {
          id: "timed-dead-bug",
          exerciseId: "dead-bug",
          sets: 1,
          prescription: { type: "timed", durationSeconds: 40 },
        },
      ]),
      exercises,
    );

    expect(sequence[1]).toMatchObject({
      type: "active",
      prescription: { type: "timed", durationSeconds: 40 },
    });
  });

  it("expands unilateral per-side work with a side transition", () => {
    const sequence = buildWorkoutSequence(
      workoutWith([
        {
          id: "rows",
          exerciseId: "single-arm-row",
          sets: 1,
          prescription: { type: "timed", durationSeconds: 25, perSide: true },
        },
      ]),
      exercises,
    );

    expect(sequence.map((step) => step.type)).toEqual([
      "ready",
      "active",
      "side-transition",
      "active",
      "completed",
    ]);
    expect(sequence[1]).toMatchObject({ type: "active", side: "left" });
    expect(sequence[2]).toMatchObject({
      type: "side-transition",
      switchTarget: "hand",
      durationSeconds: 4,
    });
    expect(sequence[3]).toMatchObject({ type: "active", side: "right" });
    expect(sequence[1]).toMatchObject({ announceWorkoutStart: true });
    expect(sequence[3]).not.toHaveProperty("announceWorkoutStart");
    expect(sequence[3]).toMatchObject({ announceStartAfterSwitch: true });
  });

  it("adds rest only between sets", () => {
    const sequence = buildWorkoutSequence(
      workoutWith([
        {
          id: "squats",
          exerciseId: "bodyweight-squat",
          sets: 3,
          prescription: { type: "timed", durationSeconds: 30 },
          restAfterSetSeconds: 25,
        },
      ]),
      exercises,
    );

    expect(sequence.filter((step) => step.type === "active")).toHaveLength(3);
    expect(sequence.filter((step) => step.type === "rest")).toEqual([
      expect.objectContaining({ after: "set", durationSeconds: 25 }),
      expect.objectContaining({ after: "set", durationSeconds: 25 }),
    ]);
  });

  it("moves directly from exercise rest into the next ready step", () => {
    const sequence = buildWorkoutSequence(
      workoutWith([
        {
          id: "squats",
          exerciseId: "bodyweight-squat",
          sets: 1,
          prescription: { type: "timed", durationSeconds: 30 },
          restAfterExerciseSeconds: 20,
        },
        {
          id: "dead-bug",
          exerciseId: "dead-bug",
          sets: 1,
          prescription: { type: "timed", durationSeconds: 30 },
        },
      ]),
      exercises,
    );

    expect(sequence.map((step) => step.type)).toEqual([
      "ready",
      "active",
      "rest",
      "ready",
      "active",
      "completed",
    ]);
    expect(sequence[3]).toMatchObject({
      type: "ready",
      exerciseId: "dead-bug",
      announceNextExercise: true,
    });
  });

  it("preserves section order and identity across automatic transitions", () => {
    const workout = workoutWith([
      {
        id: "main-squat",
        exerciseId: "bodyweight-squat",
        sets: 1,
        prescription: { type: "timed", durationSeconds: 30 },
      },
    ]);
    const sequence = buildWorkoutSequence(workout, exercises, [
      {
        type: "warmup",
        items: [
          {
            id: "warmup-march",
            exerciseId: "dynamic-court-march",
            sets: 1,
            prescription: { type: "timed", durationSeconds: 30 },
          },
        ],
      },
      { type: "main", items: workout.items },
      {
        type: "cooldown",
        items: [
          {
            id: "cooldown-shift",
            exerciseId: "lateral-weight-shift",
            sets: 1,
            prescription: { type: "timed", durationSeconds: 30 },
          },
        ],
      },
    ]);

    expect(
      sequence
        .filter((step) => step.type === "ready")
        .map((step) => ({
          section: step.sectionType,
          sectionStart: step.sectionStart,
          exercise: step.exerciseId,
        })),
    ).toEqual([
      {
        section: "warmup",
        sectionStart: true,
        exercise: "dynamic-court-march",
      },
      {
        section: "main",
        sectionStart: true,
        exercise: "bodyweight-squat",
      },
      {
        section: "cooldown",
        sectionStart: true,
        exercise: "lateral-weight-shift",
      },
    ]);
  });

  it("builds the timed three-exercise Padel shoulder circuit", () => {
    const workout = workouts.find(({ id }) => id === "padel-shoulder-control");
    expect(workout).toBeDefined();

    const sequence = buildWorkoutSequence(workout!, exercises);

    expect(sequence.map((step) => step.type)).toEqual([
      "ready",
      "active",
      "side-transition",
      "active",
      "rest",
      "ready",
      "active",
      "rest",
      "ready",
      "active",
      "completed",
    ]);
    expect(
      sequence
        .filter((step) => step.type === "active")
        .map((step) => ({ exerciseId: step.exerciseId, side: step.side })),
    ).toEqual([
      {
        exerciseId: "single-arm-prone-plate-over-obstacle",
        side: "left",
      },
      {
        exerciseId: "single-arm-prone-plate-over-obstacle",
        side: "right",
      },
      {
        exerciseId: "prone-foam-roller-overhead-shoulder-press",
        side: undefined,
      },
      {
        exerciseId: "prone-foam-roller-plate-internal-external-rotation",
        side: undefined,
      },
    ]);
  });

  it("builds a ten-minute core session with complete left and right intervals", () => {
    const source = workouts.find(({ id }) => id === "padel-core-rotation")!;
    const workout = buildDailyWorkout(source);
    const sequence = buildWorkoutSequence(workout, exercises);
    expect(getSequenceDurationSeconds(sequence)).toBe(600);
    for (const item of workout.items.filter(
      (item) => item.prescription.perSide,
    )) {
      expect(
        sequence
          .filter(
            (step) => step.type === "active" && step.workoutItemId === item.id,
          )
          .map((step) => (step.type === "active" ? step.side : undefined)),
      ).toEqual(["left", "right"]);
    }
    expect(sequence.at(-1)?.type).toBe("completed");
  });

  it("rejects missing exercise references", () => {
    expect(() =>
      buildWorkoutSequence(
        workoutWith([
          {
            id: "missing",
            exerciseId: "not-in-catalog",
            sets: 1,
            prescription: { type: "timed", durationSeconds: 30 },
          },
        ]),
        exercises,
      ),
    ).toThrow('references unknown exercise "not-in-catalog"');
  });
});
