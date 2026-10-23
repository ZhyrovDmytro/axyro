import { describe, expect, it } from "vitest";

import { generateTrainingPlan } from "@/domain/training-plan/generate-training-plan";
import { PLANNER_VERSION } from "@/domain/training-plan/planner-versions";
import type { AthleteProfile } from "@/domain/training-plan/training-plan.types";

import {
  LocalTrainingPlanRepository,
  trainingPlanStorageKey,
} from "./local-training-plan-repository";

const profile: AthleteProfile = {
  sport: "padel",
  experience: "beginner",
  sessionsPerWeek: 2,
  sessionDurationMinutes: 20,
  preferredDays: ["tuesday", "saturday"],
  equipment: ["bodyweight"],
  goals: ["movement-speed"],
  developmentAreas: [],
  padelLimitations: [],
  painAreas: [],
  matches: [],
};

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

describe("LocalTrainingPlanRepository", () => {
  it("validates and restores a saved plan", () => {
    const repository = new LocalTrainingPlanRepository(memoryStorage());
    const plan = generateTrainingPlan(profile, new Date(2026, 8, 28, 12));
    repository.save(plan);
    expect(repository.load()).toEqual(plan);
  });

  it("migrates outcome-based generated titles without replacing user names", () => {
    const storage = memoryStorage();
    const plan = generateTrainingPlan(profile, new Date(2026, 8, 28, 12));
    plan.generation.plannerVersion = "hybrid-planner.v3";
    plan.sessions[0].workout.name = "Net-approach acceleration";
    plan.sessions[0].workout.shortDescription =
      "Built for your selected focus: Reach the net faster.";
    plan.sessions[1].workout.name = "My custom session";
    storage.setItem(trainingPlanStorageKey, JSON.stringify(plan));

    const restored = new LocalTrainingPlanRepository(storage).load()!;

    expect(restored.generation.plannerVersion).toBe(PLANNER_VERSION);
    expect(restored.sessions[0].workout.name).not.toBe(
      "Net-approach acceleration",
    );
    expect(restored.sessions[0].workout.shortDescription).toMatch(
      /^Develops .+\.$/,
    );
    expect(restored.sessions[1].workout.name).toBe("My custom session");
  });

  it("removes obsolete body metrics and free text from a stored plan profile", () => {
    const storage = memoryStorage();
    const legacy = JSON.parse(
      JSON.stringify(generateTrainingPlan(profile, new Date(2026, 8, 28, 12))),
    ) as { profile: Record<string, unknown> };
    Object.assign(legacy.profile, {
      sex: "female",
      age: 28,
      heightCm: 168,
      weightKg: 62,
      considerations: "Old free-form health note",
    });
    storage.setItem(trainingPlanStorageKey, JSON.stringify(legacy));

    const restored = new LocalTrainingPlanRepository(storage).load();
    const rewritten = JSON.parse(storage.getItem(trainingPlanStorageKey)!);

    expect(restored?.profile).toEqual(profile);
    expect(rewritten.profile).toEqual(profile);
  });

  it("migrates the legacy planned label into the shared scheduled lifecycle", () => {
    const storage = memoryStorage();
    const plan = generateTrainingPlan(profile, new Date(2026, 8, 28, 12));
    const legacy = JSON.parse(JSON.stringify(plan)) as {
      sessions: Array<Record<string, unknown>>;
    };
    legacy.sessions[0].status = "planned";
    storage.setItem(trainingPlanStorageKey, JSON.stringify(legacy));

    expect(
      new LocalTrainingPlanRepository(storage).load()?.sessions[0].status,
    ).toBe("scheduled");
  });

  it("returns null for malformed saved data", () => {
    const storage = memoryStorage();
    storage.setItem("veyro.training-plan.v1", "{}");
    expect(new LocalTrainingPlanRepository(storage).load()).toBeNull();
  });

  it.each(["single-leg-balance-reach", "split-stance-brake", "standing-recovery-breath"])("preserves a saved plan containing %s and flags it for an explicit rebuild", (exerciseId) => {
    const storage = memoryStorage();
    const plan = generateTrainingPlan(profile, new Date(2026, 8, 28, 12));
    plan.sessions[0].sections[1].items[0].exerciseId = exerciseId;
    storage.setItem(trainingPlanStorageKey, JSON.stringify(plan));

    expect(new LocalTrainingPlanRepository(storage).load()).toBeNull();
    expect(storage.getItem(trainingPlanStorageKey)).not.toBeNull();
    const repository = new LocalTrainingPlanRepository(storage);
    repository.load();
    expect(repository.hasOutdatedPlan).toBe(true);
  });

  it("refuses to save a plan that references an unknown exercise", () => {
    const repository = new LocalTrainingPlanRepository(memoryStorage());
    const plan = generateTrainingPlan(profile, new Date(2026, 8, 28, 12));
    plan.sessions[0].workout.items[0].exerciseId = "single-leg-balance-reach";

    expect(() => repository.save(plan)).toThrow(
      "Training plan references unknown exercise ID(s): single-leg-balance-reach.",
    );
  });

  it("migrates saved plans created before duration-aware generation", () => {
    const storage = memoryStorage();
    const plan = generateTrainingPlan(profile, new Date(2026, 8, 28, 12));
    const legacy = JSON.parse(JSON.stringify(plan)) as {
      sessions: Array<Record<string, unknown>>;
    };
    for (const session of legacy.sessions) {
      delete session.targetDurationSeconds;
      delete session.estimatedDurationSeconds;
      delete session.durationDeltaSeconds;
      delete session.durationStatus;
      delete session.adjustments;
      delete session.weekNumber;
      delete session.progressionPhase;
      delete session.progression;
      delete session.feedbackAdaptations;
      delete session.originalSessionSnapshot;
      delete session.todayAdaptations;
      delete session.sections;
    }
    storage.setItem(trainingPlanStorageKey, JSON.stringify(legacy));

    const restored = new LocalTrainingPlanRepository(storage).load();

    expect(restored?.sessions[0]).toMatchObject({
      targetDurationSeconds: 20 * 60,
      adjustments: [],
    });
    expect(restored?.sessions[0].estimatedDurationSeconds).toBeGreaterThan(0);
  });

  it("adds calendar phases to duration-aware plans saved before progression", () => {
    const storage = memoryStorage();
    const plan = generateTrainingPlan(profile, new Date(2026, 8, 28, 12));
    const legacy = JSON.parse(JSON.stringify(plan)) as {
      sessions: Array<Record<string, unknown>>;
    };
    for (const session of legacy.sessions) {
      delete session.weekNumber;
      delete session.progressionPhase;
      delete session.progression;
      delete session.feedbackAdaptations;
      delete session.originalSessionSnapshot;
      delete session.todayAdaptations;
      delete session.sections;
    }
    storage.setItem(trainingPlanStorageKey, JSON.stringify(legacy));

    const restored = new LocalTrainingPlanRepository(storage).load();

    expect(restored?.sessions[0]).toMatchObject({
      weekNumber: 1,
      progressionPhase: "foundation",
      progression: {
        reason: "weekly_progression",
        phase: "foundation",
        changes: [],
      },
    });
    expect(restored?.sessions.at(-1)).toMatchObject({
      weekNumber: 9,
      progressionPhase: "consolidate",
    });
  });

  it("adds feedback history to plans saved before adaptation", () => {
    const storage = memoryStorage();
    const plan = generateTrainingPlan(profile, new Date(2026, 8, 28, 12));
    const legacy = JSON.parse(JSON.stringify(plan)) as {
      sessions: Array<Record<string, unknown>>;
    };
    for (const session of legacy.sessions) {
      delete session.feedbackAdaptations;
      delete session.originalSessionSnapshot;
      delete session.todayAdaptations;
      delete session.sections;
    }
    storage.setItem(trainingPlanStorageKey, JSON.stringify(legacy));

    const restored = new LocalTrainingPlanRepository(storage).load();

    expect(
      restored?.sessions.every(
        (session) => session.feedbackAdaptations.length === 0,
      ),
    ).toBe(true);
  });

  it("adds an immutable original snapshot to plans saved before Adapt today", () => {
    const storage = memoryStorage();
    const plan = generateTrainingPlan(profile, new Date(2026, 8, 28, 12));
    const legacy = JSON.parse(JSON.stringify(plan)) as {
      sessions: Array<Record<string, unknown>>;
    };
    for (const session of legacy.sessions) {
      delete session.originalSessionSnapshot;
      delete session.todayAdaptations;
      delete session.sections;
    }
    storage.setItem(trainingPlanStorageKey, JSON.stringify(legacy));

    const restored = new LocalTrainingPlanRepository(storage).load();
    const session = restored?.sessions[0];

    expect(session?.originalSessionSnapshot.workout).toEqual(session?.workout);
    expect(session?.originalSessionSnapshot.adjustments).toEqual(
      session?.adjustments,
    );
    expect(session?.todayAdaptations).toEqual([]);
  });

  it("adds explicit main-section identity to plans saved before sections", () => {
    const storage = memoryStorage();
    const plan = generateTrainingPlan(profile, new Date(2026, 8, 28, 12));
    const legacy = JSON.parse(JSON.stringify(plan)) as {
      sessions: Array<{
        sections?: unknown;
        originalSessionSnapshot?: { sections?: unknown };
      }>;
    };
    for (const session of legacy.sessions) {
      delete session.sections;
      if (session.originalSessionSnapshot) {
        delete session.originalSessionSnapshot.sections;
      }
    }
    storage.setItem(trainingPlanStorageKey, JSON.stringify(legacy));

    const restored = new LocalTrainingPlanRepository(storage).load();
    const session = restored?.sessions[0];

    expect(session?.sections).toEqual([
      {
        type: "main",
        items: session?.workout.items,
      },
    ]);
    expect(session?.originalSessionSnapshot.sections).toEqual(
      session?.sections,
    );
    expect(() => {
      if (restored) new LocalTrainingPlanRepository(storage).save(restored);
    }).not.toThrow();
  });
});
