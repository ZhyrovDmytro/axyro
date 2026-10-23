import { describe, expect, it } from "vitest";
import type { SessionActivity } from "@/services/persistence/workout-activity-repository";
import { getPlanProgress } from "./plan-progress";
import type { TrainingPlan } from "./training-plan.types";

const plan = {
  generatedAt: "plan-1",
  startDate: "2026-10-01",
  endDate: "2026-11-29",
  sessions: [{ id: "session-1" }],
} as Pick<TrainingPlan, "generatedAt" | "startDate" | "endDate" | "sessions">;
const completed: SessionActivity = {
  id: "activity-1",
  planId: "plan-1",
  sessionId: "session-1",
  workoutId: "workout-1",
  scheduledDate: "2026-10-23",
  status: "completed",
  startedAt: "2026-10-23T12:00:00",
  completedAt: "2026-10-23T12:10:00",
};

describe("plan progress", () => {
  it("recognizes an off-day completion as extra instead of planned progress", () => {
    expect(
      getPlanProgress(plan, [{ ...completed, scheduledDate: "2026-10-24" }]),
    ).toEqual({ completedCount: 0, extraCount: 1 });
  });
  it("counts scheduled sessions once and credits standalone sessions separately", () => {
    expect(
      getPlanProgress(plan, [
        completed,
        completed,
        {
          ...completed,
          id: "extra-1",
          planId: undefined,
          sessionId: "standalone-1",
        },
      ]),
    ).toEqual({ completedCount: 1, extraCount: 1 });
  });
  it("excludes unfinished sessions, other plans and activity outside the block", () => {
    expect(
      getPlanProgress(plan, [
        { ...completed, status: "incomplete" },
        { ...completed, planId: "old-plan" },
        { ...completed, planId: undefined, startedAt: "2026-09-30T12:00:00" },
      ]),
    ).toEqual({ completedCount: 0, extraCount: 0 });
  });
  it("uses the start date for sessions crossing midnight and supports legacy dates", () => {
    expect(
      getPlanProgress(plan, [
        { ...completed, completedAt: "2026-10-24T00:05:00" },
      ]),
    ).toEqual({ completedCount: 1, extraCount: 0 });
    expect(
      getPlanProgress(plan, [
        { ...completed, startedAt: undefined, completedAt: undefined },
      ]),
    ).toEqual({ completedCount: 1, extraCount: 0 });
  });
});
