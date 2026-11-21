import { getSessionDurationToleranceSeconds } from "@/domain/workout/session-duration";
import { exercises } from "@/content/exercises";
import type {
  SessionActivity,
  WorkoutFeedbackEvent,
} from "@/services/persistence/workout-activity-repository";

import { formatPlanDate, fromDateKey } from "./date";
import {
  gameRecoveryDays,
  generateTrainingPlan,
  getPlanGamesKey,
} from "./generate-training-plan";
import { isCompatiblePlanExercise } from "./model-exercise-candidates";
import type { AdaptationProfile } from "./adaptation-profile";
import type {
  AthleteProfile,
  PlannedWorkout,
  TrainingPlan,
} from "./training-plan.types";

export function refineTrainingPlan({
  plan,
  profile,
  today,
  activities,
  activeSessionId,
  recentFeedback,
  adaptationProfile,
  revisionId,
}: {
  plan: TrainingPlan;
  profile: AthleteProfile;
  today: string;
  activities: readonly SessionActivity[];
  activeSessionId?: string;
  recentFeedback?: readonly WorkoutFeedbackEvent[];
  adaptationProfile?: AdaptationProfile;
  revisionId: string;
}) {
  if (today > plan.endDate)
    throw new Error(
      "This block has ended. Build your next 60 days from the plan page.",
    );
  const matches = [
    ...plan.games
      .filter(({ date }) => date < today)
      .map(({ date, importance }) => ({ date, importance })),
    ...profile.matches.filter(({ date }) => date >= today),
  ].sort((left, right) => left.date.localeCompare(right.date));
  profile = { ...profile, matches };
  if (JSON.stringify(profile) === JSON.stringify(plan.profile)) {
    return { plan, changes: [] };
  }
  const byActivity = new Map(
    activities
      .filter((item) => item.planId === plan.generatedAt)
      .map((item) => [item.sessionId, item]),
  );
  const rebuild = generateTrainingPlan(
    profile,
    fromDateKey(plan.startDate),
    recentFeedback,
    { adaptationProfile },
  );
  const games = rebuild.games.map((game) => {
    const existing = plan.games.find(({ date }) => date === game.date);
    return existing ? { ...existing, importance: game.importance } : game;
  });
  const block = { ...plan, profile, games };
  const protectedDates = gameRecoveryDays(block);
  const adjustable = (session: PlannedWorkout) =>
    session.scheduledDate >= today &&
    session.status === "scheduled" &&
    session.id !== activeSessionId &&
    (byActivity.get(session.id)?.status ?? "scheduled") === "scheduled";
  const history = plan.sessions.filter((session) => !adjustable(session));
  const occupied = new Set(history.map((session) => session.scheduledDate));
  const upcoming = plan.sessions.filter(adjustable);
  const lowerFrequency = profile.sessionsPerWeek < plan.profile.sessionsPerWeek;
  const durationChanged =
    profile.sessionDurationMinutes !== plan.profile.sessionDurationMinutes;
  const targetSeconds = profile.sessionDurationMinutes * 60;
  const generated = rebuild.sessions.filter(
    (session) =>
      session.scheduledDate >= today &&
      session.scheduledDate <= plan.endDate &&
      !protectedDates.has(session.scheduledDate),
  );
  const changes: {
    date: string;
    action: "Add" | "Update" | "Remove" | "Replace" | "Move";
    workoutName: string;
    detail?: string;
  }[] = [];
  const preserved: PlannedWorkout[] = [];
  const consumed = new Set<string>();

  const hasPersonalChanges = (session: PlannedWorkout) =>
    session.isEdited ||
    session.todayAdaptations.length > 0 ||
    Boolean(session.weeklyAdaptedSessionSnapshot) ||
    Boolean(byActivity.get(session.id)?.rescheduleCount);

  for (const session of upcoming) {
    const activity = byActivity.get(session.id);
    const originalDate =
      activity?.originalScheduledDate ?? session.scheduledDate;
    if (!hasPersonalChanges(session)) continue;
    const snapshots = [
      session,
      session.originalSessionSnapshot,
      session.weeklyAdaptedSessionSnapshot,
    ];
    const incompatibleDuration =
      durationChanged &&
      Math.abs(targetSeconds - session.estimatedDurationSeconds) >
        getSessionDurationToleranceSeconds(targetSeconds);
    const incompatible =
      incompatibleDuration ||
      snapshots.some((snapshot) =>
        snapshot?.sections.some((section) =>
          section.items.some(({ exerciseId }) => {
            const exercise = exercises.find(({ id }) => id === exerciseId);
            return (
              !exercise ||
              !isCompatiblePlanExercise(exercise, profile, section.type) ||
              (adaptationProfile?.avoidExercises.includes(exerciseId) ?? false)
            );
          }),
        ),
      );
    const mustMove = protectedDates.has(session.scheduledDate);
    const available = generated.filter(
      (candidate) =>
        !consumed.has(candidate.id) &&
        !occupied.has(candidate.scheduledDate) &&
        (!mustMove ||
          !upcoming.some(
            (entry) =>
              entry.id !== session.id &&
              entry.scheduledDate === candidate.scheduledDate &&
              hasPersonalChanges(entry),
          )),
    );
    const replacement =
      available.find((candidate) => candidate.scheduledDate === originalDate) ??
      available.find(
        (candidate) => candidate.scheduledDate === session.scheduledDate,
      ) ??
      available.find(
        (candidate) => candidate.weekNumber === session.weekNumber,
      );
    if (lowerFrequency && !replacement) continue;
    if ((incompatible || mustMove) && !replacement) {
      throw new Error(
        `No compatible update is available for ${session.workout.name} on ${session.scheduledDate}. Change your answers and try again.`,
      );
    }
    const date =
      mustMove && replacement
        ? replacement.scheduledDate
        : session.scheduledDate;
    if (occupied.has(date))
      throw new Error(
        `Two workouts would overlap on ${date}. Review the schedule and try again.`,
      );
    if (replacement) consumed.add(replacement.id);
    occupied.add(date);
    preserved.push({
      ...(incompatible && replacement ? replacement : session),
      id: session.id,
      scheduledDate: date,
    });
    if (incompatible && replacement) {
      changes.push({
        date,
        action: "Replace",
        workoutName: replacement.workout.name,
        detail: `Replaces ${session.workout.name} on ${formatPlanDate(session.scheduledDate)} to fit your updated restrictions.`,
      });
    }
    if (mustMove) {
      changes.push({
        date,
        action: "Move",
        workoutName: session.workout.name,
        detail: `Moved from ${formatPlanDate(session.scheduledDate)} to protect match recovery.`,
      });
    }
  }

  const retainedIds = new Set(preserved.map(({ id }) => id));
  const remaining = upcoming.filter(({ id }) => !retainedIds.has(id));
  const usedIds = new Set([
    ...plan.sessions.map(({ id }) => id),
    ...byActivity.keys(),
  ]);
  const revised = generated.flatMap((session) => {
    const date = session.scheduledDate;
    if (occupied.has(date) || consumed.has(session.id)) return [];
    const previous = remaining.find((entry) => entry.scheduledDate === date);
    changes.push({
      date,
      action: previous ? "Update" : "Add",
      workoutName: session.workout.name,
    });
    occupied.add(date);
    return [
      {
        ...session,
        id:
          previous?.id ??
          (usedIds.has(session.id)
            ? `refined-${date}-${revisionId}`
            : session.id),
      },
    ];
  });
  const revisedIds = new Set(revised.map(({ id }) => id));
  for (const session of remaining) {
    if (!revisedIds.has(session.id)) {
      changes.push({
        date: session.scheduledDate,
        action: "Remove",
        workoutName: session.workout.name,
      });
    }
  }
  if (
    upcoming.length > 0 &&
    revised.length + preserved.length === 0 &&
    !history.some(
      (session) =>
        session.scheduledDate >= today && session.status === "in-progress",
    )
  ) {
    throw new Error(
      "No upcoming workouts fit these dates. Review your schedule and match dates.",
    );
  }
  return {
    changes: changes.sort((a, b) => a.date.localeCompare(b.date)),
    plan: {
      ...block,
      sessions: [...history, ...preserved, ...revised].sort((a, b) =>
        a.scheduledDate.localeCompare(b.scheduledDate),
      ),
      rebalancedGamesKey: getPlanGamesKey(block),
    } satisfies TrainingPlan,
  };
}
