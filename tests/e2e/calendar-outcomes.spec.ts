import AxeBuilder from "@axe-core/playwright";
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
  plan.sessions = plan.sessions.filter(
    (session) => session.scheduledDate !== addDays(today, 2),
  );
  plan.games = [
    {
      id: "future-match",
      date: addDays(today, 2),
      label: "Future match",
      importance: "normal",
    },
    {
      id: "past-match",
      date: addDays(today, -1),
      label: "Past match",
      importance: "normal",
    },
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
  const upcomingGames = page.getByRole("complementary", {
    name: "Upcoming games",
  });
  await expect(upcomingGames.locator(".game-list strong")).toHaveText([
    "Club match",
    "Future match",
  ]);
  await expect(
    upcomingGames.getByText("Past match", { exact: true }),
  ).toHaveCount(0);
  const calendar = page.getByRole("grid", { name: "60-day training calendar" });
  const done = calendar.getByRole("gridcell", {
    name: /Done, training:.*Club match/,
  });
  const skipped = calendar.getByRole("gridcell", {
    name: /Skipped, training:/,
  });
  await expect(done).toHaveClass(/calendar-day--completed/);
  await expect(done).toHaveCSS("background-image", "none");
  const matchDay = calendar.getByRole("gridcell", { name: /Future match/ });
  const stripes = await Promise.all(
    [done, skipped, matchDay].map((day) =>
      day.evaluate((el) => {
        const stripe = getComputedStyle(el, "::before");
        return {
          background: stripe.backgroundImage,
          color: stripe.backgroundColor,
          width: stripe.width,
        };
      }),
    ),
  );
  expect(stripes[0].background).toBe(
    "linear-gradient(rgb(217, 252, 84) 0%, rgb(217, 252, 84) 50%, rgb(120, 185, 235) 50%, rgb(120, 185, 235) 100%)",
  );
  expect(stripes[1].color).toBe("rgb(217, 252, 84)");
  expect(stripes[2].color).toBe("rgb(120, 185, 235)");
  expect(stripes.map((stripe) => stripe.width)).toEqual(["2px", "2px", "2px"]);
  await expect(done.locator(".calendar-status-compact")).toBeVisible();
  await expect(done.getByText("Match", { exact: true })).toBeVisible();
  await expect(skipped).toHaveClass(/calendar-day--skipped/);
  await expect(skipped.locator(".calendar-status-compact")).toBeVisible();
  await expect(done.locator(".calendar-status-compact")).toHaveText("Done");
  await expect(skipped.locator(".calendar-status-compact")).toHaveText("Skip");
  await done.click();
  await expect(done).toHaveAttribute("aria-selected", "true");
  const startTraining = page
    .locator(".calendar-day-panel")
    .getByRole("link", { name: "Start training" });
  await expect(startTraining).toHaveCount(0);
  await page.getByRole("button", { name: "Close selected day" }).click();
  await skipped.click();
  await expect(startTraining).toHaveCount(0);
  await page.getByRole("button", { name: "Close selected day" }).click();
  await expect(page.locator(".calendar-day-panel")).toHaveCount(0);
  await done.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(done).toBeFocused();
  await expect(done).toHaveCSS("outline-style", "solid");
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const { violations } = await new AxeBuilder({ page })
      .include(".plan-page")
      .withRules(["color-contrast"])
      .analyze();
    expect(violations).toEqual([]);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await done.click();
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
  await page.evaluate(() => {
    const key = "veyro.owner.development-admin.veyro.training-plan.v1";
    const savedPlan = JSON.parse(localStorage.getItem(key)!);
    savedPlan.games = savedPlan.games.filter(
      (game: { id: string }) => game.id === "past-match",
    );
    localStorage.setItem(key, JSON.stringify(savedPlan));
  });
  await page.reload();
  await expect(upcomingGames.getByText(/No upcoming games/)).toBeVisible();
  await expect(upcomingGames.locator(".game-list")).toHaveCount(0);
  // Check today's primary action with a scheduled session, independently of outcomes.
  await page.evaluate(
    ({ plan, key }) => {
      localStorage.removeItem(`veyro.owner.development-admin.${key}`);
      localStorage.setItem(
        "veyro.owner.development-admin.veyro.training-plan.v1",
        JSON.stringify(plan),
      );
    },
    { plan, key: workoutActivityStorageKey },
  );
  await page.goto("/plan");
  await expect(page.locator(".plan-today-card")).toBeVisible();
  for (const width of [320, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    const start = page
      .locator(".plan-today-card")
      .getByRole("link", { name: "Start workout" });
    await expect(start).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({ path: "/tmp/axyro-plan-after-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "/tmp/axyro-plan-after-mobile.png" });
});
