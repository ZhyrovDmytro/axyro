import { describe, expect, it } from "vitest";

import { getScheduledCue } from "./cadence-scheduler";
import type { SessionStep } from "../workout/session-step.types";

const activeStep: Extract<SessionStep, { type: "active" }> = {
  type: "active",
  exerciseId: "squat",
  workoutItemId: "squat-item",
  sectionType: "main",
  sectionExerciseIndex: 1,
  sectionExerciseCount: 1,
  setNumber: 1,
  totalSets: 1,
  prescription: { type: "timed", durationSeconds: 30 },
  guidance: {
    enabledByDefault: true,
    pattern: { type: "words", cues: ["down", "up"] },
    secondsPerCue: 1,
  },
};

describe("cadence scheduler", () => {
  it("alternates configured movement cues from elapsed phase time", () => {
    expect(getScheduledCue(activeStep, 30_000, "standard")?.text).toBe("down");
    expect(getScheduledCue(activeStep, 29_000, "standard")?.text).toBe("up");
    expect(getScheduledCue(activeStep, 28_000, "standard")?.text).toBe("down");
  });

  it("speeds cadence up for challenging effort", () => {
    const standard = getScheduledCue(activeStep, 29_100, "standard");
    const challenging = getScheduledCue(activeStep, 29_100, "challenging");

    expect(standard?.key).toBe("active-0");
    expect(challenging?.key).toBe("active-1");
  });

  it("adjusts guidance cadence independently from workout effort", () => {
    const normal = getScheduledCue(activeStep, 29_100, "standard");
    const faster = getScheduledCue(activeStep, 29_100, "standard", 1.25);

    expect(normal?.key).toBe("active-0");
    expect(faster?.key).toBe("active-1");
  });

  it("speaks the final three seconds of every countdown phase", () => {
    const ready: SessionStep = {
      type: "ready",
      exerciseId: "squat",
      workoutItemId: "squat-item",
      sectionType: "main",
      sectionExerciseIndex: 1,
      sectionExerciseCount: 1,
      durationSeconds: 5,
    };
    const sideTransition: SessionStep = {
      type: "side-transition",
      exerciseId: "row",
      workoutItemId: "row-item",
      sectionType: "main",
      sectionExerciseIndex: 1,
      sectionExerciseCount: 1,
      from: "left",
      to: "right",
      switchTarget: "hand",
      durationSeconds: 4,
    };

    expect(getScheduledCue(ready, 3_000, "standard")?.text).toBe("3");
    expect(getScheduledCue(activeStep, 3_000, "standard")?.text).toBe("3");
    expect(getScheduledCue(sideTransition, 4_000, "standard")?.text).toBe(
      "Switch hand",
    );
    expect(getScheduledCue(sideTransition, 3_000, "standard")?.text).toBe("3");
    expect(getScheduledCue(ready, 4_000, "standard")).toBeUndefined();
  });

  it("announces the workout start when the first active interval begins", () => {
    const firstActive: SessionStep = {
      ...activeStep,
      announceWorkoutStart: true,
    };

    expect(getScheduledCue(firstActive, 30_000, "standard")?.text).toBe(
      "Go",
    );
    expect(getScheduledCue(activeStep, 30_000, "standard")?.text).toBe("down");
  });

  it("announces start when work resumes after switching sides", () => {
    const nextSide: SessionStep = {
      ...activeStep,
      side: "right",
      announceStartAfterSwitch: true,
    };

    expect(getScheduledCue(nextSide, 30_000, "standard")?.text).toBe("Start");
  });

  it("announces recovery when a rest phase begins", () => {
    const rest: SessionStep = {
      type: "rest",
      after: "exercise",
      exerciseId: "squat",
      workoutItemId: "squat-item",
      sectionType: "main",
      sectionExerciseIndex: 1,
      sectionExerciseCount: 1,
      durationSeconds: 20,
      nextExerciseId: "lunge",
    };

    expect(getScheduledCue(rest, 20_000, "standard")?.text).toBe(
      "Stop, recovery time",
    );
    expect(getScheduledCue(rest, 3_000, "standard")?.text).toBe("3");
  });

  it("announces the next exercise immediately after recovery", () => {
    const nextReady: SessionStep = {
      type: "ready",
      exerciseId: "lunge",
      workoutItemId: "lunge-item",
      sectionType: "main",
      sectionExerciseIndex: 1,
      sectionExerciseCount: 1,
      durationSeconds: 5,
      announceNextExercise: true,
    };

    expect(getScheduledCue(nextReady, 5_000, "standard")?.text).toBe(
      "Next exercise",
    );
  });

  it("does not announce next exercise before the initial ready countdown", () => {
    const firstReady: SessionStep = {
      type: "ready",
      exerciseId: "squat",
      workoutItemId: "squat-item",
      sectionType: "main",
      sectionExerciseIndex: 1,
      sectionExerciseCount: 1,
      durationSeconds: 5,
    };

    expect(getScheduledCue(firstReady, 5_000, "standard")).toBeUndefined();
  });

  it("does not schedule disabled exercise guidance", () => {
    expect(
      getScheduledCue(
        {
          ...activeStep,
          guidance: { enabledByDefault: false, pattern: { type: "none" } },
        },
        29_000,
        "standard",
      ),
    ).toBeUndefined();
  });
});
