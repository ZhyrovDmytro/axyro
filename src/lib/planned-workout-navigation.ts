import type { IntensityLevel } from "@/domain/workout/intensity";

export function getPlannedWorkoutStartHref(
  sessionId: string,
  preferredIntensity: IntensityLevel,
  preferencesReady: boolean,
): string {
  if (!preferencesReady) return `/plan/workouts/${sessionId}/edit`;

  return `/plan/workouts/${sessionId}/start?intensity=${preferredIntensity}`;
}
