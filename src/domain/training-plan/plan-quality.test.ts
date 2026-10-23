import { describe, expect, it, vi } from "vitest";

import { exercises } from "@/content/exercises";
import { sportExerciseProfiles } from "@/content/sport-exercise-profiles";

import { addDays } from "./date";
import { generateTrainingPlan } from "./generate-training-plan";
import {
  assessTrainingPlanQuality,
  resolveTrainingPlanWithRepair,
  validateTrainingPlanHardConstraints,
  type PlanValidationError,
} from "./plan-quality";
import type { AthleteProfile, TrainingPlan } from "./training-plan.types";

const profile: AthleteProfile = {
  sport: "padel",
  experience: "intermediate",
  sessionsPerWeek: 3,
  sessionDurationMinutes: 20,
  preferredDays: ["monday", "wednesday", "friday"],
  equipment: ["bodyweight", "one-dumbbell"],
  goals: ["power", "injury-resilience"],
  developmentAreas: [],
  padelLimitations: ["weak-core-rotation", "slow-first-step"],
  painAreas: [],
  matches: [],
};

function generatedPlan() {
  return generateTrainingPlan(profile, new Date(2026, 8, 28, 12));
}

function withUnknownExercise(plan: TrainingPlan): TrainingPlan {
  const [first, ...rest] = plan.sessions;
  return {
    ...plan,
    sessions: [
      {
        ...first,
        sections: first.sections.map((section) =>
          section.type === "main"
            ? {
                ...section,
                items: section.items.map((item, index) =>
                  index === 0
                    ? { ...item, exerciseId: "invented-by-model" }
                    : item,
                ),
              }
            : section,
        ),
      },
      ...rest,
    ],
  };
}

describe("training plan quality", () => {
  it("accepts the deterministic generated plan and scores every soft target", () => {
    const report = assessTrainingPlanQuality({
      plan: generatedPlan(),
      exerciseCatalog: exercises,
      sportProfiles: sportExerciseProfiles,
    });

    expect(report.hardErrors).toEqual([]);
    expect(report.valid).toBe(true);
    expect(report.softMetrics).toHaveLength(7);
    expect(report.softScore).toBeGreaterThan(0);
    expect(report.softScore).toBeLessThanOrEqual(100);
  });

  it("returns structured hard errors for repair instead of a quality score penalty", () => {
    const plan = generatedPlan();
    const invalid = withUnknownExercise(plan);
    const first = invalid.sessions[0];
    const main = first.sections.find((section) => section.type === "main")!;
    const unsafeTiming = {
      ...invalid,
      sessions: invalid.sessions.map((session, sessionIndex) =>
        sessionIndex === 0
          ? {
              ...session,
              sections: session.sections.map((section) =>
                section.type === "main"
                  ? {
                      ...section,
                      items: section.items.map((item, itemIndex) =>
                        itemIndex === 1
                          ? {
                              ...item,
                              prescription: {
                                ...item.prescription,
                                durationSeconds: 3600,
                              },
                            }
                          : item,
                      ),
                    }
                  : section,
              ),
            }
          : session,
      ),
    } satisfies TrainingPlan;

    expect(main.items[0].exerciseId).toBe("invented-by-model");
    expect(
      validateTrainingPlanHardConstraints({
        plan: unsafeTiming,
        exerciseCatalog: exercises,
      }).map((error) => error.code),
    ).toEqual(
      expect.arrayContaining([
        "unknown_exercise",
        "invalid_timing",
        "duration_out_of_tolerance",
      ]),
    );
  });

  it("allows one repair attempt and then uses the deterministic safe fallback", async () => {
    const fallbackPlan = generatedPlan();
    const invalid = withUnknownExercise(fallbackPlan);
    const repair = vi.fn<
      (errors: readonly PlanValidationError[]) => TrainingPlan
    >(() => invalid);
    const fallback = vi.fn(() => fallbackPlan);

    const result = await resolveTrainingPlanWithRepair({
      initialPlan: invalid,
      repair,
      fallback,
      qualityInput: {
        exerciseCatalog: exercises,
        sportProfiles: sportExerciseProfiles,
      },
    });

    expect(repair).toHaveBeenCalledOnce();
    expect(repair.mock.calls[0][0]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "unknown_exercise" }),
      ]),
    );
    expect(fallback).toHaveBeenCalledOnce();
    expect(result.source).toBe("fallback");
    expect(result.repairAttempted).toBe(true);
    expect(result.quality.valid).toBe(true);
  });

  it("blocks a hard strength session on the day before a match", () => {
    const plan = generatedPlan();
    const session = plan.sessions[0];
    const exerciseId = session.sections.find(
      (section) => section.type === "main",
    )!.items[0].exerciseId;
    const catalog = exercises.map((exercise) =>
      exercise.id === exerciseId
        ? {
            ...exercise,
            sessionIntensity: "high" as const,
            planning: {
              ...exercise.planning,
              trainingQualities: [
                ...new Set([
                  ...exercise.planning.trainingQualities,
                  "strength" as const,
                ]),
              ],
            },
          }
        : exercise,
    );
    const beforeMatch: TrainingPlan = {
      ...plan,
      games: [
        {
          id: "match-after-strength",
          date: addDays(session.scheduledDate, 1),
          label: "Match",
          importance: "normal",
        },
      ],
    };

    expect(
      validateTrainingPlanHardConstraints({
        plan: beforeMatch,
        exerciseCatalog: catalog,
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "hard_strength_before_match" }),
      ]),
    );
  });

  it("does not repair a plan that already passes hard validation", async () => {
    const plan = generatedPlan();
    const repair = vi.fn(() => plan);
    const fallback = vi.fn(() => plan);

    const result = await resolveTrainingPlanWithRepair({
      initialPlan: plan,
      repair,
      fallback,
      qualityInput: { exerciseCatalog: exercises },
    });

    expect(result.source).toBe("initial");
    expect(repair).not.toHaveBeenCalled();
    expect(fallback).not.toHaveBeenCalled();
  });
});
