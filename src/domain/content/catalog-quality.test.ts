import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { exercises, publishedExercises } from "@/content/exercises";
import { sportExerciseProfiles } from "@/content/sport-exercise-profiles";
import { publishedWorkouts, workouts } from "@/content/workouts";
import {
  createContentInventory,
  isExercisePlanEligible,
  validateExerciseCatalog,
  validateWorkoutCatalog,
} from "./catalog-quality";

describe("content catalog quality", () => {
  it("omits retired unclear movements from catalogs and workouts", () => {
    expect(exercises.some(({ id }) => id === "drop-step-recovery")).toBe(false);
    expect(
      sportExerciseProfiles.some(
        ({ exerciseId }) => exerciseId === "drop-step-recovery",
      ),
    ).toBe(false);
    expect(
      workouts.some((workout) =>
        workout.items.some(
          ({ exerciseId }) => exerciseId === "drop-step-recovery",
        ),
      ),
    ).toBe(false);
  });

  it("keeps production exercise and workout catalogs publishable", () => {
    const exerciseIssues = validateExerciseCatalog(exercises, (publicPath) =>
      existsSync(join(process.cwd(), "public", publicPath.slice(1))),
    );
    const workoutIssues = validateWorkoutCatalog(workouts, exercises);

    expect(
      exerciseIssues.filter((issue) => issue.severity === "error"),
    ).toEqual([]);
    expect(workoutIssues.filter((issue) => issue.severity === "error")).toEqual(
      [],
    );
    expect(publishedExercises.length).toBeGreaterThan(0);
    expect(
      publishedExercises.filter(isExercisePlanEligible).length,
    ).toBeGreaterThan(0);
    expect(publishedWorkouts.length).toBeGreaterThan(0);
  });

  it("reports movement-role coverage separately from raw catalog size", () => {
    const inventory = createContentInventory(
      exercises,
      sportExerciseProfiles,
      workouts,
    );

    expect(inventory.exercises.total).toBe(inventory.exercises.published);
    expect(inventory.movementRoles.deceleration).toBeGreaterThanOrEqual(4);
    expect(inventory.movementRoles.acceleration).toBeGreaterThanOrEqual(2);
    expect(inventory.movementRoles.grip_endurance).toBeGreaterThanOrEqual(2);
    expect(inventory.workoutFamilies["rotational-core"]).toBeGreaterThanOrEqual(
      1,
    );
  });
});
