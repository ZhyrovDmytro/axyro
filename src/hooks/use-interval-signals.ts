"use client";
import { useEffect, useRef } from "react";
import { buildIntervalSignals } from "@/domain/audio/interval-signals";
import type { SessionStep } from "@/domain/workout/session-step.types";
import { IntervalSignalCoach } from "@/services/audio/interval-signal-coach";

export function useIntervalSignals({
  sequence,
  phaseKey,
  remainingMs,
  paused,
  enabled,
  phaseStartedAtMs,
}: {
  sequence: readonly SessionStep[];
  phaseKey: number;
  remainingMs: number;
  paused: boolean;
  enabled: boolean;
  phaseStartedAtMs?: number;
}) {
  const coachRef = useRef<IntervalSignalCoach | null>(null);
  const remainingRef = useRef(remainingMs);
  const scheduledSequenceRef = useRef<readonly SessionStep[] | null>(null);
  useEffect(() => {
    remainingRef.current = remainingMs;
  }, [remainingMs]);
  useEffect(() => {
    const coach = new IntervalSignalCoach(
      typeof AudioContext === "undefined" ? null : AudioContext,
    );
    coachRef.current = coach;
    document.addEventListener("pointerdown", coach.unlock);
    document.addEventListener("keydown", coach.unlock);
    return () => {
      document.removeEventListener("pointerdown", coach.unlock);
      document.removeEventListener("keydown", coach.unlock);
      coach.dispose();
    };
  }, []);
  useEffect(() => {
    const coach = coachRef.current;
    if (!coach) return;
    if (!enabled || paused) {
      coach.stop();
      scheduledSequenceRef.current = null;
      return;
    }
    // The queued final transition tone must finish after the completed render.
    if (sequence[phaseKey]?.type === "completed") return;
    if (
      phaseStartedAtMs !== undefined &&
      scheduledSequenceRef.current === sequence
    )
      return;
    const step = sequence[phaseKey];
    const durationMs =
      (step.type === "active"
        ? step.prescription.durationSeconds
        : step.durationSeconds) * 1000;
    const remaining =
      phaseStartedAtMs === undefined
        ? remainingRef.current
        : Math.max(0, phaseStartedAtMs + durationMs - Date.now());
    coach.schedule(buildIntervalSignals(sequence, phaseKey, remaining));
    scheduledSequenceRef.current = sequence;
  }, [enabled, paused, phaseKey, sequence, phaseStartedAtMs]);
}
