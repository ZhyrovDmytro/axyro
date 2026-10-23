export type PhaseClock = {
  remainingMs: number;
  deadlineMs: number | null;
};

export function createPhaseClock(
  durationMs: number,
  nowMs: number,
): PhaseClock {
  return {
    remainingMs: durationMs,
    deadlineMs: nowMs + durationMs,
  };
}

export function getRemainingMs(clock: PhaseClock, nowMs: number): number {
  return clock.deadlineMs === null
    ? clock.remainingMs
    : Math.max(0, clock.deadlineMs - nowMs);
}

export function pausePhaseClock(clock: PhaseClock, nowMs: number): PhaseClock {
  return {
    remainingMs: getRemainingMs(clock, nowMs),
    deadlineMs: null,
  };
}

export function resumePhaseClock(clock: PhaseClock, nowMs: number): PhaseClock {
  return clock.deadlineMs === null
    ? { ...clock, deadlineMs: nowMs + clock.remainingMs }
    : clock;
}
