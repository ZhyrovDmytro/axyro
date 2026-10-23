// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { usePhaseTimer } from "./use-phase-timer";

describe("usePhaseTimer", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps a restored phase at its exact remaining time", () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);

    const { result } = renderHook(() =>
      usePhaseTimer({
        phaseKey: 4,
        durationSeconds: 30,
        paused: true,
        enabled: true,
        initialRemainingMs: 12_345,
        onComplete: vi.fn(),
      }),
    );

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(result.current).toMatchObject({
      remainingMs: 12_345,
      remainingSeconds: 13,
    });
  });
});

it("reports the original deadline after background throttling", () => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  const complete = vi.fn();
  const { unmount } = renderHook(() =>
    usePhaseTimer({
      phaseKey: 0,
      durationSeconds: 5,
      paused: false,
      enabled: true,
      onComplete: complete,
    }),
  );
  act(() => {
    vi.setSystemTime(45_000);
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(complete).toHaveBeenCalledWith(5_000, 45_000);
  unmount();
  vi.useRealTimers();
});
