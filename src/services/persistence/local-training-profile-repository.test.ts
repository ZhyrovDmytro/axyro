import { describe, expect, it } from "vitest";

import type { AthleteProfile } from "@/domain/training-plan/training-plan.types";
import {
  LocalTrainingProfileRepository,
  trainingProfileStorageKey,
} from "./local-training-profile-repository";

const profile: AthleteProfile = {
  sport: "padel",
  experience: "beginner",
  sessionsPerWeek: 2,
  sessionDurationMinutes: 20,
  preferredDays: ["tuesday", "saturday"],
  equipment: ["bodyweight"],
  goals: ["strength"],
  developmentAreas: ["shoulders-upper-back"],
  padelLimitations: ["weak-overhead-control"],
  painAreas: [],
  matches: [],
};

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

describe("LocalTrainingProfileRepository", () => {
  it("persists the stable questionnaire contract without UI labels", () => {
    const repository = new LocalTrainingProfileRepository(memoryStorage());
    const normalized: AthleteProfile = {
      sport: "padel",
      experience: "intermediate",
      sessionsPerWeek: 3,
      sessionDurationMinutes: 20,
      preferredDays: ["monday", "wednesday", "friday"],
      equipment: ["bodyweight", "one-dumbbell"],
      goals: ["movement-speed", "strength", "injury-resilience"],
      developmentAreas: ["core-lower-back", "calves-ankles-feet"],
      padelLimitations: [
        "slow-return-to-position",
        "weak-core-rotation",
        "shoulder-fatigue",
      ],
      painAreas: [],
      matches: [{ date: "2026-10-09", importance: "normal" }],
    };

    expect(repository.save(normalized)).toEqual(normalized);
  });

  it("validates and restores the minimized profile", () => {
    const repository = new LocalTrainingProfileRepository(memoryStorage());

    expect(repository.save(profile)).toEqual(profile);
    expect(repository.load()).toEqual(profile);
  });

  it("removes obsolete body metrics and free text from stored profiles", () => {
    const storage = memoryStorage();
    storage.setItem(
      trainingProfileStorageKey,
      JSON.stringify({
        ...profile,
        sex: "female",
        age: 28,
        heightCm: 168,
        weightKg: 62,
        considerations: "Old free-form health note",
      }),
    );

    expect(new LocalTrainingProfileRepository(storage).load()).toEqual(profile);
    expect(JSON.parse(storage.values.get(trainingProfileStorageKey)!)).toEqual(
      profile,
    );
  });

  it("migrates the legacy questionnaire shape to stable profile JSON", () => {
    const storage = memoryStorage();
    storage.setItem(
      trainingProfileStorageKey,
      JSON.stringify({
        primarySport: "padel",
        sportExperience: "one-to-three",
        padelChallenges: ["slow-court-recovery", "weak-overheads"],
        painAreas: ["shoulder"],
        goals: ["move-better", "strength"],
        sessionsPerWeek: 2,
        preferredDays: ["tuesday", "saturday"],
        sessionMinutes: 20,
        equipment: ["bodyweight"],
      }),
    );

    const migrated = new LocalTrainingProfileRepository(storage).load();

    expect(migrated).toEqual({
      sport: "padel",
      experience: "intermediate",
      sessionsPerWeek: 2,
      sessionDurationMinutes: 20,
      preferredDays: ["tuesday", "saturday"],
      equipment: ["bodyweight"],
      goals: ["movement-speed", "strength"],
      developmentAreas: [],
      padelLimitations: ["slow-return-to-position", "weak-overhead-control"],
      painAreas: ["shoulder"],
      matches: [],
    });
    expect(JSON.parse(storage.values.get(trainingProfileStorageKey)!)).toEqual(
      migrated,
    );
  });

  it("returns null when stored data is malformed", () => {
    const storage = memoryStorage();
    storage.setItem(trainingProfileStorageKey, "{not-json");

    expect(new LocalTrainingProfileRepository(storage).load()).toBeNull();
  });
});
