import { expect, it } from "vitest";
import { selectUpcomingStep } from "./selectors";
import type { SessionStep } from "../workout/session-step.types";
const base = {
  exerciseId: "squat",
  workoutItemId: "squat",
  sectionType: "main",
  sectionExerciseIndex: 1,
  sectionExerciseCount: 1,
} as const;
it("previews recovery before another set of the same exercise", () => {
  const recovery: SessionStep = {
    ...base,
    type: "rest",
    after: "set",
    nextExerciseId: "squat",
    durationSeconds: 20,
  };
  const sequence: SessionStep[] = [
    {
      ...base,
      type: "active",
      setNumber: 1,
      totalSets: 2,
      prescription: { type: "timed", durationSeconds: 30 },
      guidance: { enabledByDefault: false, pattern: { type: "none" } },
    },
    recovery,
    { ...base, type: "ready", durationSeconds: 5 },
    { type: "completed" },
  ];
  expect(
    selectUpcomingStep({ sequence, currentIndex: 0, status: "running" }),
  ).toBe(recovery);
});
