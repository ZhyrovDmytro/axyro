import { expect, it } from "vitest";
import { buildIntervalSignals } from "./interval-signals";
import type { SessionStep } from "../workout/session-step.types";
const base = {
  exerciseId: "squat",
  workoutItemId: "squat",
  sectionType: "main",
  sectionExerciseIndex: 1,
  sectionExerciseCount: 1,
} as const;
const sequence: SessionStep[] = [
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
  { type: "completed" },
];
it("queues the final five seconds and a distinct boundary signal for work and recovery", () => {
  const signals = buildIntervalSignals(sequence, 0, 30_000);
  expect(signals.slice(0, 6)).toEqual([
    ...[25, 26, 27, 28, 29].map((second) => ({
      offsetMs: second * 1000,
      kind: "countdown",
    })),
    { offsetMs: 30_000, kind: "transition" },
  ]);
  expect(signals.slice(-6)).toEqual([
    ...[45, 46, 47, 48, 49].map((second) => ({
      offsetMs: second * 1000,
      kind: "countdown",
    })),
    { offsetMs: 50_000, kind: "transition" },
  ]);
});
it("resumes with only remaining signals and never replays missed countdowns", () => {
  expect(buildIntervalSignals(sequence, 1, 2_300)).toEqual([
    { offsetMs: 300, kind: "countdown" },
    { offsetMs: 1_300, kind: "countdown" },
    { offsetMs: 2_300, kind: "transition" },
  ]);
  expect(buildIntervalSignals(sequence, 2, 0)).toEqual([]);
});
