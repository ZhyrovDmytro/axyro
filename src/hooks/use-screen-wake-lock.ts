"use client";

import { useEffect, useState } from "react";

type WakeLockSentinelLike = {
  release(): Promise<void>;
  addEventListener(type: "release", listener: () => void): void;
};

type WakeLockStatus = "unsupported" | "inactive" | "active" | "blocked";

export function useScreenWakeLock(enabled: boolean): WakeLockStatus {
  const [status, setStatus] = useState<WakeLockStatus>("inactive");

  useEffect(() => {
    const wakeLock = (
      navigator as Navigator & {
        wakeLock?: { request(type: "screen"): Promise<WakeLockSentinelLike> };
      }
    ).wakeLock;
    if (!wakeLock) {
      queueMicrotask(() => setStatus("unsupported"));
      return;
    }
    if (!enabled) {
      queueMicrotask(() => setStatus("inactive"));
      return;
    }

    let sentinel: WakeLockSentinelLike | null = null;
    let cancelled = false;
    const acquire = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        sentinel = await wakeLock.request("screen");
        if (cancelled) {
          await sentinel.release();
          return;
        }
        setStatus("active");
        sentinel.addEventListener("release", () => setStatus("inactive"));
      } catch {
        if (!cancelled) setStatus("blocked");
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && !sentinel) void acquire();
    };
    void acquire();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      void sentinel?.release();
    };
  }, [enabled]);

  return status;
}
