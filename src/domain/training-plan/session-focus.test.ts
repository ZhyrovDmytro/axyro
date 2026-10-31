import { describe, expect, it } from "vitest";
import { exercises } from "@/content/exercises";
import { sportExerciseProfiles } from "@/content/sport-exercise-profiles";
import {
  assembleMainWorkout,
  generateTrainingPlan,
} from "./generate-training-plan";
import { compileModelWorkout } from "./compile-model-workout";
import { compileModelPlanIntent } from "./model-assisted-planner";
import { defaultAdaptationProfile } from "./adaptation-profile";
import { exerciseMatchesDevelopmentArea } from "./profile-relevance";
import type { AthleteProfile } from "./training-plan.types";

const profile: AthleteProfile = {
  sport: "padel",
  experience: "intermediate",
  sessionsPerWeek: 2,
  sessionDurationMinutes: 10,
  preferredDays: ["monday", "thursday"],
  equipment: ["bodyweight", "one-dumbbell", "two-dumbbells"],
  goals: ["strength", "movement-speed"],
  developmentAreas: ["calves-ankles-feet", "shoulders-upper-back"],
  padelLimitations: ["slow-net-approach", "shoulder-fatigue"],
  painAreas: [],
  matches: [],
};
const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));

describe("session focus", () => {
  it.each([5, 10, 20])(
    "keeps calf/net-approach and shoulder work separate across weeks at %i minutes",
    (sessionDurationMinutes) => {
      const plan = generateTrainingPlan(
        { ...profile, sessionDurationMinutes },
        new Date(2026, 9, 26, 12),
      );
      for (const session of plan.sessions) {
        const lower = session.sourceWorkoutId === "generated-session-1";
        const main = session.workout.items.map((item) =>
          byId.get(item.exerciseId)!,
        );
        if (lower) {
          expect(
            main.every((exercise) => !exercise.bodyAreas.includes("shoulders")),
          ).toBe(true);
          expect(
            session.sections
              .flatMap((section) => section.items)
              .every(
                (item) =>
                  !byId.get(item.exerciseId)!.bodyAreas.includes("shoulders"),
              ),
          ).toBe(true);
        } else {
          expect(
            main.filter((exercise) =>
              exerciseMatchesDevelopmentArea(
                "shoulders-upper-back",
                exercise,
                sportExerciseProfiles.find((p) => p.exerciseId === exercise.id),
              ),
            ).length / main.length,
          ).toBeGreaterThanOrEqual(0.5);
        }
      }
    },
  );

  it.each([10, 20])(
    "does not fill a %i-minute calf model workout with unrelated shoulder exercises",
    (targetDurationMinutes) => {
      const result = compileModelWorkout({
        id: "calves",
        name: "Calf Strength and Split Step Reactivity",
        targetDurationMinutes,
        selectedExerciseIds: [
          "single-leg-calf-raise",
          "bent-knee-soleus-raise",
          "split-step-lateral-drive",
        ],
        profile,
        environment: {
          availableSetupRequirements: ["floor", "wall", "chair", "mat"],
          maximumSpace: "moderate",
          maximumNoise: "moderate",
        },
        exerciseCatalog: exercises,
      });
      expect(
        result.sections
          .flatMap((section) => section.items)
          .every(
            (item) =>
              !byId.get(item.exerciseId)!.bodyAreas.includes("shoulders"),
          ),
      ).toBe(true);
    },
  );

  it("prioritizes shoulder work throughout a shoulder session", () => {
    const workout = assembleMainWorkout({ profile, slot: 1 })!;
    expect(
      workout.items.every((item) =>
        exerciseMatchesDevelopmentArea(
          "shoulders-upper-back",
          byId.get(item.exerciseId)!,
          sportExerciseProfiles.find((p) => p.exerciseId === item.exerciseId),
        ),
      ),
    ).toBe(true);
  });
});

it("rejects a model selection that puts shoulder work in the calf slot", () => {
  expect(() =>
    compileModelPlanIntent({
      profile,
      adaptationProfile: defaultAdaptationProfile,
      today: new Date(2026, 9, 26, 12),
      model: "test-model",
      intent: {
        explanation: "Focused training",
        sessions: [
          {
            name: "Calf Strength and Split Step Reactivity",
            selectedExerciseIds: [
              "single-leg-calf-raise",
              "prone-foam-roller-overhead-shoulder-press",
            ],
          },
          {
            name: "Shoulder control",
            selectedExerciseIds: ["prone-y-raise", "scapular-push-up"],
          },
        ],
      },
    }),
  ).toThrow(/Session 1 contains exercises outside its assigned focus/);
});

it("still permits explicitly mixed assignments", () => {
  const workout = assembleMainWorkout({
    profile: { ...profile, sessionsPerWeek: 1 },
    slot: 0,
  })!;
  expect(
    workout.items.some((item) =>
      byId.get(item.exerciseId)!.bodyAreas.includes("legs"),
    ),
  ).toBe(true);
  expect(
    workout.items.some((item) =>
      byId.get(item.exerciseId)!.bodyAreas.includes("shoulders"),
    ),
  ).toBe(true);
});

it("can build a calf-focused plan for a non-padel profile", () => {
  const plan = generateTrainingPlan(
    {
      ...profile,
      sport: "other",
      sessionsPerWeek: 1,
      preferredDays: ["monday"],
      developmentAreas: ["calves-ankles-feet"],
      padelLimitations: [],
    },
    new Date(2026, 9, 26, 12),
  );
  expect(plan.sessions.length).toBeGreaterThan(0);
  expect(
    plan.sessions.every((session) =>
      session.workout.items.every(
        (item) => !byId.get(item.exerciseId)!.bodyAreas.includes("shoulders"),
      ),
    ),
  ).toBe(true);
});
