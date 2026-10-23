import { expect, it } from "vitest";
import { exercises } from "@/content/exercises";
import { starterWorkouts } from "@/content/workouts";
import { isExercisePlanEligible } from "./catalog-quality";
import { selectModelExerciseCandidates } from "@/domain/training-plan/model-exercise-candidates";
import { representativeAthleteProfiles } from "@/domain/training-plan/evaluation-profiles";

const ids = [
  "prone-foam-roller-overhead-shoulder-press",
  "prone-foam-roller-plate-internal-external-rotation",
  "single-arm-prone-plate-over-obstacle",
];
it("offers all three prone shoulder movements to bodyweight-only plans", () => {
  const candidates = selectModelExerciseCandidates({
    profile: {
      ...representativeAthleteProfiles[1],
      experience: "intermediate",
      equipment: ["bodyweight"],
      painAreas: [],
    },
    environment: {
      availableSetupRequirements: ["floor"],
      maximumSpace: "moderate",
      maximumNoise: "moderate",
    },
    section: "main",
    limit: 40,
  });
  for (const id of ids) {
    const exercise = exercises.find((item) => item.id === id)!;
    expect(isExercisePlanEligible(exercise), id).toBe(true);
    expect(exercise.equipment).toEqual(["none"]);
    expect(exercise.setupRequirements).toEqual(["floor"]);
    expect(
      [
        exercise.name,
        exercise.shortDescription,
        ...exercise.instructions,
        ...exercise.cues,
        ...exercise.commonMistakes,
      ].join(" "),
    ).not.toMatch(/foam.?roller|plate|obstacle/i);
    expect(exercise.instructions.join(" ")).toMatch(
      /optional.*dumbbell|dumbbell.*optional/i,
    );
    expect(
      candidates.some((candidate) => candidate.id === id),
      id,
    ).toBe(true);
  }
});
it("includes the movements in the public shoulder workout", () => {
  const shoulder = starterWorkouts.find(
    (workout) => workout.id === "padel-shoulder-overhead-durability",
  )!;
  expect(shoulder.items.map((item) => item.exerciseId)).toEqual(
    expect.arrayContaining(ids),
  );
  expect(exercises).toHaveLength(40);
});
