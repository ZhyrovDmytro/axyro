import type { TrainingPlan } from "@/domain/training-plan/training-plan.types";

export interface TrainingPlanRepository {
  load(): TrainingPlan | null;
  save(plan: TrainingPlan): TrainingPlan;
  clear(): void;
}
