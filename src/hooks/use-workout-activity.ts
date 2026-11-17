"use client";

import { useCallback, useEffect, useRef } from "react";

import type { IntensityLevel } from "@/domain/workout/intensity";
import { createBrowserWorkoutActivityRepository } from "@/services/persistence/local-workout-activity-repository";
import type {
  CompletedWorkoutSession,
  SaveFeedbackEventInput,
  WorkoutFeedbackEvent,
  WorkoutSessionSnapshot,
} from "@/services/persistence/workout-activity-repository";

type UseWorkoutActivityOptions = {
  activityId?: string;
  sessionId?: string;
  workoutId: string;
  intensity: IntensityLevel;
  snapshot: WorkoutSessionSnapshot;
  completed: boolean;
  actualDurationSeconds?: number;
  startedAt?: string;
  resumedAfterInterruption?: boolean;
};

function standaloneSessionId(workoutId: string) {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.round(Math.random() * 1_000_000)}`;
  return `standalone-${workoutId}-${suffix}`;
}

export function useWorkoutActivity({
  activityId,
  sessionId,
  workoutId,
  intensity,
  snapshot,
  completed,
  actualDurationSeconds,
  startedAt: restoredStartedAt,
  resumedAfterInterruption = false,
}: UseWorkoutActivityOptions): {
  recordFeedback: (
    answer: Omit<SaveFeedbackEventInput, "completionId">,
  ) => WorkoutFeedbackEvent | null;
} {
  const repository = useRef<ReturnType<
    typeof createBrowserWorkoutActivityRepository
  > | null>(null);
  const resolvedSessionId = useRef(sessionId ?? standaloneSessionId(workoutId));
  const completion = useRef<CompletedWorkoutSession | null>(null);
  const startedAt = useRef<Date | null>(null);

  useEffect(() => {
    const currentRepository = createBrowserWorkoutActivityRepository();
    repository.current = currentRepository;
    const sessionStartedAt = restoredStartedAt
      ? new Date(restoredStartedAt)
      : new Date();
    startedAt.current = sessionStartedAt;
    currentRepository.recordStarted(workoutId, intensity, sessionStartedAt);
    currentRepository.markSessionStarted(
      resolvedSessionId.current,
      workoutId,
      intensity,
      sessionStartedAt,
      resumedAfterInterruption,
    );
  }, [intensity, restoredStartedAt, resumedAfterInterruption, workoutId]);

  const ensureCompletion = useCallback(() => {
    if (completion.current) return completion.current;
    const recorded = repository.current?.recordCompleted({
      ...(activityId ? { activityId } : {}),
      sessionId: resolvedSessionId.current,
      workoutId,
      intensity,
      snapshot,
      ...(startedAt.current ? { startedAt: startedAt.current } : {}),
      ...(actualDurationSeconds !== undefined ? { actualDurationSeconds } : {}),
    });
    if (recorded) completion.current = recorded;
    return recorded ?? null;
  }, [activityId, actualDurationSeconds, intensity, snapshot, workoutId]);

  useEffect(() => {
    if (!completed || actualDurationSeconds === undefined) return;
    ensureCompletion();
  }, [actualDurationSeconds, completed, ensureCompletion]);

  const recordFeedback = useCallback(
    (answer: Omit<SaveFeedbackEventInput, "completionId">) => {
      const completedSession = ensureCompletion();
      if (!completedSession) return null;
      return (
        repository.current?.saveFeedbackEvent({
          ...answer,
          completionId: completedSession.id,
        }) ?? null
      );
    },
    [ensureCompletion],
  );

  return { recordFeedback };
}
