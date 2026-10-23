import { describe, expect, it } from "vitest";

import { createSessionState, sessionReducer } from "./session.reducer";
import { selectCurrentStep, selectProgressPercent } from "./selectors";
import type { SessionStep } from "../workout/session-step.types";

const sequence: SessionStep[] = [
  {
    type: "ready",
    exerciseId: "squat",
    workoutItemId: "squat-item",
    sectionType: "main",
    sectionExerciseIndex: 1,
    sectionExerciseCount: 1,
    durationSeconds: 5,
  },
  {
    type: "active",
    exerciseId: "squat",
    workoutItemId: "squat-item",
    sectionType: "main",
    sectionExerciseIndex: 1,
    sectionExerciseCount: 1,
    setNumber: 1,
    totalSets: 1,
    prescription: { type: "timed", durationSeconds: 30 },
    guidance: { enabledByDefault: false, pattern: { type: "none" } },
  },
  { type: "completed" },
];

describe("sessionReducer", () => {
  it("progresses through phases deterministically", () => {
    const ready = createSessionState(sequence);
    const active = sessionReducer(ready, { type: "COMPLETE_PHASE" });
    const completed = sessionReducer(active, { type: "COMPLETE_PHASE" });

    expect(selectCurrentStep(active).type).toBe("active");
    expect(completed).toMatchObject({ currentIndex: 2, status: "completed" });
    expect(selectProgressPercent(completed)).toBe(100);
  });

  it("does not progress a phase while paused", () => {
    const paused = sessionReducer(createSessionState(sequence), {
      type: "PAUSE",
    });
    const unchanged = sessionReducer(paused, { type: "COMPLETE_PHASE" });

    expect(unchanged).toBe(paused);
  });

  it("resumes at the same phase", () => {
    const active = sessionReducer(createSessionState(sequence), {
      type: "NEXT",
    });
    const paused = sessionReducer(active, { type: "PAUSE" });
    const resumed = sessionReducer(paused, { type: "RESUME" });

    expect(resumed).toMatchObject({ currentIndex: 1, status: "running" });
  });

  it("restores an interrupted session at the exact phase and paused", () => {
    const restored = createSessionState(sequence, { currentIndex: 1 });

    expect(restored).toMatchObject({ currentIndex: 1, status: "paused" });
    expect(selectCurrentStep(restored)).toMatchObject({
      type: "active",
      exerciseId: "squat",
      setNumber: 1,
    });
  });

  it("supports previous navigation after completion", () => {
    const completed = sessionReducer(
      { ...createSessionState(sequence), currentIndex: 2, status: "completed" },
      { type: "PREVIOUS" },
    );

    expect(completed).toMatchObject({ currentIndex: 1, status: "running" });
  });

  it("clamps rapid navigation at both sequence boundaries", () => {
    const initial = createSessionState(sequence);
    const beforeStart = sessionReducer(initial, { type: "PREVIOUS" });
    const completed = sessionReducer(
      { ...initial, currentIndex: 2, status: "completed" },
      { type: "NEXT" },
    );

    expect(beforeStart.currentIndex).toBe(0);
    expect(completed).toMatchObject({ currentIndex: 2, status: "completed" });
  });

  it("restarts a completed session", () => {
    const restarted = sessionReducer(
      { ...createSessionState(sequence), currentIndex: 2, status: "completed" },
      { type: "RESTART" },
    );

    expect(restarted).toMatchObject({ currentIndex: 0, status: "running" });
  });
});
