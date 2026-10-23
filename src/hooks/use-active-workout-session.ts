"use client";

import {
  createBrowserUserStorage,
  userStorageChangedEvent,
} from "@/services/persistence/user-storage";
import { useMemo, useSyncExternalStore } from "react";

import {
  activeWorkoutSessionStorageKey,
  createBrowserWorkoutSessionRepository,
} from "@/services/persistence/local-workout-session-repository";
import type { ActiveSessionLoadResult } from "@/services/persistence/workout-session-repository";

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(userStorageChangedEvent, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(userStorageChangedEvent, onStoreChange);
  };
}

function getSnapshot() {
  try {
    return (
      createBrowserUserStorage()?.getItem(activeWorkoutSessionStorageKey) ??
      null
    );
  } catch {
    return null;
  }
}

const serverSnapshot = "__server__";

export function useActiveWorkoutSession(): ActiveSessionLoadResult | null {
  const serialized = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => serverSnapshot,
  );
  return useMemo(
    () =>
      serialized === serverSnapshot
        ? null
        : serialized === null
          ? { kind: "none" as const }
          : createBrowserWorkoutSessionRepository().loadActive(),
    [serialized],
  );
}
