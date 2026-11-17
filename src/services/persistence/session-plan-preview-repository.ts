import { trainingPlanSchema } from "@/domain/training-plan/training-plan.schema";
import type { TrainingPlan } from "@/domain/training-plan/training-plan.types";
import type { StorageLike } from "./storage";

export function createPlanPreviewRepository(
  userId: string,
  storage: StorageLike | null,
) {
  const key = `veyro.plan-draft.${userId}.preview`;
  return {
    load(): TrainingPlan | null {
      try {
        const parsed = trainingPlanSchema.safeParse(
          JSON.parse(storage?.getItem(key) ?? "null"),
        );
        return parsed.success ? parsed.data : null;
      } catch {
        return null;
      }
    },
    save(plan: TrainingPlan): boolean {
      const serialized = JSON.stringify(trainingPlanSchema.parse(plan));
      try {
        if (!storage) return false;
        storage.setItem(key, serialized);
        return true;
      } catch {
        return false;
      }
    },
  };
}

export function createBrowserPlanPreviewRepository(userId: string) {
  let storage: StorageLike | null = null;
  try {
    storage = window.sessionStorage;
  } catch {
    /* Report unavailable storage when saving. */
  }
  return createPlanPreviewRepository(userId, storage);
}
