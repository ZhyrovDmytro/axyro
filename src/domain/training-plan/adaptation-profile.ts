import { z } from "zod";

import type {
  WorkoutFeedback,
  WorkoutSessionSnapshot,
} from "@/services/persistence/workout-activity-repository";

export const adaptationProfileSchema = z.object({
  recentDifficultyTrend: z.enum(["too-easy", "just-right", "too-hard"]),
  avoidExercises: z.array(z.string().min(1)).max(20),
  preferredExercises: z.array(z.string().min(1)).max(20),
  temporaryLoadAdjustment: z.number().int().min(-1).max(1),
});

export type AdaptationProfile = z.infer<typeof adaptationProfileSchema>;

export const defaultAdaptationProfile: AdaptationProfile = {
  recentDifficultyTrend: "just-right",
  avoidExercises: [],
  preferredExercises: [],
  temporaryLoadAdjustment: 0,
};

function unique(items: readonly string[]) {
  return [...new Set(items)].slice(0, 20);
}

export function updateAdaptationProfile({
  current,
  feedback,
  snapshot,
}: {
  current: AdaptationProfile;
  feedback: WorkoutFeedback;
  snapshot?: WorkoutSessionSnapshot;
}): AdaptationProfile {
  const skippedExerciseIds =
    snapshot?.items
      .filter((item) => item.status === "skipped")
      .map((item) => item.exerciseId) ?? [];
  const completedExerciseIds =
    snapshot?.items
      .filter((item) => item.status === "completed")
      .map((item) => item.exerciseId) ?? [];
  const trend = feedback === "pain-or-discomfort" ? "too-hard" : feedback;

  return adaptationProfileSchema.parse({
    recentDifficultyTrend: trend,
    avoidExercises: unique([...current.avoidExercises, ...skippedExerciseIds]),
    preferredExercises:
      feedback === "just-right"
        ? unique([...completedExerciseIds, ...current.preferredExercises])
        : current.preferredExercises,
    temporaryLoadAdjustment:
      trend === "too-hard" ? -1 : trend === "too-easy" ? 1 : 0,
  });
}
