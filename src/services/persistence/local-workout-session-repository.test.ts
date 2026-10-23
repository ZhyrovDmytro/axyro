import { describe, expect, it } from "vitest";

import type { StorageLike } from "./storage";
import {
  activeWorkoutSessionStorageKey,
  LocalWorkoutSessionRepository,
} from "./local-workout-session-repository";
import type { ActiveWorkoutSessionState } from "./workout-session-repository";

function memoryStorage(): StorageLike & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

const active: ActiveWorkoutSessionState = {
  version: 1,
  lifecycleStatus: "in-progress",
  sessionId: "session-1",
  planId: "plan-1",
  workoutId: "workout-1",
  workoutName: "Core + Rotation",
  resumeHref: "/plan/workouts/session-1/start?intensity=standard",
  exitHref: "/plan",
  intensity: "standard",
  sequenceFingerprint: "fingerprint",
  startedAt: "2026-10-01T08:00:00.000Z",
  lastPersistedAt: "2026-10-01T08:03:00.000Z",
  currentIndex: 4,
  currentSection: "main",
  currentExerciseId: "dead-bug",
  currentExerciseIndex: 2,
  currentExerciseCount: 6,
  currentRound: 2,
  currentInterval: "active",
  paused: true,
  pausedRemainingMs: 18_000,
  activeDurationMs: 120_000,
  completedSetKeys: ["dead-bug-item:1"],
  skippedWorkoutItemIds: [],
  stepStatuses: ["completed", "completed", "completed", "completed", "current"],
};

describe("LocalWorkoutSessionRepository", () => {
  it("round-trips the exact paused logical workout position", () => {
    const repository = new LocalWorkoutSessionRepository(memoryStorage());
    repository.saveActive(active);
    expect(repository.loadActive()).toEqual({ kind: "valid", state: active });
  });

  it("does not clear a different active session", () => {
    const repository = new LocalWorkoutSessionRepository(memoryStorage());
    repository.saveActive(active);
    repository.clearActive("session-2");
    expect(repository.loadActive()).toMatchObject({ kind: "valid" });
    repository.clearActive("session-1");
    expect(repository.loadActive()).toEqual({ kind: "none" });
  });

  it("reports corrupt state instead of crashing or silently resuming", () => {
    const storage = memoryStorage();
    storage.setItem(activeWorkoutSessionStorageKey, "{not-json");
    expect(new LocalWorkoutSessionRepository(storage).loadActive()).toEqual({
      kind: "invalid",
    });
  });
});
