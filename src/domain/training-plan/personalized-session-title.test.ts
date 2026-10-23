import { describe, expect, it } from "vitest";

import { exercises } from "@/content/exercises";
import { sportExerciseProfiles } from "@/content/sport-exercise-profiles";
import { workouts } from "@/content/workouts";
import type { Workout } from "@/domain/workout/workout.types";

import type { AthleteProfile } from "./training-plan.types";
import {
  getPersonalizedSessionDescription,
  getPersonalizedSessionTitle,
} from "./personalized-session-title";

const profile: AthleteProfile = {
  sport: "padel",
  experience: "intermediate",
  sessionsPerWeek: 3,
  sessionDurationMinutes: 20,
  preferredDays: ["monday", "wednesday", "friday"],
  equipment: ["bodyweight", "one-dumbbell"],
  goals: ["strength", "injury-resilience"],
  developmentAreas: ["shoulders-upper-back", "elbow-forearm-grip"],
  padelLimitations: ["limited-bandeja-vibora-rotation", "weak-grip"],
  painAreas: [],
  matches: [],
};

describe("getPersonalizedSessionTitle", () => {
  const source = workouts.find((workout) => workout.items.length > 0)!;
  const workoutWith = (exerciseId: string): Workout => ({
    ...source,
    focus: ["strength", "stability"],
    items: [{ ...source.items[0], id: `test-${exerciseId}`, exerciseId }],
  });

  it("names sessions after their physical training content", () => {
    expect(
      getPersonalizedSessionTitle({
        profile,
        workout: workoutWith("standing-dumbbell-wood-chop"),
        exerciseCatalog: exercises,
        sportProfiles: sportExerciseProfiles,
      }),
    ).toBe("Strength & Stability");
    expect(
      getPersonalizedSessionTitle({
        profile,
        workout: workoutWith("dumbbell-wrist-extension"),
        exerciseCatalog: exercises,
        sportProfiles: sportExerciseProfiles,
      }),
    ).toBe("Strength & Stability");
  });

  it("describes matched questionnaire outcomes as supporting benefits", () => {
    expect(
      getPersonalizedSessionDescription({
        profile,
        workout: workoutWith("standing-dumbbell-wood-chop"),
        exerciseCatalog: exercises,
        sportProfiles: sportExerciseProfiles,
      }),
    ).toBe("Supports stronger bandeja and víbora rotation.");
    expect(
      getPersonalizedSessionDescription({
        profile,
        workout: workoutWith("dumbbell-wrist-extension"),
        exerciseCatalog: exercises,
        sportProfiles: sportExerciseProfiles,
      }),
    ).toBe("Supports steadier racket control.");
  });

  it("shows only the first supported outcome when several match", () => {
    const multiOutcomeWorkout: Workout = {
      ...source,
      focus: ["mobility", "stability"],
      items: [
        {
          ...source.items[0],
          id: "test-acceleration",
          exerciseId: "split-stance-acceleration-march",
        },
        {
          ...source.items[0],
          id: "test-rotation",
          exerciseId: "standing-dumbbell-wood-chop",
        },
      ],
    };
    const manyPriorities: AthleteProfile = {
      ...profile,
      padelLimitations: [
        "slow-net-approach",
        "limited-bandeja-vibora-rotation",
        "weak-overhead-power",
      ],
    };

    expect(
      getPersonalizedSessionDescription({
        profile: manyPriorities,
        workout: multiOutcomeWorkout,
        exerciseCatalog: exercises,
        sportProfiles: sportExerciseProfiles,
      }),
    ).toBe("Supports faster, controlled net approaches.");

    expect(
      getPersonalizedSessionDescription({
        profile: manyPriorities,
        workout: multiOutcomeWorkout,
        exerciseCatalog: exercises,
        sportProfiles: sportExerciseProfiles,
        preferredPadelPriorities: [
          "slow-net-approach",
          "limited-bandeja-vibora-rotation",
        ],
        outcomeIndex: 1,
      }),
    ).toBe("Supports stronger bandeja and víbora rotation.");
  });

  it("keeps a content-derived title when no selected outcome is trained", () => {
    expect(
      getPersonalizedSessionTitle({
        profile: { ...profile, developmentAreas: [], padelLimitations: [] },
        workout: {
          ...workoutWith("bodyweight-squat"),
          focus: ["power", "stability"],
        },
        exerciseCatalog: exercises,
        sportProfiles: sportExerciseProfiles,
      }),
    ).toBe("Power & Stability");
  });

  it("uses the actual training qualities when an assigned focus is not trained", () => {
    expect(
      getPersonalizedSessionDescription({
        profile,
        workout: {
          ...workoutWith("bodyweight-squat"),
          focus: ["power", "stability"],
        },
        exerciseCatalog: exercises,
        sportProfiles: sportExerciseProfiles,
        preferredPadelPriorities: ["weak-grip"],
        preferredDevelopmentAreas: ["elbow-forearm-grip"],
      }),
    ).toBe("Develops power and stability.");
  });
});
