import { describe, expect, it } from "vitest";

import { exercises } from "@/content/exercises";
import { workouts } from "@/content/workouts";

import { createWorkoutSessionSnapshot } from "./create-workout-session-snapshot";

describe("createWorkoutSessionSnapshot", () => {
  it("preserves the number of sets actually completed before an exercise skip", () => {
    const workout = workouts.find(
      (candidate) => candidate.id === "foundation-strength",
    );
    expect(workout).toBeDefined();
    const firstItem = workout!.items[0];

    const snapshot = createWorkoutSessionSnapshot({
      workout: workout!,
      exercises,
      intensity: "standard",
      targetDurationSeconds: 600,
      estimatedDurationSeconds: 600,
      completedSetKeys: new Set([`${firstItem.id}:1`]),
    });

    expect(snapshot.items[0]).toMatchObject({
      workoutItemId: firstItem.id,
      status: "skipped",
      sets: firstItem.sets,
      completedSets: 1,
    });
  });
});
