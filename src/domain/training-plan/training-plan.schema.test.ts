import { describe, expect, it } from "vitest";

import { athleteProfileSchema } from "./training-plan.schema";

const baseProfile = {
  sport: "padel" as const,
  experience: "intermediate" as const,
  sessionsPerWeek: 2,
  sessionDurationMinutes: 20,
  preferredDays: ["tuesday", "saturday"] as const,
  equipment: ["bodyweight"] as const,
  goals: ["movement-speed"] as const,
  developmentAreas: [],
  painAreas: [],
  matches: [],
};

describe("athleteProfileSchema", () => {
  it("allows up to three Padel priorities from each questionnaire step", () => {
    const result = athleteProfileSchema.safeParse({
      ...baseProfile,
      padelLimitations: [
        "slow-net-approach",
        "slow-lob-recovery",
        "late-split-step",
        "limited-bandeja-vibora-rotation",
        "weak-overhead-power",
        "unstable-volleys",
        "limited-overhead-mobility",
        "shoulder-fatigue",
        "poor-single-leg-balance",
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects more than three Padel priorities from one step", () => {
    const result = athleteProfileSchema.safeParse({
      ...baseProfile,
      padelLimitations: [
        "slow-net-approach",
        "slow-lob-recovery",
        "late-split-step",
        "slow-lateral-movement",
      ],
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "Choose up to three Padel priorities from each step.",
          path: ["padelLimitations"],
        }),
      ]),
    );
  });
});
