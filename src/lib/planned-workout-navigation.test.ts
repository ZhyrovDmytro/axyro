import { describe, expect, it } from "vitest";

import { getPlannedWorkoutStartHref } from "./planned-workout-navigation";

describe("getPlannedWorkoutStartHref", () => {
  it("uses the saved effort when preferences are ready", () => {
    expect(getPlannedWorkoutStartHref("session-1", "light", true)).toBe(
      "/plan/workouts/session-1/start?intensity=light",
    );
  });

  it("routes through effort review while preferences are loading", () => {
    expect(getPlannedWorkoutStartHref("session-1", "standard", false)).toBe(
      "/plan/workouts/session-1/edit",
    );
  });
});
