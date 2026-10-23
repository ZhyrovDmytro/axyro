"use client";

import {
  createBrowserUserStorage,
  userStorageChangedEvent,
} from "@/services/persistence/user-storage";
import { useMemo, useSyncExternalStore } from "react";

import {
  createBrowserWorkoutActivityRepository,
  workoutActivityChangedEvent,
  workoutActivityStorageKey,
} from "@/services/persistence/local-workout-activity-repository";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(userStorageChangedEvent, onStoreChange);
  window.addEventListener(workoutActivityChangedEvent, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(userStorageChangedEvent, onStoreChange);
    window.removeEventListener(workoutActivityChangedEvent, onStoreChange);
  };
}

function getSnapshot() {
  try {
    return (
      createBrowserUserStorage()?.getItem(workoutActivityStorageKey) ?? null
    );
  } catch {
    return null;
  }
}

export function useWorkoutActivityHistory(currentDateKey: string) {
  const serialized = useSyncExternalStore(subscribe, getSnapshot, () => null);
  return useMemo(
    () =>
      serialized === null
        ? []
        : createBrowserWorkoutActivityRepository().getActivityHistory(
            currentDateKey,
          ),
    [currentDateKey, serialized],
  );
}
