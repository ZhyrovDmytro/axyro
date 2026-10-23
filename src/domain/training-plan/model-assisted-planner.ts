import { exercises } from "@/content/exercises";
import { sportExerciseProfiles } from "@/content/sport-exercise-profiles";

import { compileModelWorkout } from "./compile-model-workout";
import { generateTrainingPlan } from "./generate-training-plan";
import type { ModelPlanIntent } from "./ai-planner.schema";
import {
  selectModelExerciseCandidates,
  type ModelCandidateEnvironment,
} from "./model-exercise-candidates";
import {
  assessTrainingPlanQuality,
  type PlanQualityReport,
} from "./plan-quality";
import {
  getPersonalizedSessionDescription,
  getPersonalizedSessionTitle,
  isLegacyOutcomeBasedSessionTitle,
} from "./personalized-session-title";
import {
  ATHLETE_PROFILE_VERSION,
  EXERCISE_CATALOG_VERSION,
  PLANNER_VERSION,
} from "./planner-versions";
import type { AdaptationProfile } from "./adaptation-profile";
import { questionnaireFocusForSlot } from "./questionnaire-context";
import type { AthleteProfile, TrainingPlan } from "./training-plan.types";

export const homePlannerEnvironment: ModelCandidateEnvironment = {
  availableSetupRequirements: ["floor", "wall", "chair", "mat"],
  maximumSpace: "moderate",
  maximumNoise: "moderate",
};

export function modelCandidatesForProfile(
  profile: AthleteProfile,
  adaptationProfile?: AdaptationProfile,
) {
  const avoided = new Set(adaptationProfile?.avoidExercises ?? []);
  return selectModelExerciseCandidates({
    profile,
    environment: homePlannerEnvironment,
    section: "main",
  }).filter((candidate) => !avoided.has(candidate.id));
}

export function compileModelPlanIntent({
  intent,
  profile,
  adaptationProfile,
  today,
  model,
}: {
  intent: ModelPlanIntent;
  profile: AthleteProfile;
  adaptationProfile: AdaptationProfile;
  today: Date;
  model: string;
}): { plan: TrainingPlan; quality: PlanQualityReport } {
  if (intent.sessions.length !== profile.sessionsPerWeek) {
    throw new Error(
      `Expected ${profile.sessionsPerWeek} weekly session selections, received ${intent.sessions.length}.`,
    );
  }
  const avoided = new Set(adaptationProfile.avoidExercises);
  const selectedAvoided = intent.sessions.flatMap((session) =>
    session.selectedExerciseIds.filter((exerciseId) => avoided.has(exerciseId)),
  );
  if (selectedAvoided.length > 0) {
    throw new Error(
      `The plan selected temporarily avoided exercises: ${[...new Set(selectedAvoided)].join(", ")}.`,
    );
  }

  const sourceWorkouts = intent.sessions.map((session, index) => {
    const compiled = compileModelWorkout({
      id: `model-session-${index + 1}`,
      name: session.name,
      targetDurationMinutes: profile.sessionDurationMinutes,
      selectedExerciseIds: session.selectedExerciseIds,
      profile,
      environment: homePlannerEnvironment,
      exerciseCatalog: exercises,
    }).workout;
    const personalizedWorkout = {
      ...compiled,
      name: isLegacyOutcomeBasedSessionTitle(compiled.name)
        ? getPersonalizedSessionTitle({
            profile,
            workout: compiled,
            exerciseCatalog: exercises,
            sportProfiles: sportExerciseProfiles,
          })
        : compiled.name,
      shortDescription: getPersonalizedSessionDescription({
        profile,
        workout: compiled,
        exerciseCatalog: exercises,
        sportProfiles: sportExerciseProfiles,
        preferredPadelPriorities: questionnaireFocusForSlot(profile, index)
          .padelPriorities,
        preferredDevelopmentAreas: questionnaireFocusForSlot(profile, index)
          .developmentAreas,
      }),
    };
    return {
      ...personalizedWorkout,
    };
  });
  const plan = generateTrainingPlan(profile, today, [], {
    sourceWorkouts,
    adaptationProfile,
    generation: {
      source: "openai",
      profileVersion: ATHLETE_PROFILE_VERSION,
      exerciseCatalogVersion: EXERCISE_CATALOG_VERSION,
      plannerVersion: PLANNER_VERSION,
      explanation: intent.explanation,
      model,
    },
  });
  const quality = assessTrainingPlanQuality({
    plan,
    exerciseCatalog: exercises,
    sportProfiles: sportExerciseProfiles,
    preferredExerciseIds: adaptationProfile.preferredExercises,
  });
  if (!quality.valid) {
    throw new Error(
      quality.hardErrors
        .map((error) => `${error.code}: ${error.message}`)
        .join(" "),
    );
  }
  return { plan, quality };
}
