import type { Exercise } from "@/domain/exercise/exercise.types";
import type { SportExerciseProfile } from "@/domain/sport/sport-exercise-profile.types";
import { exerciseMatchesDevelopmentArea } from "./profile-relevance";
import { questionnaireFocusForSlot } from "./questionnaire-context";
import type { AthleteProfile } from "./training-plan.types";

export function matchesSessionFocus(
  exercise: Exercise,
  sportProfile: SportExerciseProfile | undefined,
  profile: AthleteProfile,
  slot: number,
) {
  const focus = questionnaireFocusForSlot(profile, slot);
  if (!focus.developmentAreas.length && !focus.padelPriorities.length)
    return true;
  return (
    focus.developmentAreas.some((area) => {
      if (exerciseMatchesDevelopmentArea(area, exercise, sportProfile))
        return true;
      // Other sports have no movement-role profile yet; retain physical-region matching.
      if (sportProfile) return false;
      if (area === "calves-ankles-feet" || area === "knees-single-leg") {
        return exercise.bodyAreas.includes("legs");
      }
      return (
        area === "elbow-forearm-grip" && exercise.bodyAreas.includes("arms")
      );
    }) ||
    focus.padelPriorities.some((priority) =>
      sportProfile?.problemsAddressed.includes(priority),
    )
  );
}
