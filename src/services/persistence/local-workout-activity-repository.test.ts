import { describe, expect, it } from "vitest";

import {
  scheduledSessionActivityId,
  type WorkoutSessionSnapshot,
} from "./workout-activity-repository";
import {
  LocalWorkoutActivityRepository,
  workoutActivityStorageKey,
} from "./local-workout-activity-repository";
import type { StorageLike } from "./storage";

function createMemoryStorage(): StorageLike & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
}

const snapshot: WorkoutSessionSnapshot = {
  workoutName: "Foundation strength",
  focus: ["strength"],
  bodyAreas: ["core", "legs"],
  items: [
    {
      section: "main",
      status: "completed",
      exerciseId: "dead-bug",
      sets: 2,
      workDurationSeconds: 30,
      perSide: false,
      restAfterSetSeconds: 15,
      restAfterExerciseSeconds: 20,
    },
  ],
  progressionWeek: 2,
  progressionPhase: "build",
  targetDurationSeconds: 600,
  estimatedDurationSeconds: 580,
};

describe("LocalWorkoutActivityRepository", () => {
  it("keeps aggregate recents while appending immutable completions", () => {
    const repository = new LocalWorkoutActivityRepository(
      createMemoryStorage(),
    );
    repository.recordStarted(
      "foundation-strength",
      "light",
      new Date("2026-09-25T09:00:00.000Z"),
    );
    const first = repository.recordCompleted({
      sessionId: "plan-session-1",
      workoutId: "foundation-strength",
      intensity: "standard",
      snapshot,
      completedAt: new Date("2026-09-25T09:08:00.000Z"),
    });
    const second = repository.recordCompleted({
      sessionId: "plan-session-2",
      workoutId: "foundation-strength",
      intensity: "challenging",
      snapshot: { ...snapshot, progressionWeek: 3, progressionPhase: "peak" },
      completedAt: new Date("2026-09-26T09:08:00.000Z"),
    });

    expect(repository.list()).toEqual([
      {
        workoutId: "foundation-strength",
        lastStartedAt: "2026-09-25T09:00:00.000Z",
        lastCompletedAt: "2026-09-26T09:08:00.000Z",
        completionCount: 2,
        lastIntensity: "challenging",
      },
    ]);
    expect(repository.listCompletions().map((item) => item.id)).toEqual([
      second.id,
      first.id,
    ]);
    expect(first.snapshot).toEqual(snapshot);
  });

  it("preserves the original prescription and today adaptations in history", () => {
    const repository = new LocalWorkoutActivityRepository(
      createMemoryStorage(),
    );
    const adaptedSnapshot: WorkoutSessionSnapshot = {
      ...snapshot,
      targetDurationSeconds: 15 * 60,
      estimatedDurationSeconds: 890,
      originalSession: {
        targetDurationSeconds: 20 * 60,
        estimatedDurationSeconds: 1190,
        items: snapshot.items.map((item) => ({
          ...item,
          status: "planned" as const,
        })),
      },
      todayAdaptations: [
        { type: "less_time", requestedDurationSeconds: 15 * 60 },
        {
          type: "equipment_unavailable",
          equipmentIds: ["dumbbell"],
        },
      ],
    };

    repository.recordCompleted({
      sessionId: "adapted-plan-session",
      workoutId: "foundation-strength",
      intensity: "standard",
      snapshot: adaptedSnapshot,
      completedAt: new Date("2026-09-25T09:08:00.000Z"),
    });

    expect(repository.listCompletions()[0].snapshot).toEqual(adaptedSnapshot);
  });

  it("preserves section identity and skipped status in completion history", () => {
    const repository = new LocalWorkoutActivityRepository(
      createMemoryStorage(),
    );
    const sectionedSnapshot: WorkoutSessionSnapshot = {
      ...snapshot,
      items: [
        { ...snapshot.items[0], section: "warmup", status: "completed" },
        { ...snapshot.items[0], section: "main", status: "completed" },
        { ...snapshot.items[0], section: "cooldown", status: "skipped" },
      ],
    };

    repository.recordCompleted({
      sessionId: "sectioned-session",
      workoutId: "foundation-strength",
      intensity: "standard",
      snapshot: sectionedSnapshot,
      completedAt: new Date("2026-09-25T09:08:00.000Z"),
    });

    expect(repository.listCompletions()[0]?.snapshot?.items).toEqual(
      sectionedSnapshot.items,
    );
  });

  it("materializes only past local calendar days as missed", () => {
    const repository = new LocalWorkoutActivityRepository(
      createMemoryStorage(),
    );
    repository.syncScheduledSessions(
      "plan-1",
      [
        {
          planId: "plan-1",
          sessionId: "yesterday",
          workoutId: "foundation-strength",
          scheduledDate: "2026-09-30",
          plannedSnapshot: snapshot,
        },
        {
          planId: "plan-1",
          sessionId: "today",
          workoutId: "foundation-strength",
          scheduledDate: "2026-10-01",
          plannedSnapshot: snapshot,
        },
        {
          planId: "plan-1",
          sessionId: "tomorrow",
          workoutId: "foundation-strength",
          scheduledDate: "2026-10-02",
          plannedSnapshot: snapshot,
        },
      ],
      "2026-10-01",
      new Date("2026-10-01T00:05:00+02:00"),
    );

    expect(
      Object.fromEntries(
        repository
          .getActivityHistory("2026-10-01")
          .map((activity) => [activity.sessionId, activity.status]),
      ),
    ).toEqual({
      tomorrow: "scheduled",
      today: "scheduled",
      yesterday: "missed",
    });
  });

  it("does not mark an interrupted in-progress session as missed", () => {
    const repository = new LocalWorkoutActivityRepository(
      createMemoryStorage(),
    );
    repository.syncScheduledSessions(
      "plan-1",
      [
        {
          planId: "plan-1",
          sessionId: "interrupted",
          workoutId: "foundation-strength",
          scheduledDate: "2026-10-01",
          plannedSnapshot: snapshot,
        },
      ],
      "2026-10-01",
    );
    repository.markSessionStarted(
      "interrupted",
      "foundation-strength",
      "standard",
      new Date("2026-10-01T08:00:00.000Z"),
    );

    expect(repository.getActivityHistory("2026-10-04")[0]).toMatchObject({
      status: "in-progress",
      startedAt: "2026-10-01T08:00:00.000Z",
    });
  });

  it("finalizes one interrupted activity as incomplete without a completion", () => {
    const repository = new LocalWorkoutActivityRepository(
      createMemoryStorage(),
    );
    repository.syncScheduledSessions(
      "plan-1",
      [
        {
          planId: "plan-1",
          sessionId: "interrupted",
          workoutId: "foundation-strength",
          scheduledDate: "2026-10-01",
          plannedSnapshot: snapshot,
        },
      ],
      "2026-10-01",
    );
    repository.markSessionStarted(
      "interrupted",
      "foundation-strength",
      "standard",
    );
    repository.finalizeIncompleteSession(
      "interrupted",
      undefined,
      252,
      new Date("2026-10-01T08:05:00.000Z"),
    );

    expect(repository.listCompletions()).toEqual([]);
    expect(repository.getActivityHistory("2026-10-02")[0]).toMatchObject({
      status: "incomplete",
      actualDurationSeconds: 252,
      incompleteAt: "2026-10-01T08:05:00.000Z",
      executedSnapshot: snapshot,
    });
  });

  it("reschedules one missed occurrence without creating a ghost record", () => {
    const repository = new LocalWorkoutActivityRepository(
      createMemoryStorage(),
    );
    repository.syncScheduledSessions(
      "plan-1",
      [
        {
          planId: "plan-1",
          sessionId: "move-me",
          workoutId: "foundation-strength",
          scheduledDate: "2026-10-01",
          plannedSnapshot: snapshot,
        },
      ],
      "2026-10-02",
    );
    repository.rescheduleSession("move-me", "2026-10-05");

    const matching = repository
      .getActivityHistory("2026-10-02")
      .filter((activity) => activity.sessionId === "move-me");
    expect(matching).toHaveLength(1);
    expect(matching[0]).toMatchObject({
      status: "scheduled",
      scheduledDate: "2026-10-05",
    });
    expect(matching[0].missedAt).toBeUndefined();
  });

  it("keeps planned and adapted prescriptions as separate activity snapshots", () => {
    const repository = new LocalWorkoutActivityRepository(
      createMemoryStorage(),
    );
    const adaptedSnapshot: WorkoutSessionSnapshot = {
      ...snapshot,
      targetDurationSeconds: 15 * 60,
      estimatedDurationSeconds: 880,
      todayAdaptations: [
        { type: "less_time", requestedDurationSeconds: 15 * 60 },
      ],
    };

    repository.syncScheduledSessions(
      "plan-1",
      [
        {
          planId: "plan-1",
          sessionId: "adapted-session",
          workoutId: "foundation-strength",
          scheduledDate: "2026-10-01",
          plannedSnapshot: snapshot,
          adaptedSnapshot,
        },
      ],
      "2026-10-01",
    );

    expect(repository.getActivityHistory("2026-10-01")[0]).toMatchObject({
      plannedSnapshot: {
        targetDurationSeconds: 600,
        estimatedDurationSeconds: 580,
      },
      adaptedSnapshot: {
        targetDurationSeconds: 900,
        estimatedDurationSeconds: 880,
        todayAdaptations: [{ type: "less_time" }],
      },
    });
  });

  it("migrates legacy nested plan provenance into separate snapshots", () => {
    const storage = createMemoryStorage();
    const legacyAdaptedSnapshot: WorkoutSessionSnapshot = {
      ...snapshot,
      targetDurationSeconds: 15 * 60,
      estimatedDurationSeconds: 880,
      originalSession: {
        targetDurationSeconds: 20 * 60,
        estimatedDurationSeconds: 1180,
        items: snapshot.items.map((item) => ({
          ...item,
          status: "planned" as const,
        })),
      },
      todayAdaptations: [
        { type: "less_time", requestedDurationSeconds: 15 * 60 },
      ],
    };
    storage.setItem(
      workoutActivityStorageKey,
      JSON.stringify({
        version: 3,
        summaries: [],
        completions: [],
        activities: [
          {
            id: "planned-plan-1-session-1",
            planId: "plan-1",
            sessionId: "session-1",
            workoutId: "foundation-strength",
            scheduledDate: "2026-10-01",
            status: "scheduled",
            plannedSnapshot: legacyAdaptedSnapshot,
          },
        ],
        feedbackEvents: [],
        feedbackDecisionEvents: [],
      }),
    );

    const [activity] = new LocalWorkoutActivityRepository(
      storage,
    ).getActivityHistory("2026-10-01");

    expect(activity.plannedSnapshot).toMatchObject({
      targetDurationSeconds: 1200,
      estimatedDurationSeconds: 1180,
    });
    expect(activity.plannedSnapshot?.todayAdaptations).toBeUndefined();
    expect(activity.adaptedSnapshot).toEqual(legacyAdaptedSnapshot);
    expect(
      JSON.parse(storage.values.get(workoutActivityStorageKey)!),
    ).toMatchObject({ version: 4 });
  });

  it("keeps explicit skip and cancellation distinct and terminal", () => {
    const repository = new LocalWorkoutActivityRepository(
      createMemoryStorage(),
    );
    const scheduled = [
      {
        planId: "plan-1",
        sessionId: "skip-me",
        workoutId: "foundation-strength",
        scheduledDate: "2026-10-01",
        plannedSnapshot: snapshot,
      },
      {
        planId: "plan-1",
        sessionId: "cancel-me",
        workoutId: "foundation-strength",
        scheduledDate: "2026-10-02",
        plannedSnapshot: snapshot,
      },
    ];
    repository.syncScheduledSessions("plan-1", scheduled, "2026-10-01");
    repository.skipSession("skip-me", new Date("2026-10-01T08:00:00.000Z"));
    repository.cancelSession("cancel-me", new Date("2026-10-01T08:01:00.000Z"));
    repository.syncScheduledSessions("plan-1", scheduled, "2026-10-03");

    const history = repository.getActivityHistory("2026-10-03");
    expect(history.find((item) => item.sessionId === "skip-me")).toMatchObject({
      status: "skipped",
      skippedAt: "2026-10-01T08:00:00.000Z",
    });
    expect(
      history.find((item) => item.sessionId === "cancel-me"),
    ).toMatchObject({
      status: "cancelled",
      cancelledAt: "2026-10-01T08:01:00.000Z",
    });
  });

  it("completes a scheduled session once with its execution snapshot and timing", () => {
    const repository = new LocalWorkoutActivityRepository(
      createMemoryStorage(),
    );
    repository.syncScheduledSessions(
      "plan-1",
      [
        {
          planId: "plan-1",
          sessionId: "session-1",
          workoutId: "foundation-strength",
          scheduledDate: "2026-10-01",
          plannedSnapshot: snapshot,
        },
      ],
      "2026-10-01",
    );
    repository.markSessionStarted(
      "session-1",
      "foundation-strength",
      "standard",
      new Date("2026-10-01T08:00:00.000Z"),
    );
    const first = repository.recordCompleted({
      sessionId: "session-1",
      workoutId: "foundation-strength",
      intensity: "standard",
      snapshot: {
        ...snapshot,
        items: [{ ...snapshot.items[0], status: "skipped", completedSets: 0 }],
      },
      actualDurationSeconds: 543,
      completedAt: new Date("2026-10-01T08:10:00.000Z"),
    });
    const duplicate = repository.recordCompleted({
      sessionId: "session-1",
      workoutId: "foundation-strength",
      intensity: "challenging",
      snapshot,
      actualDurationSeconds: 999,
      completedAt: new Date("2026-10-01T08:11:00.000Z"),
    });

    expect(duplicate).toEqual(first);
    expect(repository.listCompletions()).toHaveLength(1);
    expect(repository.list()[0]?.completionCount).toBe(1);
    expect(repository.getActivityHistory("2026-10-02")[0]).toMatchObject({
      status: "completed",
      startedAt: "2026-10-01T08:00:00.000Z",
      completedAt: "2026-10-01T08:10:00.000Z",
      actualDurationSeconds: 543,
      executedSnapshot: {
        items: [{ status: "skipped", completedSets: 0 }],
      },
    });
  });

  it("cancels removed future sessions without rewriting terminal history", () => {
    const repository = new LocalWorkoutActivityRepository(
      createMemoryStorage(),
    );
    repository.syncScheduledSessions(
      "old-plan",
      [
        {
          planId: "old-plan",
          sessionId: "removed",
          workoutId: "foundation-strength",
          scheduledDate: "2026-10-03",
          plannedSnapshot: snapshot,
        },
      ],
      "2026-10-01",
    );
    repository.syncScheduledSessions(
      "new-plan",
      [],
      "2026-10-01",
      new Date("2026-10-01T09:00:00.000Z"),
    );

    expect(repository.getActivityHistory("2026-10-04")[0]).toMatchObject({
      sessionId: "removed",
      status: "cancelled",
      cancelledAt: "2026-10-01T09:00:00.000Z",
    });
  });

  it("scopes idempotent completions to a plan activity, not a reused session ID", () => {
    const repository = new LocalWorkoutActivityRepository(
      createMemoryStorage(),
    );
    const session = {
      planId: "old-plan",
      sessionId: "session-2026-10-01-1",
      workoutId: "foundation-strength",
      scheduledDate: "2026-10-01",
      plannedSnapshot: snapshot,
    };
    const oldActivityId = scheduledSessionActivityId(
      session.planId,
      session.sessionId,
    );
    repository.syncScheduledSessions("old-plan", [session], "2026-10-01");
    repository.recordCompleted({
      activityId: oldActivityId,
      sessionId: session.sessionId,
      workoutId: session.workoutId,
      intensity: "standard",
      snapshot,
      completedAt: new Date("2026-10-01T08:10:00.000Z"),
    });

    const replacement = { ...session, planId: "new-plan" };
    const newActivityId = scheduledSessionActivityId(
      replacement.planId,
      replacement.sessionId,
    );
    repository.syncScheduledSessions("new-plan", [replacement], "2026-10-01");
    repository.recordCompleted({
      activityId: newActivityId,
      sessionId: replacement.sessionId,
      workoutId: replacement.workoutId,
      intensity: "light",
      snapshot,
      completedAt: new Date("2026-10-01T10:10:00.000Z"),
    });

    expect(repository.listCompletions()).toHaveLength(2);
    expect(
      repository
        .getActivityHistory("2026-10-02")
        .filter((activity) => activity.status === "completed"),
    ).toHaveLength(2);
  });

  it("links one immutable feedback event to each completion", () => {
    const repository = new LocalWorkoutActivityRepository(
      createMemoryStorage(),
    );
    const firstCompletion = repository.recordCompleted({
      sessionId: "plan-session-1",
      workoutId: "foundation-strength",
      intensity: "standard",
      snapshot,
      completedAt: new Date("2026-09-25T09:08:00.000Z"),
    });
    const secondCompletion = repository.recordCompleted({
      sessionId: "plan-session-2",
      workoutId: "foundation-strength",
      intensity: "standard",
      snapshot,
      completedAt: new Date("2026-09-26T09:08:00.000Z"),
    });

    const firstFeedback = repository.saveFeedbackEvent({
      completionId: firstCompletion.id,
      rating: "too-hard",
      recordedAt: new Date("2026-09-25T09:09:00.000Z"),
    });
    repository.saveFeedbackEvent({
      completionId: secondCompletion.id,
      rating: "pain-or-discomfort",
      affectedArea: "knee",
      recordedAt: new Date("2026-09-26T09:09:00.000Z"),
    });
    const attemptedOverwrite = repository.saveFeedbackEvent({
      completionId: firstCompletion.id,
      rating: "too-easy",
      recordedAt: new Date("2026-09-27T09:09:00.000Z"),
    });

    expect(attemptedOverwrite).toEqual(firstFeedback);
    expect(repository.getFeedbackForSession("plan-session-1")).toEqual([
      firstFeedback,
    ]);
    expect(repository.getRecentFeedback()).toMatchObject([
      {
        sessionId: "plan-session-2",
        rating: "pain-or-discomfort",
        affectedArea: "knee",
      },
      { sessionId: "plan-session-1", rating: "too-hard" },
    ]);
    expect(repository.getRecentFeedback(1)).toHaveLength(1);
  });

  it("preserves Apply or Keep as a separate decision event", () => {
    const repository = new LocalWorkoutActivityRepository(
      createMemoryStorage(),
    );
    const completion = repository.recordCompleted({
      sessionId: "plan-session-1",
      workoutId: "foundation-strength",
      intensity: "standard",
      snapshot,
      completedAt: new Date("2026-09-25T09:08:00.000Z"),
    });
    const feedback = repository.saveFeedbackEvent({
      completionId: completion.id,
      rating: "too-easy",
      recordedAt: new Date("2026-09-25T09:09:00.000Z"),
    })!;

    const kept = repository.saveFeedbackDecision({
      feedbackEventId: feedback.id,
      decision: "kept",
      recordedAt: new Date("2026-09-25T09:10:00.000Z"),
    });
    const attemptedOverwrite = repository.saveFeedbackDecision({
      feedbackEventId: feedback.id,
      decision: "applied",
      recordedAt: new Date("2026-09-25T09:11:00.000Z"),
    });

    expect(attemptedOverwrite).toEqual(kept);
    expect(repository.getRecentFeedback()).toHaveLength(1);
    expect(repository.getRecentFeedbackForAdaptation()).toEqual([]);
  });

  it("migrates v1 aggregates without inventing an exact snapshot", () => {
    const storage = createMemoryStorage();
    storage.values.set(
      workoutActivityStorageKey,
      JSON.stringify([
        {
          workoutId: "foundation-strength",
          lastStartedAt: "2026-09-25T09:00:00.000Z",
          lastCompletedAt: "2026-09-25T09:08:00.000Z",
          completionCount: 3,
          lastIntensity: "standard",
          lastFeedback: {
            value: "just-right",
            recordedAt: "2026-09-25T09:09:00.000Z",
          },
        },
      ]),
    );
    const repository = new LocalWorkoutActivityRepository(storage);

    expect(repository.list()[0].completionCount).toBe(3);
    expect(repository.listCompletions()).toMatchObject([
      { workoutId: "foundation-strength", intensity: "standard" },
    ]);
    expect(repository.listCompletions()[0].snapshot).toBeUndefined();
    expect(repository.getRecentFeedback()).toMatchObject([
      { rating: "just-right" },
    ]);
    expect(repository.getRecentFeedback()[0].snapshot).toBeUndefined();
  });

  it("recovers from invalid or inaccessible storage", () => {
    const malformed = createMemoryStorage();
    malformed.values.set(workoutActivityStorageKey, "{}");
    expect(new LocalWorkoutActivityRepository(malformed).list()).toEqual([]);

    const blocked: StorageLike = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    const repository = new LocalWorkoutActivityRepository(blocked);
    expect(() =>
      repository.recordStarted("foundation-strength", "standard"),
    ).not.toThrow();
  });
});
