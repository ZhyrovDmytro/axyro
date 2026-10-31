import { expect, test } from "@playwright/test";
import { generateTrainingPlan } from "../../src/domain/training-plan/generate-training-plan";
import { representativeAthleteProfiles } from "../../src/domain/training-plan/evaluation-profiles";
import { toDateKey } from "../../src/domain/training-plan/date";
import { exercises } from "../../src/content/exercises";
import { createPlannedSessionSnapshot } from "../../src/domain/workout/create-workout-session-snapshot";
import {
  LocalWorkoutActivityRepository,
  workoutActivityStorageKey,
} from "../../src/services/persistence/local-workout-activity-repository";

test("weekly statuses match Activity and missed training can move to today", async ({
  page,
}, testInfo) => {
  const renderWarnings: string[] = [];
  page.on("console", (message) => {
    if (message.text().includes("Cannot update a component"))
      renderWarnings.push(message.text());
  });
  await page.clock.install({ time: new Date("2026-10-31T12:00:00Z") });
  const login = await page.request.post("/api/auth/signin", {
    headers: { Origin: new URL(String(testInfo.project.use.baseURL)).origin },
    data: { email: "admin", password: "admin" },
  });
  expect(login.ok()).toBe(true);
  const plan = generateTrainingPlan(
    {
      ...representativeAthleteProfiles[1],
      preferredDays: ["monday", "wednesday", "friday"],
      sessionsPerWeek: 3,
      matches: [],
    },
    new Date("2026-10-26T12:00:00Z"),
  );
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
      planId: plan.generatedAt,
      sessionId: session.id,
      workoutId: session.workout.id,
      scheduledDate: session.scheduledDate,
      plannedSnapshot: createPlannedSessionSnapshot(session, exercises),
    })),
    "2026-10-26",
  );
  repository.recordCompleted({
    sessionId: plan.sessions[0].id,
    workoutId: plan.sessions[0].workout.id,
    intensity: "standard",
    snapshot: createPlannedSessionSnapshot(plan.sessions[0], exercises),
    completedAt: new Date("2026-10-26T12:10:00Z"),
  });
  repository.markSessionStarted(
    plan.sessions[2].id,
    plan.sessions[2].workout.id,
    "standard",
    new Date("2026-10-30T12:00:00Z"),
  );
  repository.finalizeIncompleteSession(
    plan.sessions[2].id,
    undefined,
    120,
    new Date("2026-10-30T12:02:00Z"),
  );
  await page.goto("/");
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
    page.getByRole("heading", { name: "Your full plan.", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("grid", { name: "60-day training calendar" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "This week", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Back to Home/ })).toHaveCount(0);
  for (const width of [320, 1280]) {
    await page.setViewportSize({ width, height: 1000 });
    const title = await page.locator(".plan-hero h1").boundingBox();
    const refine = await page.getByRole("link", { name: "Refine my plan", exact: true }).boundingBox();
    expect(refine!.x).toBeGreaterThan(title!.x + title!.width);
    expect(Math.abs(refine!.y + refine!.height / 2 - title!.y - title!.height / 2)).toBeLessThan(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.locator(".plan-hero").screenshot({ path: `/tmp/plan-header-${width}.png` });
  }
  await page.setViewportSize({ width: 393, height: 851 });
  const notice = page.locator(".missed-workout-notice");
  await expect(notice).toContainText("1 missed workout");
  await expect(
    notice.getByRole("link", { name: /Review activity/ }),
  ).toHaveAttribute("href", "/activity");
  expect((await notice.boundingBox())!.height).toBeLessThan(150);
  await page.screenshot({
    path: "/tmp/plan-full-calendar-mobile.png",
    fullPage: false,
  });
  await page.getByRole("gridcell", { name: /Missed, training:/ }).click();
  await expect(
    page
      .getByRole("region", { name: /Selected day:/ })
      .getByText("Move training", { exact: true }),
  ).toBeVisible();
  await page.goto("/");
  const week = page.getByRole("region", { name: "This week" });
  await expect(week.locator(".activity-status--completed")).toHaveText(
    "Completed",
  );
  await expect(week.locator(".activity-status--completed")).toHaveCSS(
    "color",
    "rgb(158, 230, 176)",
  );
  await expect(week.locator(".activity-status--missed")).toHaveCSS(
    "color",
    "rgb(255, 171, 156)",
  );
  await expect(week.locator(".activity-status--incomplete")).toHaveCSS(
    "color",
    "rgb(255, 209, 138)",
  );
  for (const width of [320, 1280]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await week.screenshot({ path: `/tmp/weekly-statuses-${width}.png` });
    await page.locator(".today-hero").screenshot({ path: `/tmp/home-hero-${width}.png` });
  }
  const missed = week.locator('li[data-status="missed"]');
  await missed.getByText("Move training", { exact: true }).click();
  await missed.getByLabel("New training date").fill("2026-11-02");
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("You already have a workout");
    await dialog.accept();
  });
  await missed.getByRole("button", { name: "Save date", exact: true }).click();
  await expect(missed).toBeVisible();
  await missed.getByLabel("New training date").fill("2026-10-31");
  await missed.getByRole("button", { name: "Save date", exact: true }).click();
  await expect(week.locator(".activity-status--missed")).toHaveCount(0);
  const today = week.locator("li.is-today");
  await expect(today.locator(".activity-status--scheduled")).toHaveText(
    "Scheduled",
  );
  await expect(
    today.getByRole("link", { name: "Start workout", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(today.locator(".activity-status--scheduled")).toBeVisible();
  await page.goto("/activity");
  await expect(page.locator(".activity-status--completed")).toHaveCount(1);
  await expect(page.locator(".activity-status--missed")).toHaveCount(0);
  expect(renderWarnings).toEqual([]);
});

test("opens a weekly workout preview and starts that session", async ({
  page,
}, testInfo) => {
  const login = await page.request.post("/api/auth/signin", {
    headers: { Origin: new URL(String(testInfo.project.use.baseURL)).origin },
    data: { email: "admin", password: "admin" },
  });
  expect(login.ok()).toBe(true);
  const plan = generateTrainingPlan(
    representativeAthleteProfiles[1],
    new Date(),
  );
  const session = plan.sessions[0];
  session.scheduledDate = toDateKey(new Date());
  await page.goto("/");
  await page.evaluate((plan) => {
    localStorage.setItem(
      "veyro.owner.development-admin.veyro.training-plan.v1",
      JSON.stringify(plan),
    );
  }, plan);
  await page.reload();
  const week = page.getByRole("region", { name: "This week" });
  const preview = week.getByRole("link", {
    name: session.workout.name,
    exact: true,
  });
  await expect(preview).toHaveAttribute(
    "href",
    `/plan/workouts/${session.id}/edit`,
  );
  await preview.focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(
    new RegExp(`/plan/workouts/${session.id}/edit$`),
  );
  await expect(
    page.getByRole("heading", { name: session.workout.name, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Start workout", exact: true }),
  ).toBeVisible();
  await page.goto("/");
  const row = week.locator("li").filter({
    has: page.getByRole("link", { name: session.workout.name, exact: true }),
  });
  for (const width of [320, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(
      row.getByRole("link", { name: "Start workout", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await week.screenshot({ path: `/tmp/weekly-workout-${width}.png` });
  }
  await row.getByRole("link", { name: "Start workout", exact: true }).click();
  await expect(page).toHaveURL(
    new RegExp(`/plan/workouts/${session.id}/start\\?intensity=`),
  );
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
});
