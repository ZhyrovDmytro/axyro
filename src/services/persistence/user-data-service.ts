import {
  clearPlanDraft,
  createBrowserUserStorage,
  customWorkoutsStorageKey,
} from "./user-storage";
import { toDateKey } from "@/domain/training-plan/date";
import { activeWorkoutSessionStorageKey } from "./local-workout-session-repository";
import { preferencesStorageKey } from "./local-preferences-repository";
import { trainingPlanStorageKey } from "./local-training-plan-repository";
import { trainingProfileStorageKey } from "./local-training-profile-repository";
import { adaptationProfileStorageKey } from "./local-adaptation-profile-repository";
import {
  LocalWorkoutActivityRepository,
  workoutActivityStorageKey,
} from "./local-workout-activity-repository";
import type { StorageLike } from "./storage";

export const axyroUserDataStorageKeys = [
  trainingProfileStorageKey,
  trainingPlanStorageKey,
  workoutActivityStorageKey,
  activeWorkoutSessionStorageKey,
  preferencesStorageKey,
  adaptationProfileStorageKey,
  customWorkoutsStorageKey,
] as const;

function removeStorageKeys(storage: StorageLike, keys: readonly string[]) {
  let removedAll = true;
  for (const key of keys) {
    if (!storage.removeItem) {
      removedAll = false;
      continue;
    }
    try {
      storage.removeItem(key);
    } catch {
      removedAll = false;
    }
  }
  return removedAll;
}

export function resetTrainingPlanData(storage: StorageLike, now = new Date()) {
  new LocalWorkoutActivityRepository(storage).syncScheduledSessions(
    "reset-plan",
    [],
    toDateKey(now),
    now,
  );
  return removeStorageKeys(storage, [
    trainingPlanStorageKey,
    activeWorkoutSessionStorageKey,
  ]);
}

export function deleteAllUserData(storage: StorageLike) {
  return removeStorageKeys(storage, axyroUserDataStorageKeys);
}

export function exportUserData(storage: StorageLike): string {
  const data: Record<string, unknown> = {};
  for (const key of axyroUserDataStorageKeys) {
    const value = storage.getItem(key);
    if (value === null) continue;
    try {
      data[key] = JSON.parse(value);
    } catch {
      data[key] = value;
    }
  }
  return JSON.stringify({ version: 1, trainingData: data }, null, 2);
}

export function createBrowserUserDataService(userId: string | null) {
  let storage: StorageLike | null = null;
  try {
    storage = createBrowserUserStorage(userId);
  } catch {
    // Browser privacy settings can deny access to local storage entirely.
  }

  return {
    exportTrainingData() {
      if (!storage) throw new Error("Training data is unavailable");
      return exportUserData(storage);
    },
    resetTrainingPlan() {
      const draftCleared = clearPlanDraft(userId);
      return storage ? resetTrainingPlanData(storage) && draftCleared : false;
    },
    deleteAll() {
      const draftCleared = clearPlanDraft(userId);
      return storage ? deleteAllUserData(storage) && draftCleared : false;
    },
  };
}
