import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { representativeAthleteProfiles } from "../../src/domain/training-plan/evaluation-profiles";
import {
  addDays,
  formatPlanDate,
  fromDateKey,
  toDateKey,
} from "../../src/domain/training-plan/date";
import { generateTrainingPlan } from "../../src/domain/training-plan/generate-training-plan";

test("day details stay visible on desktop and become one accessible mobile sheet", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      json: {
        user: {
          id: "development-admin",
          email: "admin@example.com",
          displayName: "Test player",
          avatarUrl: null,
          role: "admin",
          providers: ["email"],
          isDevelopmentAdmin: true,
        },
        configured: true,
        developmentAdminEnabled: true,
      },
    }),
  );
  await page.route("**/api/billing/status", (route) =>
    route.fulfill({ json: { hasPro: true, subscription: null } }),
  );
  const today = toDateKey(new Date());
  const plan = generateTrainingPlan(
    representativeAthleteProfiles[1],
    new Date(),
  );
  plan.sessions[0].scheduledDate = today;
  plan.games = [];
  const emptyDate = Array.from({ length: 59 }, (_, i) =>
    addDays(today, i + 1),
  ).find(
    (date) => !plan.sessions.some((session) => session.scheduledDate === date),
  )!;
  await page.goto("/plan/calendar");
  await page.evaluate(
    (seed) =>
      localStorage.setItem(
        "veyro.owner.development-admin.veyro.training-plan.v1",
        JSON.stringify(seed),
      ),
    plan,
  );
  await page.reload();
  const calendar = page.getByRole("grid", { name: "60-day training calendar" });
  const months = new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  });
  await expect(
    page.getByText(
      months.formatRange(
        fromDateKey(plan.startDate),
        fromDateKey(plan.endDate),
      ),
      { exact: true },
    ),
  ).toBeVisible();
  const boundaries = Array.from({ length: 60 }, (_, i) =>
    addDays(today, i),
  ).filter((date) => date.endsWith("-01"));
  await page.setViewportSize({ width: 320, height: 844 });
  await expect(calendar.locator(".calendar-day__month")).toHaveCount(
    boundaries.length,
  );
  for (const date of boundaries) {
    const cell = calendar.getByRole("gridcell", {
      name: new RegExp(`^(Today, )?${formatPlanDate(date)}(?:,|$)`),
    });
    await expect(cell.locator(".calendar-day__month")).toHaveText(
      formatPlanDate(date, { month: "short" }),
    );
    expect(
      await cell.evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      ),
    ).toBe(true);
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  const trainingDay = calendar.getByRole("gridcell", {
    name: new RegExp(`Today,.*training:`),
  });
  await trainingDay.click();
  const panel = page.locator(".calendar-day-panel");
  await expect(panel).toHaveAttribute("role", "region");
  await expect(panel).toBeInViewport();
  await expect(panel.getByRole("heading")).toBeFocused();
  await expect(
    panel.getByRole("link", { name: "Start training" }),
  ).toBeVisible();
  await expect(panel.locator(".session-section-summary")).toHaveCount(0);
  await expect(
    panel.locator(".calendar-day-panel__actions > :first-child"),
  ).toHaveText("Start training");
  await expect(
    panel
      .locator(".calendar-day-panel__actions > :nth-child(2)")
      .and(panel.getByRole("link", { name: /^Review workout:/ })),
  ).toHaveText("Review workout");
  await expect(panel.locator(".selected-day-game-action")).toHaveCSS(
    "margin-top",
    "0px",
  );
  const futureSession = plan.sessions.find(
    (session) => session.scheduledDate > today,
  )!;
  await calendar
    .getByRole("gridcell", {
      name: new RegExp(
        `^${formatPlanDate(futureSession.scheduledDate)},.*training:`,
      ),
    })
    .click();
  await expect(
    panel.getByRole("link", { name: "Start training" }),
  ).toHaveAttribute(
    "href",
    `/plan/workouts/${futureSession.id}/start?intensity=standard`,
  );
  const calendarBounds = await calendar.boundingBox();
  expect((await panel.boundingBox())!.x).toBeGreaterThan(
    calendarBounds!.x + calendarBounds!.width,
  );
  const lateDay = calendar.locator("button:not(:disabled)").last();
  await lateDay.click();
  await expect(panel).toBeInViewport();
  await expect
    .poll(async () => (await panel.boundingBox())!.y)
    .toBeGreaterThanOrEqual(0);
  await expect(lateDay).toHaveAttribute("aria-selected", "true");
  await page.screenshot({ path: "/tmp/axyro-calendar-panel-desktop.png" });

  const emptyDay = calendar.getByRole("gridcell", {
    name: new RegExp(`^${formatPlanDate(emptyDate)}(?:,|$)`),
  });
  await emptyDay.click();
  await expect(panel.getByText(/No training or game/)).toBeVisible();
  for (const width of [768, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(panel).toHaveAttribute("role", "dialog");
    expect(await panel.evaluate((el) => el.matches(":modal"))).toBe(true);
    await panel.evaluate(async (el) => {
      await Promise.all(
        el.getAnimations().map((animation) => animation.finished),
      );
    });
    const bounds = (await panel.boundingBox())!;
    expect(bounds.x).toBe(12);
    expect(Math.round(bounds.x + bounds.width)).toBe(width - 12);
    expect(Math.round(bounds.y + bounds.height)).toBe(832);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      panel.getByRole("button", { name: "Add game" }),
    ).toBeInViewport();
    const { violations } = await new AxeBuilder({ page })
      .include(".calendar-day-panel")
      .withRules(["color-contrast"])
      .analyze();
    expect(violations).toEqual([]);
  }
  const scrollBefore = await page.evaluate(() => scrollY);
  await panel.getByRole("button", { name: "Add game" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(1);
  await expect(panel.getByLabel("Game name")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(panel.getByRole("heading")).toBeFocused();
  await expect(panel.getByRole("button", { name: "Add game" })).toBeVisible();
  await panel.getByRole("button", { name: "Add game" }).click();
  await panel.getByLabel("Game name").fill("Club match");
  const importance = panel.getByRole("combobox", { name: "Importance" });
  await expect(importance).toHaveValue("normal");
  await importance.selectOption("important");
  await panel.getByRole("button", { name: "Save game" }).click();
  await expect(panel.getByText("Club match", { exact: true })).toBeVisible();
  await panel.getByRole("button", { name: "Edit Club match" }).click();
  await expect(importance).toHaveValue("important");
  await panel.getByLabel("Game name").fill("League match");
  await panel.getByRole("button", { name: "Update game" }).click();
  await panel.getByRole("button", { name: "Delete League match" }).click();
  await page.keyboard.press("Escape");
  await expect(panel.getByText("League match", { exact: true })).toBeVisible();
  await page.screenshot({ path: "/tmp/axyro-calendar-panel-mobile.png" });
  await panel.getByRole("button", { name: "Close selected day" }).click();
  await expect(emptyDay).toBeFocused();
  expect(await page.evaluate(() => scrollY)).toBe(scrollBefore);
  await emptyDay.press("Enter");
  await expect(panel.getByRole("heading")).toBeFocused();
  await panel.getByRole("button", { name: "Close selected day" }).focus();
  await page.keyboard.press("Shift+Tab");
  await expect(
    panel.getByRole("button", { name: "Delete League match" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(emptyDay).toBeFocused();
  await emptyDay.click();
  await panel.getByRole("button", { name: "Delete League match" }).click();
  await panel
    .getByRole("button", { name: "Delete match", exact: true })
    .click();
  await expect(panel.getByText(/No training or game/)).toBeVisible();
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(page.getByText(/No upcoming games/)).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await trainingDay.click();
  await expect(
    panel.getByRole("link", { name: "Start training" }),
  ).toBeInViewport();
  const body = panel.locator(".calendar-day-panel__body");
  await body.hover();
  await page.mouse.wheel(0, 600);
  await expect(
    panel.getByRole("link", { name: "Start training" }),
  ).toBeInViewport();
  await expect
    .poll(async () => {
      const bounds = (await panel.boundingBox())!;
      return Math.round(bounds.y + bounds.height);
    })
    .toBe(832);
  await page.screenshot({
    path: "/tmp/axyro-calendar-panel-workout-mobile.png",
  });
  await page.mouse.click(8, 8);
  await expect(panel).toHaveAttribute("data-closing", "true");
  await expect(panel).toHaveCount(0);
  await expect(trainingDay).toBeFocused();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await trainingDay.click();
  const reducedAnimation = await panel.evaluate((el) => {
    const animation = el
      .getAnimations()
      .find((item) => item.effect instanceof KeyframeEffect);
    const effect = animation?.effect as KeyframeEffect | undefined;
    return {
      duration: effect?.getTiming().duration,
      transforms: effect?.getKeyframes().map((frame) => frame.transform),
    };
  });
  expect(reducedAnimation.duration).toBe(120);
  expect(reducedAnimation.transforms).toEqual(["none", "none"]);
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(trainingDay).toBeFocused();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await trainingDay.click();
  const entryDuration = await panel.evaluate(
    (el) =>
      el
        .getAnimations()
        .find((animation) => animation.effect instanceof KeyframeEffect)
        ?.effect?.getTiming().duration,
  );
  expect(entryDuration).toBe(240);
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(panel).toHaveCount(0);
  await expect(trainingDay).toBeFocused();
  expect(errors).toEqual([]);
});
