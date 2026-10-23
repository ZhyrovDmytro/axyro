import { expect, test } from "@playwright/test";
import { generateTrainingPlan } from "../../src/domain/training-plan/generate-training-plan";
import { representativeAthleteProfiles } from "../../src/domain/training-plan/evaluation-profiles";
import { addDays, toDateKey } from "../../src/domain/training-plan/date";
import { exercises } from "../../src/content/exercises";
import { createPlannedSessionSnapshot } from "../../src/domain/workout/create-workout-session-snapshot";
import {
  LocalWorkoutActivityRepository,
  workoutActivityStorageKey,
} from "../../src/services/persistence/local-workout-activity-repository";

test("off-day completion appears as extra without advancing plan progress", async ({
  page,
}, testInfo) => {
  const login = await page.request.post("/api/auth/signin", {
    headers: { Origin: new URL(String(testInfo.project.use.baseURL)).origin },
    data: { email: "admin", password: "admin" },
  });
  expect(login.ok()).toBe(true);
  const today = toDateKey(new Date());
  const plan = generateTrainingPlan(
    representativeAthleteProfiles[1],
    new Date(),
  );
  plan.sessions[0].scheduledDate = addDays(today, 1);
  plan.sessions[1].scheduledDate = addDays(today, 1);
  plan.games = [
    {
      id: "outcome-match",
      date: today,
      label: "Club match",
      importance: "normal",
    },
  ];
  const saved = new Map<string, string>();
  const repository = new LocalWorkoutActivityRepository({
    getItem: (key) => saved.get(key) ?? null,
    setItem: (key, value) => {
      saved.set(key, value);
    },
  });
  repository.syncScheduledSessions(
    plan.generatedAt,
    plan.sessions.map((session) => ({
      sessionId: session.id,
      planId: plan.generatedAt,
      workoutId: session.workout.id,
      scheduledDate: session.scheduledDate,
      plannedSnapshot: createPlannedSessionSnapshot(session, exercises),
    })),
    today,
  );
  repository.recordCompleted({
    sessionId: plan.sessions[0].id,
    workoutId: plan.sessions[0].workout.id,
    intensity: "light",
    snapshot: createPlannedSessionSnapshot(plan.sessions[0], exercises),
  });
  repository.skipSession(plan.sessions[1].id);
  await page.goto("/plan/calendar");
  await page.evaluate(
    ({ plan, activities, key }) => {
      localStorage.setItem(
        "veyro.owner.development-admin.veyro.training-plan.v1",
        JSON.stringify(plan),
      );
      localStorage.setItem(`veyro.owner.development-admin.${key}`, activities);
    },
    {
      plan,
      activities: saved.get(workoutActivityStorageKey)!,
      key: workoutActivityStorageKey,
    },
  );
  await page.reload();
  await page.goto("/plan");
  await expect(
    page.getByRole("heading", {
      name: `0 of ${plan.sessions.length} planned sessions complete`,
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("+1 extra session completed", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "0",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/");
  await expect(
    page.getByText(`0 of ${plan.sessions.length} planned sessions completed`, {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("+1 extra session completed", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
