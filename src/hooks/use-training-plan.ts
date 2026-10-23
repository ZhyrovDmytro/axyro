"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { exercises } from "@/content/exercises";
import type { TrainingPlan } from "@/domain/training-plan/training-plan.types";
import { normalizeScheduledExerciseFlow } from "@/domain/training-plan/generate-training-plan";
import { toDateKey } from "@/domain/training-plan/date";
import {
  createAdaptedSessionSnapshot,
  createPlannedSessionSnapshot,
} from "@/domain/workout/create-workout-session-snapshot";
import { createBrowserTrainingPlanRepository } from "@/services/persistence/local-training-plan-repository";
import { createBrowserTrainingProfileRepository } from "@/services/persistence/local-training-profile-repository";
import { createBrowserWorkoutActivityRepository } from "@/services/persistence/local-workout-activity-repository";
import type { TrainingPlanRepository } from "@/services/persistence/training-plan-repository";

export function useTrainingPlan() {
  const repository = useRef<TrainingPlanRepository | null>(null);
  const planRef = useRef<TrainingPlan | null>(null);
  const [plan, setPlanState] = useState<TrainingPlan | null>(null);
  const [profile, setProfile] = useState<TrainingPlan["profile"] | null>(null);
  const [loadState, setLoadState] = useState({
    ready: false,
    needsCatalogRefresh: false,
  });

  const syncActivity = useCallback((next: TrainingPlan) => {
    return createBrowserWorkoutActivityRepository().syncScheduledSessions(
      next.generatedAt,
      next.sessions.map((session) => {
        const adaptedSnapshot = createAdaptedSessionSnapshot(
          session,
          exercises,
        );
        return {
          sessionId: session.id,
          planId: next.generatedAt,
          workoutId: session.workout.id,
          scheduledDate: session.scheduledDate,
          plannedSnapshot: createPlannedSessionSnapshot(session, exercises),
          ...(adaptedSnapshot ? { adaptedSnapshot } : {}),
        };
      }),
      toDateKey(new Date()),
    );
  }, []);

  useEffect(() => {
    const localRepository = createBrowserTrainingPlanRepository();
    repository.current = localRepository;
    const storedProfile = createBrowserTrainingProfileRepository().load();
    const stored = repository.current.load();
    if (!stored) {
      planRef.current = null;
      setProfile(storedProfile);
      setPlanState(null);
      setLoadState({
        ready: true,
        needsCatalogRefresh: localRepository.hasOutdatedPlan,
      });
      return;
    }
    const activities = syncActivity(stored);
    const statusBySession = new Map(
      activities
        .filter((activity) => activity.planId === stored.generatedAt)
        .map((activity) => [activity.sessionId, activity.status]),
    );
    const reconciled: TrainingPlan = {
      ...stored,
      sessions: stored.sessions.map((session) => ({
        ...session,
        status: statusBySession.get(session.id) ?? session.status,
      })),
    };
    const normalized = normalizeScheduledExerciseFlow(reconciled);
    repository.current.save(normalized);
    createBrowserTrainingProfileRepository().save(normalized.profile);
    if (normalized !== reconciled) syncActivity(normalized);
    planRef.current = normalized;
    setProfile(normalized.profile);
    setPlanState(normalized);
    setLoadState({
      ready: true,
      needsCatalogRefresh: localRepository.hasOutdatedPlan,
    });
  }, [syncActivity]);

  const setPlan = useCallback(
    (next: TrainingPlan | null) => {
      planRef.current = next;
      setPlanState(next);
      if (next) {
        repository.current?.save(next);
        createBrowserTrainingProfileRepository().save(next.profile);
        setProfile(next.profile);
        syncActivity(next);
      } else {
        createBrowserWorkoutActivityRepository().syncScheduledSessions(
          "cleared-plan",
          [],
          toDateKey(new Date()),
        );
        repository.current?.clear();
      }
    },
    [syncActivity],
  );

  const updatePlan = useCallback(
    (update: (current: TrainingPlan) => TrainingPlan) => {
      const current = planRef.current;
      if (!current) return;

      const next = update(current);
      planRef.current = next;
      setPlanState(next);
      repository.current?.save(next);
      createBrowserTrainingProfileRepository().save(next.profile);
      setProfile(next.profile);
      syncActivity(next);
    },
    [syncActivity],
  );

  return { plan, profile, ...loadState, setPlan, updatePlan };
}
