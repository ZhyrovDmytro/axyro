"use client";

import {
  createBrowserUserStorage,
  userStorageChangedEvent,
} from "@/services/persistence/user-storage";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { SessionActivity } from "@/services/persistence/workout-activity-repository";

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
  const [history, setHistory] = useState<SessionActivity[]>([]);
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setHistory(
        serialized === null
          ? []
          : createBrowserWorkoutActivityRepository().getActivityHistory(
              currentDateKey,
            ),
      );
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [currentDateKey, serialized]);
  return history;
}
