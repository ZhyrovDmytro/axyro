import { createBrowserUserStorage } from "./user-storage";
import { z } from "zod";

import {
  bodyAreaSchema,
  trainingQualitySchema,
} from "@/domain/exercise/exercise.schema";
import {
  progressionPhaseSchema,
  sessionAdaptationSchema,
} from "@/domain/training-plan/training-plan.schema";
import { intensityLevels } from "@/domain/workout/intensity";
import { sessionLifecycleStatusSchema } from "@/domain/session/session-lifecycle";
import { toDateKey } from "@/domain/training-plan/date";
import { TRAINING_PLAN_WEEK_COUNT } from "@/domain/training-plan/progression";
import type { StorageLike } from "@/services/persistence/storage";
import {
  feedbackAffectedAreaValues,
  type CompletedWorkoutSession,
  type RecordCompletedWorkoutInput,
  type SaveFeedbackEventInput,
  type SaveInWorkoutDiscomfortInput,
  type SaveFeedbackDecisionInput,
  type ScheduledSessionActivityInput,
  type SessionActivity,
  type WorkoutActivity,
  type WorkoutActivityRepository,
  type WorkoutFeedbackEvent,
  type WorkoutFeedbackDecisionEvent,
  scheduledSessionActivityId,
  workoutFeedbackValues,
} from "@/services/persistence/workout-activity-repository";

export const workoutActivityStorageKey = "veyro.workout-activity.v1";
export const workoutActivityChangedEvent = "axyro:workout-activity-changed";
const maximumStoredWorkouts = 20;
const maximumStoredSessions = 100;

const workoutActivitySchema = z.object({
  workoutId: z.string().min(1),
  lastStartedAt: z.string().min(1),
  lastCompletedAt: z.string().min(1).optional(),
  completionCount: z.number().int().nonnegative(),
  lastIntensity: z.enum(intensityLevels),
});

const snapshotSchema = z.object({
  workoutName: z.string().min(1),
  focus: z.array(trainingQualitySchema),
  bodyAreas: z.array(bodyAreaSchema),
  items: z.array(
    z.object({
      section: z.enum(["warmup", "main", "cooldown"]).default("main"),
      status: z.enum(["planned", "completed", "skipped"]).default("completed"),
      workoutItemId: z.string().min(1).optional(),
      exerciseId: z.string().min(1),
      exerciseName: z.string().min(1).optional(),
      sets: z.number().int().positive(),
      completedSets: z.number().int().nonnegative().optional(),
      workDurationSeconds: z.number().int().positive(),
      perSide: z.boolean(),
      restAfterSetSeconds: z.number().int().nonnegative(),
      restAfterExerciseSeconds: z.number().int().nonnegative(),
    }),
  ),
  progressionWeek: z
    .number()
    .int()
    .min(1)
    .max(TRAINING_PLAN_WEEK_COUNT)
    .optional(),
  progressionPhase: progressionPhaseSchema.optional(),
  targetDurationSeconds: z.number().int().positive(),
  estimatedDurationSeconds: z.number().int().positive(),
  originalSession: z
    .object({
      targetDurationSeconds: z.number().int().positive(),
      estimatedDurationSeconds: z.number().int().positive(),
      items: z.array(
        z.object({
          section: z.enum(["warmup", "main", "cooldown"]).default("main"),
          status: z
            .enum(["planned", "completed", "skipped"])
            .default("planned"),
          workoutItemId: z.string().min(1).optional(),
          exerciseId: z.string().min(1),
          exerciseName: z.string().min(1).optional(),
          sets: z.number().int().positive(),
          workDurationSeconds: z.number().int().positive(),
          perSide: z.boolean(),
          restAfterSetSeconds: z.number().int().nonnegative(),
          restAfterExerciseSeconds: z.number().int().nonnegative(),
        }),
      ),
    })
    .optional(),
  todayAdaptations: z.array(sessionAdaptationSchema).optional(),
});

const completedSessionSchema = z.object({
  id: z.string().min(1),
  activityId: z.string().min(1).optional(),
  sessionId: z.string().min(1),
  workoutId: z.string().min(1),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().min(1),
  intensity: z.enum(intensityLevels),
  snapshot: snapshotSchema.optional(),
  actualDurationSeconds: z.number().int().nonnegative().optional(),
});

const feedbackEventSchema = z.object({
  id: z.string().min(1),
  completionId: z.string().min(1),
  sessionId: z.string().min(1),
  workoutId: z.string().min(1),
  completedAt: z.string().min(1),
  recordedAt: z.string().min(1),
  rating: z.enum(workoutFeedbackValues),
  affectedArea: z.enum(feedbackAffectedAreaValues).optional(),
  snapshot: snapshotSchema.optional(),
});

const feedbackDecisionEventSchema = z.object({
  id: z.string().min(1),
  feedbackEventId: z.string().min(1),
  decision: z.enum(["applied", "kept", "cleared"]),
  recordedAt: z.string().min(1),
});

const activityStateV2Schema = z.object({
  version: z.literal(2),
  summaries: z.array(workoutActivitySchema),
  completions: z.array(completedSessionSchema),
  feedbackEvents: z.array(feedbackEventSchema),
  feedbackDecisionEvents: z.array(feedbackDecisionEventSchema).default([]),
});

const sessionActivitySchema = z.object({
  id: z.string().min(1),
  planId: z.string().min(1).optional(),
  sessionId: z.string().min(1),
  workoutId: z.string().min(1),
  scheduledDate: z.string().date(),
  status: sessionLifecycleStatusSchema,
  plannedSnapshot: snapshotSchema.optional(),
  adaptedSnapshot: snapshotSchema.optional(),
  executedSnapshot: snapshotSchema.optional(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  skippedAt: z.string().datetime().optional(),
  missedAt: z.string().datetime().optional(),
  cancelledAt: z.string().datetime().optional(),
  incompleteAt: z.string().datetime().optional(),
  actualDurationSeconds: z.number().int().nonnegative().optional(),
  intensity: z.enum(intensityLevels).optional(),
  completionId: z.string().min(1).optional(),
});

const activityStateV3Schema = z.object({
  version: z.literal(3),
  summaries: z.array(workoutActivitySchema),
  completions: z.array(completedSessionSchema),
  activities: z.array(sessionActivitySchema),
  feedbackEvents: z.array(feedbackEventSchema),
  feedbackDecisionEvents: z.array(feedbackDecisionEventSchema).default([]),
});

const activityStateSchema = activityStateV3Schema.extend({
  version: z.literal(4),
});

const legacyActivitySchema = workoutActivitySchema.extend({
  lastFeedback: z
    .object({
      value: z.enum(workoutFeedbackValues),
      recordedAt: z.string().min(1),
    })
    .optional(),
});
const legacyActivityListSchema = z.array(legacyActivitySchema);

type ActivityState = z.infer<typeof activityStateSchema>;

function emptyState(): ActivityState {
  return {
    version: 4,
    summaries: [],
    completions: [],
    activities: [],
    feedbackEvents: [],
    feedbackDecisionEvents: [],
  };
}

function byMostRecent(
  left: { completedAt?: string; lastStartedAt?: string; recordedAt?: string },
  right: { completedAt?: string; lastStartedAt?: string; recordedAt?: string },
) {
  const leftDate =
    left.recordedAt ?? left.completedAt ?? left.lastStartedAt ?? "";
  const rightDate =
    right.recordedAt ?? right.completedAt ?? right.lastStartedAt ?? "";
  return rightDate.localeCompare(leftDate);
}

function byActivityDate(left: SessionActivity, right: SessionActivity) {
  return (
    right.scheduledDate.localeCompare(left.scheduledDate) ||
    (
      right.completedAt ??
      right.skippedAt ??
      right.cancelledAt ??
      right.incompleteAt ??
      ""
    ).localeCompare(
      left.completedAt ??
        left.skippedAt ??
        left.cancelledAt ??
        left.incompleteAt ??
        "",
    ) ||
    right.id.localeCompare(left.id)
  );
}

function activityFromCompletion(
  completion: CompletedWorkoutSession,
): SessionActivity {
  return {
    id: `activity-${completion.id}`,
    sessionId: completion.sessionId,
    workoutId: completion.workoutId,
    scheduledDate: toDateKey(new Date(completion.completedAt)),
    status: "completed",
    ...(completion.snapshot ? { executedSnapshot: completion.snapshot } : {}),
    completedAt: completion.completedAt,
    ...(completion.actualDurationSeconds !== undefined
      ? { actualDurationSeconds: completion.actualDurationSeconds }
      : {}),
    intensity: completion.intensity,
    completionId: completion.id,
  };
}

function migrateV2(
  previous: z.infer<typeof activityStateV2Schema>,
): ActivityState {
  return {
    version: 4,
    summaries: previous.summaries,
    completions: previous.completions,
    activities: previous.completions.map(activityFromCompletion),
    feedbackEvents: previous.feedbackEvents,
    feedbackDecisionEvents: previous.feedbackDecisionEvents,
  };
}

function baselineSnapshot(
  snapshot: z.infer<typeof snapshotSchema>,
): z.infer<typeof snapshotSchema> {
  if (!snapshot.originalSession) {
    const planned = { ...snapshot };
    delete planned.todayAdaptations;
    return planned;
  }
  return {
    workoutName: snapshot.workoutName,
    focus: snapshot.focus,
    bodyAreas: snapshot.bodyAreas,
    items: snapshot.originalSession.items,
    ...(snapshot.progressionWeek
      ? { progressionWeek: snapshot.progressionWeek }
      : {}),
    ...(snapshot.progressionPhase
      ? { progressionPhase: snapshot.progressionPhase }
      : {}),
    targetDurationSeconds: snapshot.originalSession.targetDurationSeconds,
    estimatedDurationSeconds: snapshot.originalSession.estimatedDurationSeconds,
  };
}

function migrateV3(
  previous: z.infer<typeof activityStateV3Schema>,
): ActivityState {
  return {
    ...previous,
    version: 4,
    activities: previous.activities.map((activity) => {
      if (!activity.plannedSnapshot) return activity;
      const wasAdapted =
        (activity.plannedSnapshot.todayAdaptations?.length ?? 0) > 0;
      return {
        ...activity,
        plannedSnapshot: baselineSnapshot(activity.plannedSnapshot),
        ...(wasAdapted ? { adaptedSnapshot: activity.plannedSnapshot } : {}),
      };
    }),
  };
}

function migrateLegacy(
  legacyActivities: z.infer<typeof legacyActivityListSchema>,
): ActivityState {
  const state = emptyState();
  for (const legacy of legacyActivities) {
    const { lastFeedback, ...summary } = legacy;
    state.summaries.push(summary);
    const completedAt =
      legacy.lastCompletedAt ?? lastFeedback?.recordedAt ?? undefined;
    if (!completedAt) continue;
    const sessionId = `legacy-${legacy.workoutId}-${completedAt}`;
    const completionId = `completion-${sessionId}`;
    state.completions.push({
      id: completionId,
      sessionId,
      workoutId: legacy.workoutId,
      completedAt,
      intensity: legacy.lastIntensity,
    });
    state.activities.push(activityFromCompletion(state.completions.at(-1)!));
    if (lastFeedback) {
      state.feedbackEvents.push({
        id: `${completionId}-feedback`,
        completionId,
        sessionId,
        workoutId: legacy.workoutId,
        completedAt,
        recordedAt: lastFeedback.recordedAt,
        rating: lastFeedback.value,
      });
    }
  }
  return state;
}

export class LocalWorkoutActivityRepository implements WorkoutActivityRepository {
  constructor(private readonly storage: StorageLike | null) {}

  list(): WorkoutActivity[] {
    return [...this.loadState().summaries].sort(byMostRecent);
  }

  listCompletions(): CompletedWorkoutSession[] {
    return [...this.loadState().completions].sort(byMostRecent);
  }

  getActivityHistory(
    currentDateKey = toDateKey(new Date()),
  ): SessionActivity[] {
    const state = this.loadState();
    const changed = this.materializeMissed(state, currentDateKey);
    if (changed) this.storeState(state);
    return [...state.activities].sort(byActivityDate);
  }

  getActivityById(
    activityId: string,
    currentDateKey = toDateKey(new Date()),
  ): SessionActivity | null {
    return (
      this.getActivityHistory(currentDateKey).find(
        (activity) => activity.id === activityId,
      ) ?? null
    );
  }

  getActivitiesForDateRange(
    startDate: string,
    endDate: string,
    currentDateKey = toDateKey(new Date()),
  ): SessionActivity[] {
    return this.getActivityHistory(currentDateKey).filter(
      (activity) =>
        activity.scheduledDate >= startDate &&
        activity.scheduledDate <= endDate,
    );
  }

  getFeedbackForSession(sessionId: string): WorkoutFeedbackEvent[] {
    return this.loadState()
      .feedbackEvents.filter((event) => event.sessionId === sessionId)
      .sort(byMostRecent);
  }

  getFeedbackForCompletion(completionId: string): WorkoutFeedbackEvent | null {
    return (
      this.loadState().feedbackEvents.find(
        (event) => event.completionId === completionId,
      ) ?? null
    );
  }

  getRecentFeedback(limit = 10): WorkoutFeedbackEvent[] {
    return [...this.loadState().feedbackEvents]
      .sort(byMostRecent)
      .slice(0, Math.max(0, limit));
  }

  getRecentFeedbackForAdaptation(limit = 10): WorkoutFeedbackEvent[] {
    const state = this.loadState();
    const resolvedFeedbackIds = new Set(
      state.feedbackDecisionEvents
        .filter(
          (event) => event.decision === "kept" || event.decision === "cleared",
        )
        .map((event) => event.feedbackEventId),
    );
    return [...state.feedbackEvents]
      .sort(byMostRecent)
      .filter((event) => !resolvedFeedbackIds.has(event.id))
      .slice(0, Math.max(0, limit));
  }

  getActivePainFeedback(): WorkoutFeedbackEvent[] {
    const state = this.loadState();
    const clearedIds = new Set(
      state.feedbackDecisionEvents
        .filter((event) => event.decision === "cleared")
        .map((event) => event.feedbackEventId),
    );
    return state.feedbackEvents
      .filter(
        (event) =>
          event.rating === "pain-or-discomfort" && !clearedIds.has(event.id),
      )
      .sort(byMostRecent);
  }

  recordStarted(
    workoutId: string,
    intensity: WorkoutActivity["lastIntensity"],
    startedAt = new Date(),
  ): WorkoutActivity {
    const state = this.loadState();
    const existing = state.summaries.find(
      (activity) => activity.workoutId === workoutId,
    );
    const activity: WorkoutActivity = {
      workoutId,
      lastStartedAt: startedAt.toISOString(),
      completionCount: existing?.completionCount ?? 0,
      lastIntensity: intensity,
      ...(existing?.lastCompletedAt
        ? { lastCompletedAt: existing.lastCompletedAt }
        : {}),
    };
    state.summaries = [
      activity,
      ...state.summaries.filter((item) => item.workoutId !== workoutId),
    ]
      .sort(byMostRecent)
      .slice(0, maximumStoredWorkouts);
    this.storeState(state);
    return activity;
  }

  syncScheduledSessions(
    planId: string,
    sessions: readonly ScheduledSessionActivityInput[],
    currentDateKey: string,
    changedAt = new Date(),
  ): SessionActivity[] {
    const state = this.loadState();
    this.materializeMissed(state, currentDateKey, changedAt);
    const incomingIds = new Set(
      sessions.map((session) =>
        scheduledSessionActivityId(planId, session.sessionId),
      ),
    );
    state.activities = state.activities.map((activity) => {
      if (
        activity.status !== "scheduled" ||
        !activity.planId ||
        incomingIds.has(activity.id)
      ) {
        return activity;
      }
      return {
        ...activity,
        status: "cancelled" as const,
        cancelledAt: changedAt.toISOString(),
      };
    });
    for (const session of sessions) {
      const id = scheduledSessionActivityId(planId, session.sessionId);
      const index = state.activities.findIndex(
        (activity) => activity.id === id,
      );
      if (
        index >= 0 &&
        state.activities[index].status !== "scheduled" &&
        state.activities[index].status !== "in-progress"
      ) {
        continue;
      }
      const activity: SessionActivity = {
        id,
        planId,
        sessionId: session.sessionId,
        workoutId: session.workoutId,
        scheduledDate: session.scheduledDate,
        status:
          index >= 0 && state.activities[index].status === "in-progress"
            ? "in-progress"
            : "scheduled",
        plannedSnapshot: session.plannedSnapshot,
        ...(session.adaptedSnapshot
          ? { adaptedSnapshot: session.adaptedSnapshot }
          : {}),
        ...(index >= 0 && state.activities[index].startedAt
          ? { startedAt: state.activities[index].startedAt }
          : {}),
        ...(index >= 0 && state.activities[index].intensity
          ? { intensity: state.activities[index].intensity }
          : {}),
      };
      if (index >= 0) state.activities[index] = activity;
      else state.activities.push(activity);
    }
    state.activities = state.activities
      .sort(byActivityDate)
      .slice(0, maximumStoredSessions);
    this.storeState(state);
    return [...state.activities];
  }

  markSessionStarted(
    sessionId: string,
    workoutId: string,
    intensity: WorkoutActivity["lastIntensity"],
    startedAt = new Date(),
  ): SessionActivity | null {
    const state = this.loadState();
    const index = state.activities.findIndex(
      (activity) =>
        activity.sessionId === sessionId &&
        (activity.status === "scheduled" || activity.status === "in-progress"),
    );
    if (index < 0) {
      const activity: SessionActivity = {
        id: `activity-${sessionId}`,
        sessionId,
        workoutId,
        scheduledDate: toDateKey(startedAt),
        status: "in-progress",
        startedAt: startedAt.toISOString(),
        intensity,
      };
      state.activities.push(activity);
      this.storeState(state);
      return activity;
    }
    state.activities[index] = {
      ...state.activities[index],
      status: "in-progress",
      workoutId,
      startedAt: state.activities[index].startedAt ?? startedAt.toISOString(),
      intensity,
    };
    this.storeState(state);
    return state.activities[index];
  }

  skipSession(sessionId: string, skippedAt = new Date()) {
    return this.transitionScheduled(
      sessionId,
      "skipped",
      "skippedAt",
      skippedAt,
    );
  }

  cancelSession(sessionId: string, cancelledAt = new Date()) {
    return this.transitionScheduled(
      sessionId,
      "cancelled",
      "cancelledAt",
      cancelledAt,
    );
  }

  markSessionMissed(sessionId: string, missedAt = new Date()) {
    return this.transitionScheduled(sessionId, "missed", "missedAt", missedAt);
  }

  finalizeIncompleteSession(
    sessionId: string,
    executedSnapshot: Parameters<
      WorkoutActivityRepository["finalizeIncompleteSession"]
    >[1],
    actualDurationSeconds: number,
    incompleteAt = new Date(),
  ) {
    const state = this.loadState();
    const index = state.activities.findIndex(
      (activity) =>
        activity.sessionId === sessionId && activity.status === "in-progress",
    );
    if (index < 0) return null;
    state.activities[index] = {
      ...state.activities[index],
      status: "incomplete",
      executedSnapshot:
        executedSnapshot ??
        state.activities[index].adaptedSnapshot ??
        state.activities[index].plannedSnapshot,
      actualDurationSeconds,
      incompleteAt: incompleteAt.toISOString(),
    };
    this.storeState(state);
    return state.activities[index];
  }

  discardSession(sessionId: string) {
    const state = this.loadState();
    state.activities = state.activities.filter(
      (activity) =>
        activity.sessionId !== sessionId || activity.status !== "in-progress",
    );
    this.storeState(state);
  }

  rescheduleSession(sessionId: string, scheduledDate: string) {
    const state = this.loadState();
    const index = state.activities.findIndex(
      (activity) =>
        activity.sessionId === sessionId &&
        (activity.status === "scheduled" || activity.status === "missed"),
    );
    if (index < 0) return null;
    const { missedAt: _missedAt, ...activity } = state.activities[index];
    void _missedAt;
    state.activities[index] = {
      ...activity,
      scheduledDate,
      status: "scheduled",
    };
    this.storeState(state);
    return state.activities[index];
  }

  recordCompleted(input: RecordCompletedWorkoutInput): CompletedWorkoutSession {
    const state = this.loadState();
    const previousCompletion = state.completions.find((completion) =>
      input.activityId !== undefined
        ? completion.activityId === input.activityId
        : completion.sessionId === input.sessionId,
    );
    if (previousCompletion) return previousCompletion;

    const completedAt = (input.completedAt ?? new Date()).toISOString();
    const id = `completion-${input.sessionId}-${completedAt}`;
    const scheduledActivity = state.activities.find(
      (activity) =>
        activity.sessionId === input.sessionId &&
        (activity.status === "scheduled" || activity.status === "in-progress"),
    );
    const startedAt =
      scheduledActivity?.startedAt ?? input.startedAt?.toISOString();

    const completion: CompletedWorkoutSession = {
      id,
      ...(input.activityId ? { activityId: input.activityId } : {}),
      sessionId: input.sessionId,
      workoutId: input.workoutId,
      ...(startedAt ? { startedAt } : {}),
      completedAt,
      intensity: input.intensity,
      snapshot: input.snapshot,
      ...(input.actualDurationSeconds !== undefined
        ? { actualDurationSeconds: input.actualDurationSeconds }
        : {}),
    };
    state.completions = [completion, ...state.completions]
      .sort(byMostRecent)
      .slice(0, maximumStoredSessions);

    const activityIndex = state.activities.findIndex((activity) =>
      input.activityId
        ? activity.id === input.activityId &&
          (activity.status === "scheduled" || activity.status === "in-progress")
        : activity.sessionId === input.sessionId &&
          (activity.status === "scheduled" ||
            activity.status === "in-progress"),
    );
    const completedActivity: SessionActivity = {
      ...(activityIndex >= 0
        ? state.activities[activityIndex]
        : {
            id: `activity-${completion.id}`,
            sessionId: input.sessionId,
            workoutId: input.workoutId,
            scheduledDate: toDateKey(new Date(completedAt)),
          }),
      status: "completed",
      executedSnapshot: input.snapshot,
      ...(startedAt ? { startedAt } : {}),
      completedAt,
      ...(input.actualDurationSeconds !== undefined
        ? { actualDurationSeconds: input.actualDurationSeconds }
        : {}),
      intensity: input.intensity,
      completionId: completion.id,
    };
    if (activityIndex >= 0) state.activities[activityIndex] = completedActivity;
    else state.activities.push(completedActivity);

    const existing = state.summaries.find(
      (activity) => activity.workoutId === input.workoutId,
    );
    const summary: WorkoutActivity = {
      workoutId: input.workoutId,
      lastStartedAt: existing?.lastStartedAt ?? completedAt,
      lastCompletedAt: completedAt,
      completionCount: (existing?.completionCount ?? 0) + 1,
      lastIntensity: input.intensity,
    };
    state.summaries = [
      summary,
      ...state.summaries.filter((item) => item.workoutId !== input.workoutId),
    ]
      .sort(byMostRecent)
      .slice(0, maximumStoredWorkouts);
    this.storeState(state);
    return completion;
  }

  saveFeedbackEvent(
    input: SaveFeedbackEventInput,
  ): WorkoutFeedbackEvent | null {
    const state = this.loadState();
    const completion = state.completions.find(
      (candidate) => candidate.id === input.completionId,
    );
    if (!completion) return null;
    const existing = state.feedbackEvents.find(
      (event) => event.completionId === completion.id,
    );
    if (existing) return existing;
    const event: WorkoutFeedbackEvent = {
      id: `${completion.id}-feedback`,
      completionId: completion.id,
      sessionId: completion.sessionId,
      workoutId: completion.workoutId,
      completedAt: completion.completedAt,
      recordedAt: (input.recordedAt ?? new Date()).toISOString(),
      rating: input.rating,
      ...(input.affectedArea ? { affectedArea: input.affectedArea } : {}),
      ...(completion.snapshot ? { snapshot: completion.snapshot } : {}),
    };
    state.feedbackEvents = [event, ...state.feedbackEvents]
      .sort(byMostRecent)
      .slice(0, maximumStoredSessions);
    this.storeState(state);
    return event;
  }

  saveInWorkoutDiscomfort(
    input: SaveInWorkoutDiscomfortInput,
  ): WorkoutFeedbackEvent {
    const state = this.loadState();
    const recordedAt = (input.recordedAt ?? new Date()).toISOString();
    const existing = state.feedbackEvents.find(
      (event) =>
        event.sessionId === input.sessionId &&
        event.rating === "pain-or-discomfort" &&
        event.affectedArea === input.affectedArea,
    );
    if (existing) return existing;
    const event: WorkoutFeedbackEvent = {
      id: `in-workout-${input.sessionId}-${recordedAt}`,
      completionId: `in-workout-${input.sessionId}`,
      sessionId: input.sessionId,
      workoutId: input.workoutId,
      completedAt: recordedAt,
      recordedAt,
      rating: "pain-or-discomfort",
      affectedArea: input.affectedArea,
      snapshot: input.snapshot,
    };
    state.feedbackEvents = [event, ...state.feedbackEvents].slice(
      0,
      maximumStoredSessions,
    );
    this.storeState(state);
    return event;
  }

  clearPainFeedbackBlock(feedbackEventId: string, recordedAt = new Date()) {
    const state = this.loadState();
    const feedback = state.feedbackEvents.find(
      (event) =>
        event.id === feedbackEventId && event.rating === "pain-or-discomfort",
    );
    if (!feedback) return;
    const decision: WorkoutFeedbackDecisionEvent = {
      id: `${feedback.id}-decision`,
      feedbackEventId: feedback.id,
      decision: "cleared",
      recordedAt: recordedAt.toISOString(),
    };
    state.feedbackDecisionEvents = [
      decision,
      ...state.feedbackDecisionEvents.filter(
        (event) => event.feedbackEventId !== feedback.id,
      ),
    ].slice(0, maximumStoredSessions);
    this.storeState(state);
  }

  saveFeedbackDecision(
    input: SaveFeedbackDecisionInput,
  ): WorkoutFeedbackDecisionEvent | null {
    const state = this.loadState();
    const feedback = state.feedbackEvents.find(
      (event) => event.id === input.feedbackEventId,
    );
    if (!feedback) return null;
    const existing = state.feedbackDecisionEvents.find(
      (event) => event.feedbackEventId === feedback.id,
    );
    if (existing) return existing;
    const decision: WorkoutFeedbackDecisionEvent = {
      id: `${feedback.id}-decision`,
      feedbackEventId: feedback.id,
      decision: input.decision,
      recordedAt: (input.recordedAt ?? new Date()).toISOString(),
    };
    state.feedbackDecisionEvents = [decision, ...state.feedbackDecisionEvents]
      .sort(byMostRecent)
      .slice(0, maximumStoredSessions);
    this.storeState(state);
    return decision;
  }

  private loadState(): ActivityState {
    if (!this.storage) return emptyState();
    try {
      const serialized = this.storage.getItem(workoutActivityStorageKey);
      if (!serialized) return emptyState();
      const raw: unknown = JSON.parse(serialized);
      const current = activityStateSchema.safeParse(raw);
      if (current.success) return current.data;
      const versionThree = activityStateV3Schema.safeParse(raw);
      if (versionThree.success) {
        const migrated = migrateV3(versionThree.data);
        this.storeState(migrated);
        return migrated;
      }
      const previous = activityStateV2Schema.safeParse(raw);
      if (previous.success) {
        const migrated = migrateV2(previous.data);
        this.storeState(migrated);
        return migrated;
      }
      const legacy = legacyActivityListSchema.safeParse(raw);
      if (!legacy.success) return emptyState();
      const migrated = migrateLegacy(legacy.data);
      this.storeState(migrated);
      return migrated;
    } catch {
      return emptyState();
    }
  }

  private materializeMissed(
    state: ActivityState,
    currentDateKey: string,
    missedAt = new Date(),
  ) {
    let changed = false;
    state.activities = state.activities.map((activity) => {
      if (
        activity.status !== "scheduled" ||
        activity.scheduledDate >= currentDateKey
      ) {
        return activity;
      }
      changed = true;
      return {
        ...activity,
        status: "missed" as const,
        missedAt: missedAt.toISOString(),
      };
    });
    return changed;
  }

  private transitionScheduled(
    sessionId: string,
    status: "skipped" | "missed" | "cancelled",
    timestampField: "skippedAt" | "missedAt" | "cancelledAt",
    timestamp: Date,
  ): SessionActivity | null {
    const state = this.loadState();
    const index = state.activities.findIndex(
      (activity) =>
        activity.sessionId === sessionId &&
        (activity.status === "scheduled" ||
          (status === "skipped" && activity.status === "missed")),
    );
    if (index < 0) return null;
    state.activities[index] = {
      ...state.activities[index],
      status,
      [timestampField]: timestamp.toISOString(),
    };
    this.storeState(state);
    return state.activities[index];
  }

  private storeState(state: ActivityState) {
    try {
      this.storage?.setItem(
        workoutActivityStorageKey,
        JSON.stringify(activityStateSchema.parse(state)),
      );
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(workoutActivityChangedEvent));
      }
    } catch {
      // Persistence is an enhancement; the live session remains authoritative.
    }
  }
}

export function createBrowserWorkoutActivityRepository(): WorkoutActivityRepository {
  try {
    return new LocalWorkoutActivityRepository(createBrowserUserStorage());
  } catch {
    return new LocalWorkoutActivityRepository(null);
  }
}
