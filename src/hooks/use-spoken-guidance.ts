"use client";

import { useEffect, useRef } from "react";

import { getScheduledCue } from "@/domain/audio/cadence-scheduler";
import type { IntensityLevel } from "@/domain/workout/intensity";
import type { SessionStep } from "@/domain/workout/session-step.types";
import type { AudioCoach } from "@/services/audio/audio-coach";
import { createBrowserAudioCoach } from "@/services/audio/speech-synthesis-coach";

type SpokenGuidanceOptions = {
  step: SessionStep;
  phaseKey: number;
  remainingMs: number;
  paused: boolean;
  enabled: boolean;
  intensity: IntensityLevel;
  cadenceMultiplier?: number;
};

export function useSpokenGuidance({
  step,
  phaseKey,
  remainingMs,
  paused,
  enabled,
  intensity,
  cadenceMultiplier = 1,
}: SpokenGuidanceOptions): void {
  const coachRef = useRef<AudioCoach | null>(null);
  const lastCueKeyRef = useRef<string | null>(null);
  const lastPhaseKeyRef = useRef<number | null>(null);

  useEffect(() => {
    coachRef.current = createBrowserAudioCoach();
    return () => coachRef.current?.stop();
  }, []);

  useEffect(() => {
    const coach = coachRef.current;
    if (!coach) return;

    coach.setEnabled(enabled);
    if (!enabled || paused || step.type === "completed") {
      coach.stop();
      return;
    }

    if (lastPhaseKeyRef.current !== phaseKey) {
      coach.stop();
      lastPhaseKeyRef.current = phaseKey;
      lastCueKeyRef.current = null;
    }

    const cue = getScheduledCue(
      step,
      remainingMs,
      intensity,
      cadenceMultiplier,
    );
    if (!cue || cue.key === lastCueKeyRef.current) return;

    lastCueKeyRef.current = cue.key;
    coach.speak(cue.text, { rate: cue.rate });
  }, [
    cadenceMultiplier,
    enabled,
    intensity,
    paused,
    phaseKey,
    remainingMs,
    step,
  ]);
}
