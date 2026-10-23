import type { ExerciseMedia } from "./exercise.types";

export type ExerciseMediaState =
  "loading" | "ready" | "playing" | "paused" | "error" | "fallback";

export type ExerciseMediaAvailability = "video" | "image" | "guide";

export function getExerciseMediaAvailability(
  media: ExerciseMedia,
): ExerciseMediaAvailability {
  if (media.uri && (media.type === "video" || media.type === "animation")) {
    return "video";
  }
  if (media.uri || media.fallbackUri || media.posterUri) return "image";
  return "guide";
}

export function resolveExerciseMediaError(
  media: ExerciseMedia,
): ExerciseMediaState {
  return media.fallbackUri ||
    media.posterUri ||
    media.fallback === "instructional"
    ? "fallback"
    : "error";
}
