import { expect, it } from "vitest";
import { advanceExpiredPhases } from "./phase-advancement";
import type { SessionStep } from "../workout/session-step.types";

const base = {
  exerciseId: "squat",
  workoutItemId: "squat",
  sectionType: "main",
  sectionExerciseIndex: 1,
  sectionExerciseCount: 1,
} as const;
const sequence: SessionStep[] = [
  { ...base, type: "ready", durationSeconds: 5 },
  {
    ...base,
    type: "active",
    setNumber: 1,
    totalSets: 1,
    prescription: { type: "timed", durationSeconds: 30 },
    guidance: { enabledByDefault: false, pattern: { type: "none" } },
  },
  {
    ...base,
    type: "rest",
    after: "exercise",
    nextExerciseId: "squat",
    durationSeconds: 20,
  },
  { ...base, type: "ready", durationSeconds: 5 },
  { type: "completed" },
];
it("catches up across delayed work and recovery without extending the workout", () => {
  expect(advanceExpiredPhases(sequence, 0, 5_000, 57_000)).toEqual({
    nextIndex: 3,
    currentPhaseStartedAtMs: 55_000,
  });
});
it("finishes at the authoritative deadline after a long background delay", () => {
  expect(advanceExpiredPhases(sequence, 0, 5_000, 100_000)).toEqual({
    nextIndex: 4,
    currentPhaseStartedAtMs: 60_000,
  });
});
it("advances once on an on-time tick", () => {
  expect(advanceExpiredPhases(sequence, 0, 5_000, 5_000)).toEqual({
    nextIndex: 1,
    currentPhaseStartedAtMs: 5_000,
  });
});
