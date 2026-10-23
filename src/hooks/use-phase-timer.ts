"use client";

import { useEffect, useRef, useState } from "react";

import {
  createPhaseClock,
  getRemainingMs,
  pausePhaseClock,
  resumePhaseClock,
  type PhaseClock,
} from "@/domain/session/phase-clock";

type UsePhaseTimerOptions = {
  phaseKey: number;
  durationSeconds: number;
  paused: boolean;
  enabled: boolean;
  onComplete: (completedAtMs: number, observedAtMs: number) => void;
  initialRemainingMs?: number;
  startedAtMs?: number;
};

export type PhaseTimerValue = {
  remainingMs: number;
  remainingSeconds: number;
};

export function usePhaseTimer({
  phaseKey,
  durationSeconds,
  paused,
  enabled,
  onComplete,
  initialRemainingMs,
  startedAtMs,
}: UsePhaseTimerOptions): PhaseTimerValue {
  const durationMs = durationSeconds * 1000;
  const firstRemainingMs = Math.min(
    initialRemainingMs ?? durationMs,
    durationMs,
  );
  const [display, setDisplay] = useState({
    phaseKey,
    remainingMs: firstRemainingMs,
    remainingSeconds: Math.ceil(firstRemainingMs / 1000),
  });
  const clockRef = useRef<PhaseClock | null>(null);
  const phaseKeyRef = useRef<number | null>(null);
  const completedPhaseRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const now = Date.now();
    if (phaseKeyRef.current !== phaseKey || clockRef.current === null) {
      const isInitialPhase = phaseKeyRef.current === null;
      phaseKeyRef.current = phaseKey;
      const initialMs = isInitialPhase ? firstRemainingMs : durationMs;
      clockRef.current = createPhaseClock(initialMs, startedAtMs ?? now);
      completedPhaseRef.current = null;
    }

    if (!enabled) return;

    if (paused) {
      clockRef.current = pausePhaseClock(clockRef.current, now);
      const timeoutId = window.setTimeout(() => {
        setDisplay({
          phaseKey,
          remainingMs: clockRef.current?.remainingMs ?? 0,
          remainingSeconds: Math.ceil(
            (clockRef.current?.remainingMs ?? 0) / 1000,
          ),
        });
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }

    clockRef.current = resumePhaseClock(clockRef.current, now);

    const tick = () => {
      if (!clockRef.current) return;
      const now = Date.now();
      const remainingMs = getRemainingMs(clockRef.current, now);
      setDisplay({
        phaseKey,
        remainingMs,
        remainingSeconds: Math.ceil(remainingMs / 1000),
      });

      if (remainingMs === 0 && completedPhaseRef.current !== phaseKey) {
        completedPhaseRef.current = phaseKey;
        onCompleteRef.current(clockRef.current.deadlineMs ?? now, now);
      }
    };

    const timeoutId = window.setTimeout(tick, 0);
    const intervalId = window.setInterval(tick, 100);
    document.addEventListener("visibilitychange", tick);
    return () => {
      document.removeEventListener("visibilitychange", tick);
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [durationMs, enabled, firstRemainingMs, paused, phaseKey, startedAtMs]);

  return display.phaseKey === phaseKey
    ? display
    : { remainingMs: durationMs, remainingSeconds: durationSeconds };
}
