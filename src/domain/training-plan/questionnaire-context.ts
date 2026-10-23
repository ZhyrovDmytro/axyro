import type { Exercise } from "@/domain/exercise/exercise.types";
import type { SportExerciseProfile } from "@/domain/sport/sport-exercise-profile.types";

import {
  padelCapacityLimitationValues,
  padelMovementLimitationValues,
  padelPowerLimitationValues,
} from "./training-plan.schema";
import type { AthleteProfile } from "./training-plan.types";
import { exerciseMatchesDevelopmentArea } from "./profile-relevance";
import { TRAINING_PLAN_DURATION_DAYS } from "./progression";

type QuestionnaireOption<T extends string> = {
  value: T;
  label: string;
  description: string;
};

export const goalOptions: Array<
  QuestionnaireOption<AthleteProfile["goals"][number]>
> = [
  {
    value: "movement-speed",
    label: "Move faster and better",
    description: "Improve acceleration, braking, balance and movement control.",
  },
  {
    value: "court-endurance",
    label: "Last longer on court",
    description: "Maintain movement quality and repeat efforts for longer.",
  },
  {
    value: "power",
    label: "Build explosive power",
    description: "Produce force quickly through the legs, hips and trunk.",
  },
  {
    value: "strength",
    label: "Get stronger",
    description: "Build useful whole-body strength for athletic movement.",
  },
  {
    value: "injury-resilience",
    label: "Build resilience",
    description: "Develop controlled strength, mobility and stability.",
  },
];

export const padelMovementOptions: Array<
  QuestionnaireOption<(typeof padelMovementLimitationValues)[number]>
> = [
  {
    value: "slow-net-approach",
    label: "Reach the net faster",
    description: "Accelerate forward and arrive balanced after a short ball.",
  },
  {
    value: "slow-lob-recovery",
    label: "Recover back for lobs",
    description: "Turn, move back and regain position with control.",
  },
  {
    value: "late-split-step",
    label: "React sooner from the split step",
    description: "Start toward the ball earlier in any direction.",
  },
  {
    value: "slow-lateral-movement",
    label: "Move faster side to side",
    description: "Cover the width of the court with more speed and control.",
  },
  {
    value: "poor-deceleration",
    label: "Stop and change direction better",
    description: "Keep control while braking, turning and accelerating again.",
  },
];

export const padelPowerOptions: Array<
  QuestionnaireOption<(typeof padelPowerLimitationValues)[number]>
> = [
  {
    value: "limited-bandeja-vibora-rotation",
    label: "Rotate better on bandejas and víboras",
    description: "Coordinate hips, trunk and shoulder through overhead shots.",
  },
  {
    value: "weak-overhead-power",
    label: "Build stronger, controlled overheads",
    description: "Develop force and control for smashes, bandejas and víboras.",
  },
  {
    value: "unstable-volleys",
    label: "Build more stable volleys",
    description: "Stay firm through the trunk, shoulder and racket at the net.",
  },
  {
    value: "weak-grip",
    label: "Improve grip and racket control",
    description:
      "Build hand and forearm capacity for repeated racket handling.",
  },
  {
    value: "side-to-side-imbalance",
    label: "Reduce side-to-side imbalance",
    description: "Develop more even strength and control on both sides.",
  },
];

export const padelCapacityOptions: Array<
  QuestionnaireOption<(typeof padelCapacityLimitationValues)[number]>
> = [
  {
    value: "shoulder-fatigue",
    label: "Build overhead shoulder endurance",
    description: "Maintain control through repeated overhead actions.",
  },
  {
    value: "limited-overhead-mobility",
    label: "Improve overhead reach",
    description: "Develop comfortable shoulder and upper-back mobility.",
  },
  {
    value: "poor-single-leg-balance",
    label: "Improve single-leg balance",
    description: "Stay stable while reaching, braking or hitting on one leg.",
  },
  {
    value: "match-endurance",
    label: "Maintain energy deeper into matches",
    description: "Preserve movement quality during later games and sets.",
  },
  {
    value: "difficulty-low-balls",
    label: "Move better to low balls",
    description: "Build strength and mobility for getting down and back up.",
  },
];

export const padelLimitationOptions: Array<
  QuestionnaireOption<AthleteProfile["padelLimitations"][number]>
> = [
  ...padelMovementOptions,
  ...padelPowerOptions,
  ...padelCapacityOptions,
  {
    value: "weak-core-rotation",
    label: "Build rotational control",
    description: "Develop controlled force transfer through the trunk.",
  },
  {
    value: "slow-first-step",
    label: "Improve the first step",
    description: "Accelerate sooner toward the next ball.",
  },
  {
    value: "slow-return-to-position",
    label: "Recover position faster",
    description: "Regain a balanced court position after each movement.",
  },
  {
    value: "weak-overhead-control",
    label: "Improve overhead control",
    description: "Build stable shoulder and trunk control overhead.",
  },
];

export const developmentAreaOptions: Array<
  QuestionnaireOption<AthleteProfile["developmentAreas"][number]>
> = [
  {
    value: "shoulders-upper-back",
    label: "Shoulders and upper back",
    description: "Overhead strength, shoulder-blade control and endurance.",
  },
  {
    value: "elbow-forearm-grip",
    label: "Elbow, forearm and grip",
    description: "Racket control and forearm capacity.",
  },
  {
    value: "core-lower-back",
    label: "Core and lower back",
    description: "Rotation, bracing and trunk control.",
  },
  {
    value: "hips-glutes",
    label: "Hips and glutes",
    description: "Low positions, rotation and lateral push-off.",
  },
  {
    value: "knees-single-leg",
    label: "Knees and single-leg control",
    description: "Brake, change direction and reach with more stability.",
  },
  {
    value: "calves-ankles-feet",
    label: "Calves, ankles and feet",
    description: "First-step push-off, balance and repeated court movement.",
  },
];

export const painOptions: Array<{
  value: AthleteProfile["painAreas"][number];
  label: string;
}> = [
  { value: "shoulder", label: "Shoulder" },
  { value: "elbow-forearm", label: "Elbow or forearm" },
  { value: "wrist-hand", label: "Wrist or hand" },
  { value: "neck-upper-back", label: "Neck or upper back" },
  { value: "lower-back", label: "Lower back" },
  { value: "hip-groin", label: "Hip or groin" },
  { value: "knee", label: "Knee" },
  { value: "calf-achilles", label: "Calf or Achilles" },
  { value: "ankle-foot", label: "Ankle or foot" },
];

function selectedOptions<T extends string>(
  selected: readonly T[],
  options: readonly QuestionnaireOption<T>[],
) {
  const selectedSet = new Set(selected);
  return options
    .filter((option) => selectedSet.has(option.value))
    .map(({ value: id, label, description }) => ({ id, label, description }));
}

export function buildQuestionnaireContext(profile: AthleteProfile) {
  const movement = new Set<string>(padelMovementLimitationValues);
  const power = new Set<string>(padelPowerLimitationValues);
  const capacity = new Set<string>(padelCapacityLimitationValues);
  return {
    sport: {
      id: profile.sport,
      label: profile.sport === "padel" ? "Padel" : "General training",
    },
    experience: {
      id: profile.experience,
      label: {
        beginner: "I’m just starting",
        intermediate: "I have some experience",
        advanced: "I’m experienced",
      }[profile.experience],
    },
    schedule: {
      sessionsPerWeek: profile.sessionsPerWeek,
      sessionDurationMinutes: profile.sessionDurationMinutes,
      preferredDays: profile.preferredDays,
      planDurationDays: TRAINING_PLAN_DURATION_DAYS,
    },
    equipment: profile.equipment.map((id) => ({
      id,
      label: {
        bodyweight: "Bodyweight",
        "one-dumbbell": "One dumbbell",
        "two-dumbbells": "Two dumbbells",
      }[id],
    })),
    goals: selectedOptions(profile.goals, goalOptions),
    physicalDevelopmentAreas: selectedOptions(
      profile.developmentAreas,
      developmentAreaOptions,
    ),
    padelPriorities: {
      movement: selectedOptions(
        profile.padelLimitations.filter((id) => movement.has(id)),
        padelLimitationOptions,
      ),
      powerAndControl: selectedOptions(
        profile.padelLimitations.filter((id) => power.has(id)),
        padelLimitationOptions,
      ),
      mobilityAndCapacity: selectedOptions(
        profile.padelLimitations.filter((id) => capacity.has(id)),
        padelLimitationOptions,
      ),
      legacy: selectedOptions(
        profile.padelLimitations.filter(
          (id) => !movement.has(id) && !power.has(id) && !capacity.has(id),
        ),
        padelLimitationOptions,
      ),
    },
    safetyExclusions: profile.painAreas.map((id) => ({
      id,
      label: painOptions.find((option) => option.value === id)?.label ?? id,
    })),
    matches: profile.matches,
  };
}

export function questionnaireFocusForSlot(
  profile: AthleteProfile,
  slot: number,
) {
  const developmentAreas = profile.developmentAreas.filter(
    (_, index) => index % profile.sessionsPerWeek === slot,
  );
  const padelPriorities = profile.padelLimitations.filter(
    (_, index) => index % profile.sessionsPerWeek === slot,
  );
  return {
    developmentAreas,
    padelPriorities,
    labels: [
      ...selectedOptions(developmentAreas, developmentAreaOptions).map(
        (option) => option.label,
      ),
      ...selectedOptions(padelPriorities, padelLimitationOptions).map(
        (option) => option.label,
      ),
    ],
  };
}

export function matchedQuestionnaireFocus({
  profile,
  exercises,
  sportProfiles,
}: {
  profile: AthleteProfile;
  exercises: readonly Exercise[];
  sportProfiles: readonly SportExerciseProfile[];
}) {
  const profileByExerciseId = new Map(
    sportProfiles
      .filter((item) => item.sport === profile.sport)
      .map((item) => [item.exerciseId, item]),
  );
  const developmentAreas = profile.developmentAreas.filter((area) =>
    exercises.some((exercise) =>
      exerciseMatchesDevelopmentArea(
        area,
        exercise,
        profileByExerciseId.get(exercise.id),
      ),
    ),
  );
  const padelPriorities = profile.padelLimitations.filter((priority) =>
    exercises.some((exercise) =>
      profileByExerciseId
        .get(exercise.id)
        ?.problemsAddressed.includes(priority),
    ),
  );
  return {
    developmentAreas: selectedOptions(developmentAreas, developmentAreaOptions),
    padelPriorities: selectedOptions(padelPriorities, padelLimitationOptions),
  };
}
