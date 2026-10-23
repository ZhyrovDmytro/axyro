import type { SessionStep } from "../workout/session-step.types";

export type IntervalSignal = {
  offsetMs: number;
  kind: "countdown" | "transition";
};

export function buildIntervalSignals(
  sequence: readonly SessionStep[],
  currentIndex: number,
  remainingMs: number,
): IntervalSignal[] {
  const signals: IntervalSignal[] = [];
  let offsetMs = 0;
  for (let index = currentIndex; index < sequence.length; index += 1) {
    const step = sequence[index];
    if (step.type === "completed") break;
    const durationMs =
      index === currentIndex
        ? remainingMs
        : (step.type === "active"
            ? step.prescription.durationSeconds
            : step.durationSeconds) * 1000;
    for (let second = 5; second >= 1; second -= 1) {
      const at = durationMs - second * 1000;
      if (at >= 0) signals.push({ offsetMs: offsetMs + at, kind: "countdown" });
    }
    offsetMs += durationMs;
    signals.push({ offsetMs, kind: "transition" });
  }
  // Adjacent short phases can start a countdown at the transition boundary.
  const transitions = new Set(
    signals
      .filter((signal) => signal.kind === "transition")
      .map((signal) => signal.offsetMs),
  );
  return signals.filter(
    (signal) =>
      signal.kind === "transition" || !transitions.has(signal.offsetMs),
  );
}
