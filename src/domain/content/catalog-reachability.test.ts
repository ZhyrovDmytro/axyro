import { expect, it } from "vitest";
import { exercises } from "@/content/exercises";
import { isExercisePlanEligible } from "./catalog-quality";
import { selectModelExerciseCandidates } from "@/domain/training-plan/model-exercise-candidates";
import { representativeAthleteProfiles } from "@/domain/training-plan/evaluation-profiles";

function candidates(bodyweightOnly = false) {
  return new Set(
    (["warmup", "main", "cooldown"] as const).flatMap((section) =>
      selectModelExerciseCandidates({
        profile: {
          ...representativeAthleteProfiles[1],
          experience: "advanced",
          equipment: bodyweightOnly
            ? ["bodyweight"]
            : ["bodyweight", "one-dumbbell", "two-dumbbells"],
          painAreas: [],
        },
        section,
        limit: 40,
        environment: {
          availableSetupRequirements: ["floor", "mat", "wall", "chair"],
          maximumSpace: "large",
          maximumNoise: "high",
        },
      }).map((exercise) => exercise.id),
    ),
  );
}

it("keeps every curated exercise eligible and reachable in a planner section", () => {
  const reachable = candidates();
  expect(exercises).toHaveLength(40);
  for (const exercise of exercises) {
    expect(isExercisePlanEligible(exercise), exercise.id).toBe(true);
    expect(reachable.has(exercise.id), exercise.id).toBe(true);
  }
});

it("offers optional-weight exercises without requiring weights and excludes loaded exercises", () => {
  const reachable = candidates(true);
  const optional = exercises.filter(
    (exercise) => exercise.optionalEquipment?.length,
  );
  expect(optional).toHaveLength(6);
  for (const exercise of optional) {
    expect(exercise.equipment, exercise.id).toEqual(["none"]);
    expect(reachable.has(exercise.id), exercise.id).toBe(true);
  }
  for (const exercise of exercises.filter((exercise) =>
    exercise.equipment.some((item) => item !== "none"),
  )) {
    expect(reachable.has(exercise.id), exercise.id).toBe(false);
  }
});
