import { describe, expect, it } from "vitest";

import { addDays } from "./date";
import { generateTrainingPlan } from "./generate-training-plan";
import {
  buildNextTrainingPlan,
  getTrainingPlanContinuityState,
} from "./plan-continuity";
import type { AthleteProfile } from "./training-plan.types";

const profile: AthleteProfile = {
  sport: "padel",
  experience: "intermediate",
  sessionsPerWeek: 2,
  sessionDurationMinutes: 20,
  preferredDays: ["monday", "thursday"],
  equipment: ["bodyweight"],
  goals: ["strength"],
  developmentAreas: [],
  padelLimitations: ["weak-core-rotation"],
  painAreas: ["shoulder"],
  matches: [],
};

describe("plan continuity", () => {
  it("enters PLAN_COMPLETE only after the final local calendar day", () => {
    const plan = generateTrainingPlan(profile, new Date(2026, 8, 28, 12));
    expect(getTrainingPlanContinuityState(plan, plan.endDate)).toBe("ACTIVE");
    expect(getTrainingPlanContinuityState(plan, addDays(plan.endDate, 1))).toBe(
      "PLAN_COMPLETE",
    );
  });

  it("builds a new block without mutating history and rechecks pain flags", () => {
    const previous = generateTrainingPlan(profile, new Date(2026, 8, 28, 12));
    const previousJson = JSON.stringify(previous);
    const next = buildNextTrainingPlan({
      previousPlan: previous,
      now: new Date(2026, 9, 26, 12),
      recentFeedback: [],
      keepPainExclusions: false,
    });

    expect(next.generatedAt).not.toBe(previous.generatedAt);
    expect(next.startDate).toBe("2026-10-26");
    expect(next.profile.painAreas).toEqual([]);
    expect(next.profile.sport).toBe(previous.profile.sport);
    expect(next.profile.preferredDays).toEqual(previous.profile.preferredDays);
    expect(JSON.stringify(previous)).toBe(previousJson);
  });
});
