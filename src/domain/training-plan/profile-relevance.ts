import type { BodyArea, Exercise } from "@/domain/exercise/exercise.types";
import type {
  MovementRole,
  SportExerciseProfile,
} from "@/domain/sport/sport-exercise-profile.types";

import type { AthleteProfile } from "./training-plan.types";

type DevelopmentArea = AthleteProfile["developmentAreas"][number];

const developmentAreaBodyAreas: Record<DevelopmentArea, readonly BodyArea[]> = {
  "shoulders-upper-back": ["shoulders", "back"],
  // Generic arm loading is not enough evidence for a grip/forearm claim.
  // This area must match a dedicated movement role below.
  "elbow-forearm-grip": [],
  "core-lower-back": ["core", "back"],
  "hips-glutes": ["glutes"],
  "knees-single-leg": [],
  "calves-ankles-feet": [],
};

const developmentAreaMovementRoles: Record<
  DevelopmentArea,
  readonly MovementRole[]
> = {
  "shoulders-upper-back": [
    "shoulder_stability",
    "scapular_control",
    "overhead_strength",
    "shoulder_mobility",
  ],
  "elbow-forearm-grip": ["grip_endurance", "forearm_rotation"],
  "core-lower-back": ["anti_rotation", "core_stability", "rotational_control"],
  "hips-glutes": [
    "hip_mobility",
    "hinge",
    "lunge",
    "lateral_push",
    "single_leg_strength",
  ],
  "knees-single-leg": [
    "single_leg_strength",
    "deceleration",
    "landing_control",
    "squat",
    "lunge",
  ],
  "calves-ankles-feet": [
    "calf_ankle_strength",
    "acceleration",
    "change_of_direction",
  ],
};

export function exerciseMatchesDevelopmentArea(
  area: DevelopmentArea,
  exercise: Pick<Exercise, "bodyAreas">,
  sportProfile: Pick<SportExerciseProfile, "movementRoles"> | undefined,
) {
  const bodyAreaMatch = developmentAreaBodyAreas[area].some((bodyArea) =>
    exercise.bodyAreas.includes(bodyArea),
  );
  const movementRoleMatch = developmentAreaMovementRoles[area].some((role) =>
    sportProfile?.movementRoles.includes(role),
  );
  return bodyAreaMatch || movementRoleMatch;
}

export function developmentAreaMatchCount(
  profile: AthleteProfile,
  exercise: Pick<Exercise, "bodyAreas">,
  sportProfile: Pick<SportExerciseProfile, "movementRoles"> | undefined,
) {
  return profile.developmentAreas.filter((area) =>
    exerciseMatchesDevelopmentArea(area, exercise, sportProfile),
  ).length;
}
