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

test("calendar shows persisted completed and skipped training alongside matches", async ({
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
  plan.sessions[0].scheduledDate = today;
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
  const calendar = page.getByRole("grid", { name: "60-day training calendar" });
  const done = calendar.getByRole("gridcell", {
    name: /Done, training:.*Club match/,
  });
  const skipped = calendar.getByRole("gridcell", {
    name: /Skipped, training:/,
  });
  await expect(done).toHaveClass(/calendar-day--completed/);
  await expect(done.locator(".calendar-status-compact")).toBeVisible();
  await expect(done.getByText("Match", { exact: true })).toBeVisible();
  await expect(skipped).toHaveClass(/calendar-day--skipped/);
  await expect(skipped.locator(".calendar-status-compact")).toBeVisible();
  await expect(done.locator(".calendar-status-compact")).toHaveText("Done");
  await expect(skipped.locator(".calendar-status-compact")).toHaveText("Skip");
  await done.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "/tmp/axyro-calendar-outcomes-mobile.png",
    fullPage: false,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({
    path: "/tmp/axyro-calendar-outcomes-desktop.png",
    fullPage: false,
  });
});
