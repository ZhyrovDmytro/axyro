import { describe, expect, it } from "vitest";

import { defaultAdaptationProfile } from "./adaptation-profile";
import {
  compileModelPlanIntent,
  modelCandidatesForProfile,
} from "./model-assisted-planner";
import type { AthleteProfile } from "./training-plan.types";

const profile: AthleteProfile = {
  sport: "padel",
  experience: "intermediate",
  sessionsPerWeek: 3,
  sessionDurationMinutes: 20,
  preferredDays: ["monday", "wednesday", "friday"],
  equipment: ["bodyweight", "one-dumbbell"],
  goals: ["movement-speed", "injury-resilience"],
  developmentAreas: [],
  padelLimitations: ["slow-lateral-movement"],
  painAreas: [],
  matches: [],
};

describe("model-assisted planner", () => {
  it("compiles model ID selections into a validated 60-day plan", () => {
    const candidates = modelCandidatesForProfile(profile);
    const intent = {
      explanation: "Balances movement quality and resilient strength.",
      sessions: Array.from({ length: profile.sessionsPerWeek }, (_, index) => ({
        name: [
          "Lateral Strength & Control",
          "Braking & Balance",
          "Movement Strength",
        ][index],
        selectedExerciseIds: [
          candidates[index % candidates.length].id,
          candidates[(index + 1) % candidates.length].id,
        ],
      })),
    };

    const result = compileModelPlanIntent({
      intent,
      profile,
      adaptationProfile: defaultAdaptationProfile,
      today: new Date(2026, 8, 28, 12),
      model: "test-model",
    });

    expect(result.quality.valid).toBe(true);
    expect(result.plan.sessions).toHaveLength(26);
    expect(result.plan.sessions[0].workout.name).toBe(
      "Lateral Strength & Control",
    );
    expect(result.plan.generation).toMatchObject({
      source: "openai",
      model: "test-model",
      explanation: intent.explanation,
    });
  });

  it("rejects a model choice in the temporary avoid list", () => {
    const candidates = modelCandidatesForProfile(profile);
    const avoided = candidates[0].id;

    expect(() =>
      compileModelPlanIntent({
        intent: {
          explanation: "A proposal that ignored recent feedback.",
          sessions: Array.from(
            { length: profile.sessionsPerWeek },
            (_, index) => ({
              name: `Session ${index + 1}`,
              selectedExerciseIds: [avoided, candidates[index + 1].id],
            }),
          ),
        },
        profile,
        adaptationProfile: {
          ...defaultAdaptationProfile,
          avoidExercises: [avoided],
        },
        today: new Date(2026, 8, 28, 12),
        model: "test-model",
      }),
    ).toThrow("temporarily avoided exercises");
  });

  it("replaces an outcome-based model title with a content title", () => {
    const candidates = modelCandidatesForProfile(profile);
    const result = compileModelPlanIntent({
      intent: {
        explanation: "Uses lateral movement work to support court coverage.",
        sessions: Array.from(
          { length: profile.sessionsPerWeek },
          (_, index) => ({
            name:
              index === 0
                ? "Net-approach acceleration"
                : `Movement strength ${index + 1}`,
            selectedExerciseIds: [
              candidates[index % candidates.length].id,
              candidates[(index + 1) % candidates.length].id,
            ],
          }),
        ),
      },
      profile,
      adaptationProfile: defaultAdaptationProfile,
      today: new Date(2026, 8, 28, 12),
      model: "test-model",
    });

    expect(result.plan.sessions[0].workout.name).not.toBe(
      "Net-approach acceleration",
    );
  });

  it("does not offer temporarily avoided exercises to the model", () => {
    const baseline = modelCandidatesForProfile(profile);
    const avoided = baseline.slice(0, 2).map((candidate) => candidate.id);

    const candidates = modelCandidatesForProfile(profile, {
      ...defaultAdaptationProfile,
      avoidExercises: avoided,
    });

    expect(candidates.map((candidate) => candidate.id)).not.toEqual(
      expect.arrayContaining(avoided),
    );
  });
});
