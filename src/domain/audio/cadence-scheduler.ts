import type { IntensityLevel } from "../workout/intensity";
import { intensityPresets } from "../workout/intensity";
import type { SessionStep } from "../workout/session-step.types";

export type ScheduledCue = {
  key: string;
  text: string;
  rate: number;
};

function countdownCue(
  step: SessionStep,
  remainingMs: number,
): ScheduledCue | undefined {
  if (
    step.type !== "ready" &&
    step.type !== "active" &&
    step.type !== "rest" &&
    step.type !== "side-transition"
  )
    return undefined;
  const seconds = Math.ceil(remainingMs / 1000);
  if (seconds < 1 || seconds > 3) return undefined;
  return { key: `countdown-${seconds}`, text: String(seconds), rate: 1 };
}

function recoveryStartCue(
  step: Extract<SessionStep, { type: "rest" }>,
  remainingMs: number,
): ScheduledCue | undefined {
  const elapsedMs = step.durationSeconds * 1000 - remainingMs;
  if (elapsedMs < 0 || elapsedMs > 1000) return undefined;

  return {
    key: "recovery-start",
    text: "Stop, recovery time",
    rate: 1,
  };
}

function nextExerciseCue(
  step: Extract<SessionStep, { type: "ready" }>,
  remainingMs: number,
): ScheduledCue | undefined {
  if (!step.announceNextExercise) return undefined;
  const elapsedMs = step.durationSeconds * 1000 - remainingMs;
  if (elapsedMs < 0 || elapsedMs > 1000) return undefined;

  return { key: "next-exercise", text: "Next exercise", rate: 1 };
}

function workoutStartCue(
  step: Extract<SessionStep, { type: "active" }>,
  remainingMs: number,
): ScheduledCue | undefined {
  if (!step.announceWorkoutStart) return undefined;
  const elapsedMs = step.prescription.durationSeconds * 1000 - remainingMs;
  if (elapsedMs < 0 || elapsedMs > 1000) return undefined;

  return { key: "workout-start", text: "Go", rate: 1 };
}

function switchStartCue(
  step: Extract<SessionStep, { type: "active" }>,
  remainingMs: number,
): ScheduledCue | undefined {
  if (!step.announceStartAfterSwitch) return undefined;
  const elapsedMs = step.prescription.durationSeconds * 1000 - remainingMs;
  if (elapsedMs < 0 || elapsedMs > 1000) return undefined;

  return { key: "switch-start", text: "Start", rate: 1 };
}

function activeCue(
  step: Extract<SessionStep, { type: "active" }>,
  remainingMs: number,
  intensity: IntensityLevel,
  guidanceCadenceMultiplier: number,
): ScheduledCue | undefined {
  if (
    !step.guidance.enabledByDefault ||
    step.guidance.pattern.type === "none"
  ) {
    return undefined;
  }

  const preset = intensityPresets[intensity];
  const baseIntervalMs = step.guidance.secondsPerCue
    ? step.guidance.secondsPerCue * 1000
    : step.guidance.bpm
      ? 60_000 / step.guidance.bpm
      : 1000;
  const combinedMultiplier =
    preset.cadenceMultiplier * guidanceCadenceMultiplier;
  const intervalMs = baseIntervalMs / combinedMultiplier;
  const durationMs = step.prescription.durationSeconds * 1000;
  const cueIndex = Math.floor(
    Math.max(0, durationMs - remainingMs) / intervalMs,
  );
  const pattern = step.guidance.pattern;
  const text =
    pattern.type === "rep-count"
      ? String(cueIndex + 1)
      : pattern.cues[cueIndex % pattern.cues.length];

  return text
    ? {
        key: `active-${cueIndex}`,
        text,
        rate: combinedMultiplier,
      }
    : undefined;
}

export function getScheduledCue(
  step: SessionStep,
  remainingMs: number,
  intensity: IntensityLevel,
  guidanceCadenceMultiplier = 1,
): ScheduledCue | undefined {
  const countdown = countdownCue(step, remainingMs);
  if (countdown) return countdown;

  if (step.type === "active") {
    return (
      workoutStartCue(step, remainingMs) ??
      switchStartCue(step, remainingMs) ??
      activeCue(step, remainingMs, intensity, guidanceCadenceMultiplier)
    );
  }
  if (step.type === "rest") return recoveryStartCue(step, remainingMs);
  if (step.type === "ready") return nextExerciseCue(step, remainingMs);
  if (step.type === "side-transition") {
    return {
      key: `switch-${step.switchTarget}`,
      text: `Switch ${step.switchTarget}`,
      rate: 1,
    };
  }
  return undefined;
}
