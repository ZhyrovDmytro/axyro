import { formatTrainingTitle } from "@/domain/workout/training-title";
import type { Exercise } from "@/domain/exercise/exercise.types";
import type { SportExerciseProfile } from "@/domain/sport/sport-exercise-profile.types";
import type { Workout } from "@/domain/workout/workout.types";

import { exerciseMatchesDevelopmentArea } from "./profile-relevance";
import { matchedQuestionnaireFocus } from "./questionnaire-context";
import type { AthleteProfile } from "./training-plan.types";

const legacyDevelopmentTitles = new Set([
  "Shoulder & upper-back strength",
  "Grip & forearm capacity",
  "Core & lower-back control",
  "Hip & glute strength",
  "Knee & single-leg control",
  "Calf, ankle & foot strength",
]);

const legacyPriorityTitles = new Set([
  "Net-approach acceleration",
  "Lob recovery speed",
  "Split-step reaction",
  "Lateral court speed",
  "Braking & direction change",
  "Bandeja & víbora rotation",
  "Overhead power & control",
  "Volley stability",
  "Grip & racket control",
  "Left-right balance",
  "Overhead mobility",
  "Overhead shoulder endurance",
  "Single-leg balance",
  "Late-match endurance",
  "Low-ball strength & mobility",
  "Rotational core control",
  "First-step speed",
  "Court-position recovery",
  "Overhead control",
]);

export function isLegacyOutcomeBasedSessionTitle(title: string) {
  const parts = title.split(" + ");
  return (
    parts.length > 0 &&
    parts.every(
      (part) =>
        legacyPriorityTitles.has(part) || legacyDevelopmentTitles.has(part),
    )
  );
}

const priorityOutcomeDescriptions: Record<
  AthleteProfile["padelLimitations"][number],
  string
> = {
  "slow-net-approach": "faster, controlled net approaches",
  "slow-lob-recovery": "quicker lob recovery",
  "late-split-step": "earlier split-step reactions",
  "slow-lateral-movement": "faster lateral movement",
  "poor-deceleration": "controlled braking and direction changes",
  "limited-bandeja-vibora-rotation": "stronger bandeja and víbora rotation",
  "weak-overhead-power": "stronger, controlled overheads",
  "unstable-volleys": "more stable volleys",
  "weak-grip": "steadier racket control",
  "side-to-side-imbalance": "more even side-to-side control",
  "limited-overhead-mobility": "more comfortable overhead reach",
  "shoulder-fatigue": "better overhead endurance",
  "poor-single-leg-balance": "steadier single-leg movement",
  "match-endurance": "better late-match movement",
  "difficulty-low-balls": "stronger low-ball movement",
  "weak-core-rotation": "more controlled trunk rotation",
  "slow-first-step": "a quicker first step",
  "slow-return-to-position": "faster court-position recovery",
  "weak-overhead-control": "steadier overhead control",
};

const developmentAreaDescriptions: Record<
  AthleteProfile["developmentAreas"][number],
  string
> = {
  "shoulders-upper-back": "Builds shoulder and upper-back strength.",
  "elbow-forearm-grip": "Builds grip and forearm capacity.",
  "core-lower-back": "Builds core and lower-back control.",
  "hips-glutes": "Builds hip and glute strength.",
  "knees-single-leg": "Builds knee and single-leg control.",
  "calves-ankles-feet": "Builds calf, ankle and foot strength.",
};

const priorityTitles: Record<
  AthleteProfile["padelLimitations"][number],
  string
> = {
  "slow-net-approach": "Quicker net approaches",
  "slow-lob-recovery": "Quicker recovery after lobs",
  "late-split-step": "Better split-step preparation",
  "slow-lateral-movement": "Faster lateral court movement",
  "poor-deceleration": "Better braking and direction changes",
  "limited-bandeja-vibora-rotation": "Stronger bandeja and víbora rotation",
  "weak-overhead-power": "More powerful overheads",
  "unstable-volleys": "More stable volleys",
  "weak-grip": "Steadier racket control",
  "side-to-side-imbalance": "Better balance on both sides",
  "limited-overhead-mobility": "More comfortable overhead reach",
  "shoulder-fatigue": "Better overhead endurance",
  "poor-single-leg-balance": "Better single-leg balance",
  "match-endurance": "Stronger late-match movement",
  "difficulty-low-balls": "Stronger low-ball movement",
  "weak-core-rotation": "Better rotational control",
  "slow-first-step": "A quicker first step",
  "slow-return-to-position": "Quicker recovery to court position",
  "weak-overhead-control": "Better overhead control",
};

export function getPersonalizedSessionTitle({
  profile,
  workout,
  exerciseCatalog,
  sportProfiles,
  preferredPadelPriorities = profile.padelLimitations,
  preferredDevelopmentAreas = profile.developmentAreas,
}: {
  profile: AthleteProfile;
  workout: Workout;
  exerciseCatalog: readonly Exercise[];
  sportProfiles: readonly SportExerciseProfile[];
  preferredPadelPriorities?: readonly AthleteProfile["padelLimitations"][number][];
  preferredDevelopmentAreas?: readonly AthleteProfile["developmentAreas"][number][];
}) {
  const totalWork = workout.items.reduce(
    (total, item) =>
      total +
      item.sets *
        item.prescription.durationSeconds *
        (item.prescription.perSide ? 2 : 1),
    0,
  );
  const matchingWork = (
    matches: (
      exercise: Exercise,
      sportProfile: SportExerciseProfile | undefined,
    ) => boolean,
  ) =>
    workout.items.reduce((total, item) => {
      const exercise = exerciseCatalog.find(
        (candidate) => candidate.id === item.exerciseId,
      );
      const sportProfile = sportProfiles.find(
        (candidate) =>
          candidate.exerciseId === item.exerciseId &&
          candidate.sport === profile.sport,
      );
      return (
        total +
        (exercise && matches(exercise, sportProfile)
          ? item.sets *
            item.prescription.durationSeconds *
            (item.prescription.perSide ? 2 : 1)
          : 0)
      );
    }, 0);
  // An accessory alone must not name an otherwise general session.
  if (totalWork > 0) {
    const priority = preferredPadelPriorities
      .map((id) => ({
        id,
        work: matchingWork((_, sportProfile) =>
          Boolean(sportProfile?.problemsAddressed.includes(id)),
        ),
      }))
      .sort((a, b) => b.work - a.work)[0];
    const priorityHasCoreWork =
      priority &&
      workout.items.some(
        (item) =>
          item.role === "core" &&
          sportProfiles.some(
            (candidate) =>
              candidate.exerciseId === item.exerciseId &&
              candidate.sport === profile.sport &&
              candidate.problemsAddressed.includes(priority.id),
          ),
      );
    if (
      priority &&
      (priority.work >= totalWork / 2 ||
        (priorityHasCoreWork && priority.work >= totalWork / 5))
    ) {
      return priorityTitles[priority.id];
    }
    const area = preferredDevelopmentAreas
      .map((id) => ({
        id,
        work: matchingWork((exercise, sportProfile) =>
          exerciseMatchesDevelopmentArea(id, exercise, sportProfile),
        ),
      }))
      .sort((a, b) => b.work - a.work)[0];
    if (area && area.work >= totalWork / 2) {
      return developmentAreaDescriptions[area.id]
        .replace(/^Builds /, "")
        .replace(/\.$/, "")
        .replace(/^./, (letter) => letter.toUpperCase());
    }
  }
  return formatTrainingTitle(workout.focus);
}

export function getPersonalizedSessionDescription({
  profile,
  workout,
  exerciseCatalog,
  sportProfiles,
  preferredPadelPriorities,
  preferredDevelopmentAreas,
  outcomeIndex = 0,
}: {
  profile: AthleteProfile;
  workout: Workout;
  exerciseCatalog: readonly Exercise[];
  sportProfiles: readonly SportExerciseProfile[];
  preferredPadelPriorities?: readonly AthleteProfile["padelLimitations"][number][];
  preferredDevelopmentAreas?: readonly AthleteProfile["developmentAreas"][number][];
  outcomeIndex?: number;
}) {
  const exerciseById = new Map(
    exerciseCatalog.map((exercise) => [exercise.id, exercise]),
  );
  const focus = matchedQuestionnaireFocus({
    profile,
    exercises: workout.items.flatMap((item) => {
      const exercise = exerciseById.get(item.exerciseId);
      return exercise ? [exercise] : [];
    }),
    sportProfiles,
  });
  const matchedPriorityIds = new Set(
    focus.padelPriorities.map((priority) => priority.id),
  );
  const matchedDevelopmentAreaIds = new Set(
    focus.developmentAreas.map((area) => area.id),
  );
  const preferredPriorityMatches = (preferredPadelPriorities ?? []).filter(
    (priority) => matchedPriorityIds.has(priority),
  );
  const preferredDevelopmentMatches = (preferredDevelopmentAreas ?? []).filter(
    (area) => matchedDevelopmentAreaIds.has(area),
  );
  const assignedDescriptions = Array.from(
    {
      length: Math.max(
        preferredPriorityMatches.length,
        preferredDevelopmentMatches.length,
      ),
    },
    (_, index) => [
      preferredPriorityMatches[index]
        ? `Supports ${priorityOutcomeDescriptions[preferredPriorityMatches[index]]}.`
        : null,
      preferredDevelopmentMatches[index]
        ? developmentAreaDescriptions[preferredDevelopmentMatches[index]]
        : null,
    ],
  ).flatMap((descriptions) =>
    descriptions.filter((description): description is string =>
      Boolean(description),
    ),
  );
  if (assignedDescriptions.length > 0) {
    return assignedDescriptions[outcomeIndex % assignedDescriptions.length];
  }
  const hasAssignedFocus =
    preferredPadelPriorities !== undefined ||
    preferredDevelopmentAreas !== undefined;
  if (hasAssignedFocus) {
    const trainingFocus = formatTrainingTitle(workout.focus)
      .toLocaleLowerCase("en")
      .replace(" & ", " and ");
    return `Develops ${trainingFocus}.`;
  }
  const primaryOutcome = focus.padelPriorities[0];
  return primaryOutcome
    ? `Supports ${priorityOutcomeDescriptions[primaryOutcome.id]}.`
    : "Built for your goals and equipment.";
}
