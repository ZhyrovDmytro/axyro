import { isExercisePlanEligible } from "@/domain/content/catalog-quality";
import { createWorkoutSessionSnapshot } from "./create-workout-session-snapshot";
import { applyBudgetedEffort } from "./daily-duration";
import { describe, expect, it } from "vitest";
import { exercises } from "@/content/exercises";
import { starterWorkouts } from "@/content/workouts";
import { buildWorkoutSequence } from "./build-workout-sequence";
import {
  buildDailyWorkout,
  dailyDurations,
  parseDailyDuration,
} from "./daily-duration";
import { getSequenceDurationSeconds, intensityLevels } from "./intensity";
import { workoutSchema } from "./workout.schema";
import { generateTrainingPlan } from "@/domain/training-plan/generate-training-plan";
import { athleteProfileSchema } from "@/domain/training-plan/training-plan.schema";

describe("daily workouts", () => {
  it("keeps exactly 40 exercises and all forty attached moving references", () => {
    expect(exercises).toHaveLength(40);
    expect(exercises.filter((e) => e.media.type === "animation")).toHaveLength(
      36,
    );
    expect(exercises.filter((e) => e.media.type === "video")).toHaveLength(4);
    const areas = new Set(exercises.flatMap((e) => e.bodyAreas));
    expect([...areas]).toEqual(
      expect.arrayContaining([
        "legs",
        "glutes",
        "core",
        "shoulders",
        "chest",
        "back",
        "arms",
        "full-body",
      ]),
    );
  });
  it("defaults invalid duration input to ten minutes", () => {
    for (const value of [undefined, "15", "30", "bad", ["5", "20"]])
      expect(parseDailyDuration(value)).toBe(10);
  });
  it.each(dailyDurations)(
    "runs every preset and effort for exactly %i minutes",
    (minutes) => {
      for (const source of starterWorkouts)
        for (const effort of intensityLevels) {
          const workout = workoutSchema.parse(
            buildDailyWorkout(source, minutes, effort),
          );
          const sequence = buildWorkoutSequence(workout, exercises);
          expect(getSequenceDurationSeconds(sequence)).toBe(minutes * 60);
          for (const item of workout.items) {
            expect(item.prescription.durationSeconds).toBeGreaterThanOrEqual(
              15,
            );
            if (item.prescription.perSide) {
              const sides = sequence.filter(
                (step) =>
                  step.type === "active" && step.workoutItemId === item.id,
              );
              expect(sides).toHaveLength(2);
            }
          }
        }
    },
  );
  it.each(dailyDurations)(
    "builds a complete plan at %i minutes with warmup and cooldown",
    (minutes) => {
      const profile = athleteProfileSchema.parse({
        sport: "padel",
        experience: "beginner",
        sessionsPerWeek: 3,
        sessionDurationMinutes: minutes,
        preferredDays: ["monday", "wednesday", "friday"],
        equipment: ["bodyweight", "one-dumbbell"],
        goals: ["movement-speed"],
        padelLimitations: [],
        painAreas: [],
        matches: [],
      });
      const plan = generateTrainingPlan(profile, new Date(2026, 9, 12, 12));
      expect(plan.sessions.length).toBeGreaterThan(0);
      for (const session of plan.sessions) {
        expect(session.sections.map((s) => s.type)).toEqual([
          "warmup",
          "main",
          "cooldown",
        ]);
        expect(
          Math.abs(session.estimatedDurationSeconds - minutes * 60),
        ).toBeLessThanOrEqual(minutes * 6);
      }
    },
  );
});

describe("preserved timing and equipment boundaries", () => {
  it("makes all 40 home-compatible movements available to plans and quick starts", () => {
    const eligible = exercises.filter(isExercisePlanEligible);
    expect(eligible).toHaveLength(40);
    const ids = new Set(eligible.map((exercise) => exercise.id));
    for (const workout of starterWorkouts)
      for (const item of workout.items)
        expect(ids.has(item.exerciseId)).toBe(true);
  });
  it("records compiled quick-start timing without applying effort twice", () => {
    const workout = buildDailyWorkout(starterWorkouts[0], 5, "challenging");
    const snapshot = createWorkoutSessionSnapshot({
      workout,
      exercises,
      intensity: "challenging",
      targetDurationSeconds: 300,
      estimatedDurationSeconds: 300,
    });
    expect(snapshot.items.map((item) => item.workDurationSeconds)).toEqual(
      workout.items.map((item) => item.prescription.durationSeconds),
    );
    expect(snapshot.items.map((item) => item.restAfterExerciseSeconds)).toEqual(
      workout.items.map((item) => item.restAfterExerciseSeconds ?? 0),
    );
  });
  it.each(dailyDurations)(
    "preserves complete planned timing at every effort for %i minutes",
    (minutes) => {
      const profile = athleteProfileSchema.parse({
        sport: "padel",
        experience: "intermediate",
        sessionsPerWeek: 3,
        sessionDurationMinutes: minutes,
        preferredDays: ["monday", "wednesday", "friday"],
        equipment: ["bodyweight", "one-dumbbell"],
        goals: ["strength"],
        padelLimitations: [],
        painAreas: [],
        matches: [],
      });
      const plan = generateTrainingPlan(profile, new Date(2026, 9, 12, 12));
      for (const session of plan.sessions)
        for (const effort of intensityLevels) {
          const workout = applyBudgetedEffort(
            session.workout,
            effort,
            exercises,
          );
          const sections = session.sections.map((section) =>
            section.type === "main"
              ? { ...section, items: workout.items }
              : section,
          );
          const sequence = buildWorkoutSequence(workout, exercises, sections);
          expect(getSequenceDurationSeconds(sequence)).toBe(
            session.estimatedDurationSeconds,
          );
          expect(workout.items.map((item) => item.exerciseId)).toEqual(
            session.workout.items.map((item) => item.exerciseId),
          );
          expect(workoutSchema.safeParse(workout).success).toBe(true);
        }
    },
  );
});
