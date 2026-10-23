import { describe, expect, it } from "vitest";

import { exercises } from "@/content/exercises";
import type { Exercise } from "@/domain/exercise/exercise.types";

import { compileModelWorkout } from "./compile-model-workout";
import { selectModelExerciseCandidates } from "./model-exercise-candidates";
import type { AthleteProfile } from "./training-plan.types";

const profile: AthleteProfile = {
  sport: "padel",
  experience: "intermediate",
  sessionsPerWeek: 3,
  sessionDurationMinutes: 20,
  preferredDays: ["monday", "wednesday", "friday"],
  equipment: ["bodyweight"],
  goals: ["movement-speed", "court-endurance"],
  developmentAreas: [],
  padelLimitations: ["slow-lateral-movement", "slow-return-to-position"],
  painAreas: [],
  matches: [],
};

const environment = {
  availableSetupRequirements: [
    "floor",
    "wall",
    "chair",
    "mat",
    "foam_roller",
    "low_obstacle",
  ] as const,
  maximumSpace: "large" as const,
  maximumNoise: "high" as const,
};

describe("compileModelWorkout", () => {
  it("turns a 20-minute model selection into a complete timed session", () => {
    const selectedExerciseIds = selectModelExerciseCandidates({
      profile,
      environment,
      section: "main",
      exerciseCatalog: exercises,
    })
      .slice(0, 3)
      .map((candidate) => candidate.id);

    const compiled = compileModelWorkout({
      id: "lateral-movement-session",
      name: "Lateral movement session",
      targetDurationMinutes: 20,
      selectedExerciseIds,
      profile,
      environment,
      exerciseCatalog: exercises,
    });

    expect(compiled.sections.map((section) => section.type)).toEqual([
      "warmup",
      "main",
      "cooldown",
    ]);
    expect(compiled.sectionDurationSeconds.warmup).toBe(3 * 60);
    expect(compiled.sectionDurationSeconds.cooldown).toBe(3 * 60);
    expect(
      Math.abs(compiled.sectionDurationSeconds.main - 14 * 60),
    ).toBeLessThanOrEqual(20 * 60 * 0.06);
    expect(compiled.estimatedDurationSeconds).toBeGreaterThanOrEqual(19 * 60);
    expect(compiled.estimatedDurationSeconds).toBeLessThanOrEqual(21 * 60);
    expect(
      Object.values(compiled.sectionDurationSeconds).reduce(
        (total, seconds) => total + seconds,
        0,
      ),
    ).toBe(compiled.estimatedDurationSeconds);
    expect(compiled.timing.totalSeconds).toBe(
      compiled.estimatedDurationSeconds,
    );
    expect(compiled.timing.workSeconds).toBeGreaterThan(0);
    expect(compiled.timing.intraExerciseRestSeconds).toBeGreaterThan(0);
  });

  it("rejects unknown IDs instead of inventing an exercise", () => {
    expect(() =>
      compileModelWorkout({
        id: "unknown-id-session",
        name: "Unknown ID session",
        targetDurationMinutes: 20,
        selectedExerciseIds: ["model-invented-exercise"],
        profile,
        environment,
        exerciseCatalog: exercises,
      }),
    ).toThrow("Unknown exercise ID(s): model-invented-exercise.");
  });

  it("rejects model selections that conflict with pain constraints", () => {
    const source = exercises.find(
      (exercise) =>
        exercise.planning.sectionRoles.includes("main") &&
        exercise.equipment.every((item) => item === "none") &&
        exercise.planning.mediaStatus === "production",
    );
    expect(source).toBeDefined();
    const painConflict: Exercise = {
      ...source!,
      id: "pain-conflict",
      slug: "pain-conflict",
      planning: {
        ...source!.planning,
        avoidForPainAreas: ["knee"],
      },
    };

    expect(() =>
      compileModelWorkout({
        id: "pain-conflict-session",
        name: "Pain conflict session",
        targetDurationMinutes: 20,
        selectedExerciseIds: [painConflict.id],
        profile: { ...profile, painAreas: ["knee"] },
        environment,
        exerciseCatalog: [...exercises, painConflict],
      }),
    ).toThrow(
      "violates content, experience, equipment, pain, time, or environment constraints",
    );
  });
});

it("compiles the three prone shoulder movements for a floor-only bodyweight plan", () => {
  const selectedExerciseIds = [
    "prone-foam-roller-overhead-shoulder-press",
    "prone-foam-roller-plate-internal-external-rotation",
    "single-arm-prone-plate-over-obstacle",
  ];
  const session = compileModelWorkout({
    id: "prone-shoulder-session",
    name: "Prone shoulder control",
    targetDurationMinutes: 10,
    selectedExerciseIds,
    profile,
    environment: { ...environment, availableSetupRequirements: ["floor"] },
    exerciseCatalog: exercises,
  });
  expect(session.workout.items.map((item) => item.exerciseId)).toEqual(
    expect.arrayContaining(selectedExerciseIds),
  );
  expect(Math.abs(session.durationDeltaSeconds)).toBeLessThanOrEqual(60);
});
