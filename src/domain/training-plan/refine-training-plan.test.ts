import { expect, it } from "vitest";

import { exercises } from "@/content/exercises";
import { createPlannedSessionSnapshot } from "@/domain/workout/create-workout-session-snapshot";
import { LocalWorkoutActivityRepository } from "@/services/persistence/local-workout-activity-repository";
import { addDays } from "./date";
import { representativeAthleteProfiles } from "./evaluation-profiles";
import {
  generateTrainingPlan,
  gameRecoveryDays,
} from "./generate-training-plan";
import { refineTrainingPlan } from "./refine-training-plan";

it("reconciles a changed weekday schedule inside the original block and reviews incompatible edits", () => {
  const plan = generateTrainingPlan(
    {
      ...representativeAthleteProfiles[2],
      padelLimitations: [],
      matches: [{ date: "2026-10-20", importance: "important" }],
    },
    new Date(2026, 8, 28, 12),
  );
  const today = "2026-10-12";
  const history = plan.sessions[0];
  history.status = "completed";
  const active = plan.sessions.find(
    ({ scheduledDate }) => scheduledDate >= today,
  )!;
  const edited = plan.sessions.find(
    ({ weekNumber, workout, id, scheduledDate }) =>
      weekNumber >= 4 &&
      id !== active.id &&
      scheduledDate < "2026-11-15" &&
      workout.items.some(({ exerciseId }) =>
        exercises
          .find(({ id }) => id === exerciseId)
          ?.equipment.some((item) => item !== "none"),
      ),
  )!;
  edited.isEdited = true;
  edited.workout.name = "My weighted session";
  const moved = plan.sessions.find(
    ({ weekNumber, id, scheduledDate }) =>
      weekNumber === 5 &&
      id !== edited.id &&
      !plan.sessions.some(
        (other) => other.scheduledDate === addDays(scheduledDate, 1),
      ),
  )!;
  const data = new Map<string, string>();
  const repository = new LocalWorkoutActivityRepository({
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  });
  const scheduled = (sessions: typeof plan.sessions) =>
    sessions.map((session) => ({
      sessionId: session.id,
      planId: plan.generatedAt,
      workoutId: session.workout.id,
      scheduledDate: session.scheduledDate,
      plannedSnapshot: createPlannedSessionSnapshot(session, exercises),
    }));
  repository.syncScheduledSessions(
    plan.generatedAt,
    scheduled(plan.sessions),
    plan.startDate,
  );
  moved.scheduledDate = addDays(moved.scheduledDate, 1);
  repository.rescheduleSession(moved.id, moved.scheduledDate);
  const profile = {
    ...plan.profile,
    sessionsPerWeek: 2,
    sessionDurationMinutes: 10,
    preferredDays: ["tuesday", "friday"] as const,
    equipment: ["bodyweight"] as const,
  };
  const { plan: updated, changes } = refineTrainingPlan({
    plan,
    profile: {
      ...profile,
      preferredDays: [...profile.preferredDays],
      equipment: [...profile.equipment],
    },
    today,
    activeSessionId: active.id,
    activities: repository.getActivityHistory(today),
    revisionId: "test",
  });
  expect(updated).toMatchObject({
    generatedAt: plan.generatedAt,
    startDate: plan.startDate,
    endDate: plan.endDate,
    games: plan.games,
  });
  expect(updated.sessions).toContain(history);
  expect(updated.sessions).toContain(active);
  expect(
    updated.sessions.find(({ id }) => id === moved.id)?.scheduledDate,
  ).toBe(moved.scheduledDate);
  expect(changes).toContainEqual(
    expect.objectContaining({
      action: "Replace",
      detail: expect.stringContaining("Replaces My weighted session"),
    }),
  );
  expect(changes).toContainEqual(expect.objectContaining({ action: "Remove" }));
  expect(changes).toContainEqual(expect.objectContaining({ action: "Add" }));
  expect(
    new Set(updated.sessions.map(({ scheduledDate }) => scheduledDate)).size,
  ).toBe(updated.sessions.length);
  expect(
    updated.sessions
      .filter(({ scheduledDate }) => scheduledDate >= today)
      .every(
        ({ scheduledDate }) => !gameRecoveryDays(updated).has(scheduledDate),
      ),
  ).toBe(true);
  const activities = repository.syncScheduledSessions(
    plan.generatedAt,
    scheduled(updated.sessions),
    today,
  );
  expect(new Set(activities.map(({ id }) => id)).size).toBe(activities.length);
  expect(activities.some(({ status }) => status === "cancelled")).toBe(true);
});

it("keeps an edited prescription when the new answers are compatible", () => {
  const profile = { ...representativeAthleteProfiles[3], padelLimitations: [] };
  const plan = generateTrainingPlan(profile, new Date(2026, 8, 28, 12));
  const edited = plan.sessions[5];
  edited.isEdited = true;
  edited.workout.name = "My edited session";

  const result = refineTrainingPlan({
    plan,
    profile: { ...profile, equipment: ["bodyweight", "one-dumbbell"] },
    today: edited.scheduledDate,
    activities: [],
    revisionId: "test",
  });
  expect(result.plan.sessions.find(({ id }) => id === edited.id)).toEqual(
    edited,
  );
  expect(result.changes.every(({ date }) => date >= edited.scheduledDate)).toBe(
    true,
  );
});
