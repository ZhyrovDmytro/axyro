import type { TrainingPlan } from "@/domain/training-plan/training-plan.types";
import type { WorkoutFeedbackEvent } from "@/services/persistence/workout-activity-repository";

import { generateTrainingPlan } from "./generate-training-plan";

export type TrainingPlanContinuityState = "ACTIVE" | "PLAN_COMPLETE";

export function getTrainingPlanContinuityState(
  plan: Pick<TrainingPlan, "endDate">,
  currentDateKey: string,
): TrainingPlanContinuityState {
  return currentDateKey > plan.endDate ? "PLAN_COMPLETE" : "ACTIVE";
}

export function buildNextTrainingPlan({
  previousPlan,
  now,
  recentFeedback,
  keepPainExclusions,
}: {
  previousPlan: TrainingPlan;
  now: Date;
  recentFeedback: readonly WorkoutFeedbackEvent[];
  keepPainExclusions: boolean;
}) {
  return generateTrainingPlan(
    {
      ...previousPlan.profile,
      painAreas: keepPainExclusions ? previousPlan.profile.painAreas : [],
      matches: [],
    },
    now,
    recentFeedback,
  );
}
