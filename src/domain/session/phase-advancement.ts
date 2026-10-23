import type { SessionStep } from "../workout/session-step.types";

export function advanceExpiredPhases(
  sequence: readonly SessionStep[],
  currentIndex: number,
  completedAtMs: number,
  nowMs: number,
) {
  let currentPhaseStartedAtMs = completedAtMs;
  let nextIndex = currentIndex + 1;
  while (nextIndex < sequence.length - 1) {
    const step = sequence[nextIndex];
    if (step.type === "completed") break;
    const durationMs =
      (step.type === "active"
        ? step.prescription.durationSeconds
        : step.durationSeconds) * 1000;
    if (currentPhaseStartedAtMs + durationMs > nowMs) break;
    currentPhaseStartedAtMs += durationMs;
    nextIndex += 1;
  }
  return {
    nextIndex: Math.min(nextIndex, sequence.length - 1),
    currentPhaseStartedAtMs,
  };
}
