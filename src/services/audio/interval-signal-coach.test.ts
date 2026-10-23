import { afterEach, expect, it, vi } from "vitest";
import { IntervalSignalCoach } from "./interval-signal-coach";
afterEach(() => vi.useRealTimers());
it("uses distinct tones and cancels queued audio when muted or paused", () => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  const nodes: Array<{
    frequency: { setValueAtTime: ReturnType<typeof vi.fn> };
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
  }> = [];
  class Context {
    state = "running";
    currentTime = 0;
    destination = {};
    createOscillator() {
      const node = {
        frequency: { setValueAtTime: vi.fn() },
        start: vi.fn(),
        stop: vi.fn(),
        connect: vi.fn(),
        disconnect: vi.fn(),
        type: "sine",
        onended: null,
      };
      nodes.push(node);
      return node;
    }
    createGain() {
      return {
        gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
    }
    close() {
      return Promise.resolve();
    }
  }
  const coach = new IntervalSignalCoach(
    Context as unknown as typeof AudioContext,
  );
  coach.schedule([
    { offsetMs: 0, kind: "countdown" },
    { offsetMs: 1000, kind: "transition" },
  ]);
  expect(nodes[0].frequency.setValueAtTime).toHaveBeenCalledWith(560, 0);
  expect(nodes[1].frequency.setValueAtTime).toHaveBeenCalledWith(880, 1);
  coach.stop();
  expect(nodes.every((node) => node.stop.mock.calls.length === 2)).toBe(true);
});
it("degrades without Web Audio support", () => {
  const coach = new IntervalSignalCoach(null);
  expect(coach.supported).toBe(false);
  expect(() => {
    coach.schedule([{ offsetMs: 0, kind: "countdown" }]);
    coach.stop();
    coach.dispose();
  }).not.toThrow();
});
