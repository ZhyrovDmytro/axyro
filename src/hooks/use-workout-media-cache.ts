"use client";

import { useCallback, useState } from "react";

import type { Exercise } from "@/domain/exercise/exercise.types";

type CacheStatus = "idle" | "caching" | "ready" | "unsupported" | "error";

export function useWorkoutMediaCache(exercises: Exercise[]) {
  const [status, setStatus] = useState<CacheStatus>("idle");
  const cache = useCallback(async () => {
    if (!("caches" in window)) {
      setStatus("unsupported");
      return;
    }
    const urls = [
      ...new Set(
        exercises.flatMap((exercise) =>
          [
            exercise.media.uri,
            exercise.media.posterUri,
            exercise.media.fallbackUri,
          ].filter((url): url is string => Boolean(url)),
        ),
      ),
    ];
    if (!urls.length) {
      setStatus("ready");
      return;
    }
    setStatus("caching");
    try {
      const mediaCache = await window.caches.open("axyro-current-workout-v1");
      await Promise.all(
        urls.map(async (url) => {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`Could not cache ${url}`);
          await mediaCache.put(url, response);
        }),
      );
      setStatus("ready");
      window.dispatchEvent(new Event("axyro-media-cache-updated"));
    } catch {
      setStatus("error");
    }
  }, [exercises]);

  return { cache, status };
}
