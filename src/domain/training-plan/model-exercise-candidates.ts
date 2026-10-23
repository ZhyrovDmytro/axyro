import { publishedExercises } from "@/content/exercises";
import { sportExerciseProfiles } from "@/content/sport-exercise-profiles";
import { isExercisePlanEligible } from "@/domain/content/catalog-quality";
import type {
  Exercise,
  ExerciseNoiseLevel,
  ExerciseSpaceRequirement,
  SessionSectionType,
  SetupRequirement,
} from "@/domain/exercise/exercise.types";
import type { SportExerciseProfile } from "@/domain/sport/sport-exercise-profile.types";
import { SESSION_TIMING } from "@/domain/workout/session-duration";

import type { AthleteProfile } from "./training-plan.types";
import { developmentAreaMatchCount } from "./profile-relevance";

const MAX_CANDIDATE_LIMIT = 100;
const DEFAULT_CANDIDATE_LIMIT = MAX_CANDIDATE_LIMIT;

const difficultyRank = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
} as const;

const spaceRank: Record<ExerciseSpaceRequirement, number> = {
  compact: 0,
  moderate: 1,
  large: 2,
};

const noiseRank: Record<ExerciseNoiseLevel, number> = {
  quiet: 0,
  moderate: 1,
  high: 2,
};

const goalQualities: Record<
  AthleteProfile["goals"][number],
  readonly string[]
> = {
  "movement-speed": ["mobility", "stability", "warm-up"],
  "court-endurance": ["endurance", "strength"],
  power: ["power", "explosiveness", "rotation"],
  strength: ["strength"],
  "injury-resilience": ["stability", "mobility", "strength"],
};

export type ModelCandidateEnvironment = {
  availableSetupRequirements: readonly SetupRequirement[];
  maximumSpace: ExerciseSpaceRequirement;
  maximumNoise: ExerciseNoiseLevel;
};

/**
 * Deliberately narrow model-facing projection. Canonical coaching copy and
 * media stay on the trusted application side of this boundary.
 */
export type ModelExerciseCandidate = {
  id: string;
  name: string;
  difficulty: Exercise["difficulty"];
  bodyAreas: Exercise["bodyAreas"];
  equipment: Exercise["equipment"];
  setupRequirements: Exercise["setupRequirements"];
  sectionRoles: Exercise["planning"]["sectionRoles"];
  movementPatterns: Exercise["planning"]["movementPatterns"];
  trainingQualities: Exercise["planning"]["trainingQualities"];
  timing: {
    workSeconds: Exercise["planning"]["safeWorkSeconds"];
    restSeconds: Exercise["planning"]["safeRestSeconds"];
    sideMode: Extract<
      Exercise["defaultPrescription"],
      { workDurationSeconds: number }
    >["sideMode"];
    cadenceMode: Extract<
      Exercise["defaultPrescription"],
      { workDurationSeconds: number }
    >["cadenceMode"];
  };
  sportContext?: {
    relevance: SportExerciseProfile["relevance"];
    trainingFunction: SportExerciseProfile["trainingFunction"];
    movementRoles: SportExerciseProfile["movementRoles"];
    problemsAddressed: SportExerciseProfile["problemsAddressed"];
  };
};

export type SelectModelExerciseCandidatesInput = {
  profile: AthleteProfile;
  availableTimeSeconds?: number;
  environment: ModelCandidateEnvironment;
  section?: SessionSectionType;
  limit?: number;
  exerciseCatalog?: readonly Exercise[];
  sportProfiles?: readonly SportExerciseProfile[];
};

function hasAvailableEquipment(exercise: Exercise, profile: AthleteProfile) {
  const available = new Set(profile.equipment);
  return exercise.equipment.every((equipment) => {
    if (equipment === "none") return true;
    if (equipment === "two_dumbbells") return available.has("two-dumbbells");
    return available.has("one-dumbbell") || available.has("two-dumbbells");
  });
}

function avoidsPain(exercise: Exercise, profile: AthleteProfile) {
  return exercise.planning.avoidForPainAreas.every(
    (area) => !profile.painAreas.includes(area),
  );
}

function fitsExperience(exercise: Exercise, profile: AthleteProfile) {
  return (
    difficultyRank[exercise.difficulty] <= difficultyRank[profile.experience]
  );
}

function fitsEnvironment(
  exercise: Exercise,
  environment: ModelCandidateEnvironment,
) {
  const availableSetup = new Set(environment.availableSetupRequirements);
  return (
    exercise.setupRequirements.every((item) => availableSetup.has(item)) &&
    spaceRank[exercise.planning.spaceRequirement] <=
      spaceRank[environment.maximumSpace] &&
    noiseRank[exercise.planning.noiseLevel] <=
      noiseRank[environment.maximumNoise]
  );
}

function minimumBlockSeconds(exercise: Exercise) {
  const defaults = exercise.defaultPrescription;
  const sideMode =
    "workDurationSeconds" in defaults ? defaults.sideMode : "simultaneous";
  const sideCount = sideMode === "separate" ? 2 : 1;
  return (
    SESSION_TIMING.initialReadySeconds +
    exercise.planning.safeWorkSeconds.min * sideCount +
    (sideMode === "separate" ? SESSION_TIMING.sideTransitionSeconds : 0) +
    exercise.planning.safeRestSeconds.min
  );
}

function modelTiming(exercise: Exercise): ModelExerciseCandidate["timing"] {
  const defaults = exercise.defaultPrescription;
  if ("workDurationSeconds" in defaults) {
    return {
      workSeconds: exercise.planning.safeWorkSeconds,
      restSeconds: exercise.planning.safeRestSeconds,
      sideMode: defaults.sideMode,
      cadenceMode: defaults.cadenceMode,
    };
  }

  return {
    workSeconds: exercise.planning.safeWorkSeconds,
    restSeconds: exercise.planning.safeRestSeconds,
    sideMode:
      exercise.laterality === "unilateral" ? "separate" : "simultaneous",
    cadenceMode: exercise.tempo.mode,
  };
}

function relevanceScore(
  exercise: Exercise,
  profile: AthleteProfile,
  sportProfile: SportExerciseProfile | undefined,
) {
  const desiredQualities = new Set(
    profile.goals.flatMap((goal) => goalQualities[goal]),
  );
  const qualityMatches = exercise.planning.trainingQualities.filter((quality) =>
    desiredQualities.has(quality),
  ).length;
  const limitationMatches = sportProfile
    ? sportProfile.problemsAddressed.filter((problem) =>
        profile.padelLimitations.includes(
          problem as AthleteProfile["padelLimitations"][number],
        ),
      ).length
    : 0;
  const developmentMatches = developmentAreaMatchCount(
    profile,
    exercise,
    sportProfile,
  );
  const sportRelevance = sportProfile
    ? { foundation: 1, high: 2, core: 3 }[sportProfile.relevance]
    : 0;
  return (
    qualityMatches * 5 +
    limitationMatches * 8 +
    developmentMatches * 6 +
    sportRelevance
  );
}

function toModelCandidate(
  exercise: Exercise,
  sportProfile: SportExerciseProfile | undefined,
): ModelExerciseCandidate {
  return {
    id: exercise.id,
    name: exercise.name,
    difficulty: exercise.difficulty,
    bodyAreas: exercise.bodyAreas,
    equipment: exercise.equipment,
    setupRequirements: exercise.setupRequirements,
    sectionRoles: exercise.planning.sectionRoles,
    movementPatterns: exercise.planning.movementPatterns,
    trainingQualities: exercise.planning.trainingQualities,
    timing: modelTiming(exercise),
    ...(sportProfile
      ? {
          sportContext: {
            relevance: sportProfile.relevance,
            trainingFunction: sportProfile.trainingFunction,
            movementRoles: sportProfile.movementRoles,
            problemsAddressed: sportProfile.problemsAddressed,
          },
        }
      : {}),
  };
}

/**
 * Applies hard safety/content constraints before bounded relevance retrieval.
 * The returned objects are safe to serialize into a model request; callers
 * must not replace them with the source Exercise objects.
 */
export function selectModelExerciseCandidates({
  profile,
  availableTimeSeconds = profile.sessionDurationMinutes * 60,
  environment,
  section = "main",
  limit = DEFAULT_CANDIDATE_LIMIT,
  exerciseCatalog = publishedExercises,
  sportProfiles = sportExerciseProfiles,
}: SelectModelExerciseCandidatesInput): ModelExerciseCandidate[] {
  const boundedLimit = Math.min(
    MAX_CANDIDATE_LIMIT,
    Math.max(1, Math.trunc(limit)),
  );
  const profileByExerciseId = new Map(
    sportProfiles
      .filter((candidate) => candidate.sport === profile.sport)
      .map((candidate) => [candidate.exerciseId, candidate]),
  );

  return exerciseCatalog
    .filter(
      (exercise) =>
        isExercisePlanEligible(exercise) &&
        exercise.planning.sectionRoles.includes(section) &&
        hasAvailableEquipment(exercise, profile) &&
        avoidsPain(exercise, profile) &&
        fitsExperience(exercise, profile) &&
        fitsEnvironment(exercise, environment) &&
        minimumBlockSeconds(exercise) <= availableTimeSeconds,
    )
    .map((exercise) => ({
      exercise,
      sportProfile: profileByExerciseId.get(exercise.id),
      score: relevanceScore(
        exercise,
        profile,
        profileByExerciseId.get(exercise.id),
      ),
    }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.exercise.id.localeCompare(right.exercise.id),
    )
    .slice(0, boundedLimit)
    .map(({ exercise, sportProfile }) =>
      toModelCandidate(exercise, sportProfile),
    );
}
