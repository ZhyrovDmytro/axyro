import { describe, expect, it } from "vitest";

import { exercises } from "@/content/exercises";
import { workouts } from "@/content/workouts";
import {
  buildDefaultWorkoutItem,
  generateSessionPrescription,
  generateTrainingPlan,
} from "@/domain/training-plan/generate-training-plan";
import { athleteProfileSchema } from "@/domain/training-plan/training-plan.schema";

import { buildWorkoutSequence } from "./build-workout-sequence";
import { buildDailyWorkout, dailyDurations } from "./daily-duration";
import { intensityLevels } from "./intensity";
import type { Workout, WorkoutItem } from "./workout.types";

const separateSideIds = [
  "dumbbell-pronation-supination",
  "dumbbell-wrist-extension",
  "short-lever-copenhagen-hold",
  "lateral-lunge",
  "open-book-rotation",
  "side-plank-rotation",
  "side-lying-db-external-rotation",
  "standing-single-arm-db-overhead-press",
  "single-arm-row",
  "single-arm-prone-plate-over-obstacle",
  "single-leg-calf-raise",
  "standing-dumbbell-wood-chop",
  "supported-split-squat",
  "suitcase-march",
  "thread-the-needle",
];

function expectBothSides(workout: Workout, items: readonly WorkoutItem[]) {
  const sequence = buildWorkoutSequence(
    { ...workout, items: [...items] },
    exercises,
  );
  for (const item of items.filter((item) =>
    separateSideIds.includes(item.exerciseId),
  )) {
    expect(item.prescription.perSide, item.exerciseId).toBe(true);
    const active = sequence
      .filter((step) => step.type === "active")
      .filter((step) => step.workoutItemId === item.id);
    expect(
      active.map((step) => step.side),
      item.exerciseId,
    ).toEqual(
      Array.from({ length: item.sets }, () => ["left", "right"]).flat(),
    );
    expect(
      active.every(
        (step) =>
          step.prescription.durationSeconds ===
          item.prescription.durationSeconds,
      ),
    ).toBe(true);
    expect(
      sequence.filter(
        (step) =>
          step.type === "side-transition" && step.workoutItemId === item.id,
      ),
    ).toHaveLength(item.sets);
  }
}

describe("required separate-side exercise coverage", () => {
  it.each(separateSideIds)(
    "preserves both sides of %s when generating and fitting work",
    (id) => {
      const exercise = exercises.find((exercise) => exercise.id === id)!;
      expect(exercise).toBeDefined();
      expect(exercise.laterality).toBe("unilateral");
      if ("sideMode" in exercise.defaultPrescription) {
        expect(exercise.defaultPrescription.sideMode).toBe("separate");
      }
      const item = buildDefaultWorkoutItem(workouts[0], exercise)!;
      expect(item).not.toBeNull();
      const source = {
        ...workouts[0],
        items: [{ ...item, role: "core" as const }],
      };
      expectBothSides(source, source.items);
      for (const minutes of dailyDurations) {
        const fitted = generateSessionPrescription(source, minutes, [exercise]);
        expect(
          fitted.workout.items.some((item) => item.exerciseId === id),
        ).toBe(true);
        expectBothSides(fitted.workout, fitted.workout.items);
        for (const effort of intensityLevels) {
          const daily = buildDailyWorkout(source, minutes, effort);
          expectBothSides(daily, daily.items);
        }
      }
    },
  );

  it("preserves both sides in every predefined workout and quick-start effort/duration", () => {
    for (const workout of workouts) {
      expectBothSides(workout, workout.items);
      for (const minutes of dailyDurations) {
        for (const effort of intensityLevels) {
          const daily = buildDailyWorkout(workout, minutes, effort);
          expectBothSides(daily, daily.items);
        }
      }
    }
  });

  it.each(dailyDurations)(
    "preserves both sides throughout a generated %i-minute plan",
    (minutes) => {
      const profile = athleteProfileSchema.parse({
        sport: "padel",
        experience: "intermediate",
        sessionsPerWeek: 3,
        sessionDurationMinutes: minutes,
        preferredDays: ["monday", "wednesday", "friday"],
        equipment: ["bodyweight", "one-dumbbell"],
        goals: ["movement-speed"],
        padelLimitations: [],
        painAreas: [],
        matches: [],
      });
      const plan = generateTrainingPlan(profile, new Date(2026, 10, 18, 12));
      expect(plan.sessions.length).toBeGreaterThan(0);
      for (const session of plan.sessions) {
        expectBothSides(
          session.workout,
          session.sections.flatMap((section) => section.items),
        );
      }
    },
  );
});
