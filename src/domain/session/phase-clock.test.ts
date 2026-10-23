import { describe, expect, it } from "vitest";

import {
  createPhaseClock,
  getRemainingMs,
  pausePhaseClock,
  resumePhaseClock,
} from "./phase-clock";

describe("phase clock", () => {
  it("derives remaining time from an absolute deadline", () => {
    const clock = createPhaseClock(30_000, 1_000);

    expect(getRemainingMs(clock, 11_000)).toBe(20_000);
  });

  it("freezes while paused and resumes without losing time", () => {
    const running = createPhaseClock(30_000, 1_000);
    const paused = pausePhaseClock(running, 11_000);
    const resumed = resumePhaseClock(paused, 60_000);

    expect(getRemainingMs(paused, 50_000)).toBe(20_000);
    expect(getRemainingMs(resumed, 65_000)).toBe(15_000);
  });

  it("never reports negative remaining time", () => {
    expect(getRemainingMs(createPhaseClock(5_000, 0), 10_000)).toBe(0);
  });
});
