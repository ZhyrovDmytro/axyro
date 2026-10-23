"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { IntensityLevel } from "@/domain/workout/intensity";
import { createBrowserPreferencesRepository } from "@/services/persistence/local-preferences-repository";
import {
  defaultUserPreferences,
  type PreferencesRepository,
} from "@/services/persistence/preferences-repository";

type UseUserPreferencesOptions = {
  sessionIntensity?: IntensityLevel;
};

export function useUserPreferences({
  sessionIntensity,
}: UseUserPreferencesOptions = {}) {
  const repository = useRef<PreferencesRepository | null>(null);
  const [preferences, setPreferences] = useState(defaultUserPreferences);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const currentRepository = createBrowserPreferencesRepository();
    repository.current = currentRepository;
    let active = true;
    const timeout = window.setTimeout(() => {
      const stored = currentRepository.load();
      const current = sessionIntensity
        ? currentRepository.save({ preferredIntensity: sessionIntensity })
        : stored;

      if (active) {
        setPreferences(current);
        setReady(true);
      }
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [sessionIntensity]);

  const setAudioEnabled = useCallback((audioEnabled: boolean) => {
    setPreferences((current) => ({ ...current, audioEnabled }));
    repository.current?.save({ audioEnabled });
  }, []);

  const setPreferredIntensity = useCallback(
    (preferredIntensity: IntensityLevel) => {
      setPreferences((current) => ({ ...current, preferredIntensity }));
      repository.current?.save({ preferredIntensity });
    },
    [],
  );

  const setGuidanceCadence = useCallback(
    (guidanceCadence: "slower" | "normal" | "faster") => {
      setPreferences((current) => ({ ...current, guidanceCadence }));
      repository.current?.save({ guidanceCadence });
    },
    [],
  );

  const setKeepScreenAwake = useCallback((keepScreenAwake: boolean) => {
    setPreferences((current) => ({ ...current, keepScreenAwake }));
    repository.current?.save({ keepScreenAwake });
  }, []);

  return {
    ...preferences,
    ready,
    setAudioEnabled,
    setGuidanceCadence,
    setKeepScreenAwake,
    setPreferredIntensity,
  };
}
