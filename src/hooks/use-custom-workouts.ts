"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import {
  parseCustomWorkouts,
  readCustomWorkouts,
} from "@/services/persistence/local-custom-workouts";
import { userStorageChangedEvent } from "@/services/persistence/user-storage";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(userStorageChangedEvent, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(userStorageChangedEvent, onChange);
  };
}

export function useCustomWorkouts() {
  const { user, loading } = useAuth();
  const userId = user?.id;
  const serialized = useSyncExternalStore(
    subscribe,
    () => (!loading && userId ? readCustomWorkouts(userId) : null),
    () => null,
  );
  return {
    workouts: useMemo(() => parseCustomWorkouts(serialized), [serialized]),
    ready: !loading,
    userId,
  };
}
