import { describe, expect, it } from "vitest";

import { exercises } from "@/content/exercises";
import type { Exercise } from "@/domain/exercise/exercise.types";

import type { AthleteProfile } from "./training-plan.types";
import { selectModelExerciseCandidates } from "./model-exercise-candidates";

const profile: AthleteProfile = {
  sport: "padel",
  experience: "beginner",
  sessionsPerWeek: 3,
  sessionDurationMinutes: 20,
  preferredDays: ["monday", "wednesday", "friday"],
  equipment: ["bodyweight"],
  goals: ["strength", "injury-resilience"],
  developmentAreas: [],
  padelLimitations: ["weak-core-rotation"],
  painAreas: [],
  matches: [],
};

const homeEnvironment = {
  availableSetupRequirements: ["floor", "wall", "chair", "mat"] as const,
  maximumSpace: "moderate" as const,
  maximumNoise: "moderate" as const,
};

function productionExercise() {
  const exercise = exercises.find(
    (candidate) =>
      candidate.planning.mediaStatus === "production" &&
      candidate.planning.sectionRoles.includes("main") &&
      candidate.equipment.every((item) => item === "none") &&
      candidate.setupRequirements.every((item) =>
        homeEnvironment.availableSetupRequirements.includes(
          item as (typeof homeEnvironment.availableSetupRequirements)[number],
        ),
      ),
  );
  if (!exercise) throw new Error("Expected a production exercise fixture.");
  return exercise;
}

describe("selectModelExerciseCandidates", () => {
  it("returns deterministic compact summaries instead of raw exercise objects", () => {
    const first = selectModelExerciseCandidates({
      profile,
      environment: homeEnvironment,
      limit: 40,
    });
    const second = selectModelExerciseCandidates({
      profile,
      environment: homeEnvironment,
      limit: 40,
    });

    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThan(0);
    expect(first.length).toBeLessThanOrEqual(40);
    expect(Object.keys(first[0]).sort()).toEqual(
      [
        "bodyAreas",
        "difficulty",
        "equipment",
        "id",
        "movementPatterns",
        "name",
        "sectionRoles",
        "setupRequirements",
        "sportContext",
        "timing",
        "trainingQualities",
      ].sort(),
    );
    for (const forbidden of [
      "media",
      "videoUrl",
      "instructions",
      "cues",
      "commonMistakes",
      "shortDescription",
      "sportSpecificReason",
      "defaultGuidance",
    ]) {
      expect(JSON.stringify(first)).not.toContain(`\"${forbidden}\"`);
    }
  });

  it("filters equipment, pain, level, content, time, and environment before ranking", () => {
    const source = productionExercise();
    const base: Exercise = {
      ...source,
      planning: { ...source.planning, avoidForPainAreas: [] },
    };
    const candidates: Exercise[] = [
      { ...base, id: "eligible", name: "Eligible" },
      {
        ...base,
        id: "equipment-blocked",
        name: "Equipment blocked",
        equipment: ["dumbbell"],
      },
      {
        ...base,
        id: "pain-blocked",
        name: "Pain blocked",
        planning: { ...base.planning, avoidForPainAreas: ["knee"] },
      },
      {
        ...base,
        id: "level-blocked",
        name: "Level blocked",
        difficulty: "advanced",
      },
      {
        ...base,
        id: "draft-blocked",
        name: "Draft blocked",
        media: { ...base.media, status: "draft" },
        planning: { ...base.planning, mediaStatus: "draft" },
      },
      {
        ...base,
        id: "time-blocked",
        name: "Time blocked",
        planning: {
          ...base.planning,
          safeWorkSeconds: { min: 100, max: 120 },
        },
      },
      {
        ...base,
        id: "environment-blocked",
        name: "Environment blocked",
        setupRequirements: ["foam_roller"],
      },
    ];

    const result = selectModelExerciseCandidates({
      profile: { ...profile, painAreas: ["knee"] },
      availableTimeSeconds: 90,
      environment: homeEnvironment,
      exerciseCatalog: candidates,
      sportProfiles: [],
    });

    expect(result.map((candidate) => candidate.id)).toEqual(["eligible"]);
  });

  it("caps retrieval even when a caller requests the whole catalog", () => {
    const base = productionExercise();
    const catalog = Array.from({ length: 150 }, (_, index) => ({
      ...base,
      id: `candidate-${String(index).padStart(2, "0")}`,
      name: `Candidate ${index}`,
    }));

    const result = selectModelExerciseCandidates({
      profile,
      environment: homeEnvironment,
      limit: 500,
      exerciseCatalog: catalog,
      sportProfiles: [],
    });

    expect(result).toHaveLength(100);
  });

  it("ranks exercises for selected non-painful development areas", () => {
    const base = productionExercise();
    const result = selectModelExerciseCandidates({
      profile: {
        ...profile,
        developmentAreas: ["shoulders-upper-back"],
        padelLimitations: [],
      },
      environment: homeEnvironment,
      exerciseCatalog: [
        {
          ...base,
          id: "a-leg-option",
          name: "Leg option",
          bodyAreas: ["legs"],
        },
        {
          ...base,
          id: "z-shoulder-option",
          name: "Shoulder option",
          bodyAreas: ["shoulders"],
        },
      ],
      sportProfiles: [],
    });

    expect(result.map((candidate) => candidate.id)).toEqual([
      "z-shoulder-option",
      "a-leg-option",
    ]);
  });
});
