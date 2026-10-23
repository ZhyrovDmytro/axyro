"use client";

import { useCallback, useEffect, useRef } from "react";

import type { IntensityLevel } from "@/domain/workout/intensity";
import { createBrowserWorkoutActivityRepository } from "@/services/persistence/local-workout-activity-repository";
import { updateAdaptationProfile } from "@/domain/training-plan/adaptation-profile";
import { createBrowserAdaptationProfileRepository } from "@/services/persistence/local-adaptation-profile-repository";
import type {
  CompletedWorkoutSession,
  FeedbackAffectedArea,
  FeedbackAdaptationDecision,
  WorkoutFeedback,
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
}: UseWorkoutActivityOptions): {
  recordFeedback: (
    feedback: WorkoutFeedback,
    affectedArea?: FeedbackAffectedArea,
  ) => WorkoutFeedbackEvent | null;
  recordFeedbackDecision: (
    feedbackEventId: string,
    decision: FeedbackAdaptationDecision,
  ) => void;
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
    );
  }, [intensity, restoredStartedAt, workoutId]);

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
    (feedback: WorkoutFeedback, affectedArea?: FeedbackAffectedArea) => {
      const completedSession = ensureCompletion();
      if (!completedSession) return null;
      const event =
        repository.current?.saveFeedbackEvent({
          completionId: completedSession.id,
          rating: feedback,
          ...(affectedArea ? { affectedArea } : {}),
        }) ?? null;
      if (event) {
        const adaptationRepository = createBrowserAdaptationProfileRepository();
        adaptationRepository.save(
          updateAdaptationProfile({
            current: adaptationRepository.load(),
            feedback,
            snapshot: completedSession.snapshot,
          }),
        );
      }
      return event;
    },
    [ensureCompletion],
  );

  const recordFeedbackDecision = useCallback(
    (feedbackEventId: string, decision: FeedbackAdaptationDecision) => {
      repository.current?.saveFeedbackDecision({ feedbackEventId, decision });
    },
    [],
  );

  return { recordFeedback, recordFeedbackDecision };
}
