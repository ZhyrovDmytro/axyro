import { describe, it, expect } from "vitest";
import { workouts, starterWorkouts } from "@/content/workouts";
import { FREE_WORKOUT_ID } from "./entitlements";
import { freeExerciseIds } from "@/lib/content-access";
import { exercises } from "@/content/exercises";
describe("membership catalog contract", () => {
  it("has exactly one canonical complete free workout", () => {
    expect(
      workouts
        .filter((workout) => workout.access === "free")
        .map((workout) => workout.id),
    ).toEqual([FREE_WORKOUT_ID]);
    const starter = starterWorkouts.find(
      (workout) => workout.id === FREE_WORKOUT_ID,
    );
    expect(starter?.items.length).toBeGreaterThan(0);
    expect(starter?.access).toBe("free");
    for (const item of starter?.items ?? [])
      expect(freeExerciseIds.has(item.exerciseId)).toBe(true);
  });
  it("preserves 40 curated records after the requested removals", () => {
    expect(exercises).toHaveLength(40);
    expect(exercises.some(({ id }) => id === "standing-recovery-breath")).toBe(false);
    expect(exercises.some(({ id }) => id === "split-stance-brake")).toBe(false);
    expect(exercises.some(({ id }) => id === "single-leg-balance-reach")).toBe(false);
    expect(exercises.some(({ id }) => id === "lower-body-reset")).toBe(false);
    expect(exercises.some(({ id }) => id === "shoulder-reset-sweep")).toBe(false);
  });
});
