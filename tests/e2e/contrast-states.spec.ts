import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { installDeterministicPlanner } from "./helpers/planner";

async function checkContrast(page: Page, state: string) {
  await page.waitForLoadState("networkidle");
  const { violations } = await new AxeBuilder({ page })
    .withRules(["color-contrast"])
    .analyze();
  expect
    .soft(
      violations
        .map((v) =>
          v.nodes.map((n) => ({
            target: n.target,
            reason: n.failureSummary,
          })),
        )
        .flat(),
      state,
    )
    .toEqual([]);
}

async function login(page: Page) {
  const origin = new URL(
    process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3100",
  ).origin;
  const response = await page.request.post(`${origin}/api/auth/signin`, {
    headers: { Origin: origin },
    data: { email: "admin", password: "admin" },
  });
  expect(response.ok()).toBe(true);
}

test("text contrast across routes, button hover and focus states", async ({
  page,
}) => {
  test.setTimeout(180_000);
  page.setDefaultTimeout(10_000);
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const route of [
    "/",
    "/workouts",
    "/workouts/foundation-strength",
    "/exercises",
    "/exercises/bodyweight-squat",
    "/exercises/prone-foam-roller-overhead-shoulder-press",
    "/settings",
    "/signin",
    "/signup",
    "/forgot-password",
    "/reset-password",
    "/upgrade",
    "/privacy",
    "/terms",
    "/activity",
  ]) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    await checkContrast(page, route);
    for (const selector of [
      ".button--primary",
      ".button--secondary",
      ".button--dark",
      ".button--start",
      ".settings-link",
      ".filter-chip",
      ".effort-option",
      "button[type=submit]:not(.sr-only)",
    ]) {
      const control = page.locator(selector).first();
      if (!(await control.isVisible()) || !(await control.isEnabled()))
        continue;
      await control.hover();
      await checkContrast(page, `${route}: ${selector} hover`);
      await control.focus();
      await checkContrast(page, `${route}: ${selector} focus`);
      await page.mouse.move(0, 0);
    }
  }
});

test("text contrast throughout plan creation, calendar and editing", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await login(page);
  await installDeterministicPlanner(page);
  await page.goto("/plan/setup");
  for (let step = 0; step < 12; step++) {
    await checkContrast(page, `onboarding ${step}`);
    if (await page.getByRole("button", { name: "Create My Plan" }).isVisible())
      break;
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  }
  await page.getByRole("button", { name: "Create My Plan" }).click();
  await expect(
    page.getByRole("heading", { name: "What’s next?" }),
  ).toBeVisible();
  await checkContrast(page, "plan overview");
  await page.getByRole("link", { name: /View full calendar/ }).click();
  await checkContrast(page, "calendar and current training arc");
  await page.locator(".calendar-day:not(:disabled)").first().click();
  await page.getByRole("button", { name: "Add game" }).click();
  await checkContrast(page, "add game dialog");
  await page.getByRole("button", { name: "Save game" }).click();
  await checkContrast(page, "match day and match actions");
  await page
    .getByRole("button", { name: "Delete Padel match", exact: true })
    .click();
  await checkContrast(page, "delete match dialog");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel" })
    .click();
  await page.getByRole("link", { name: "Review", exact: true }).first().click();
  await expect(page.locator(".planned-workout-hero")).toBeVisible();
  await checkContrast(page, "planned workout preview");
  await page.getByRole("button", { name: "Edit workout" }).click();
  await expect(page.locator(".editor-exercise-list")).toBeVisible();
  await checkContrast(page, "workout editor");
  await page.getByRole("button", { name: "Add exercise", exact: true }).click();
  await checkContrast(page, "exercise picker");
  await page.getByPlaceholder("Search movement or body area").fill("dead bug");
  await page.locator(".exercise-picker-list button").first().click();
  await page.getByRole("button", { name: "Adapt today" }).click();
  await checkContrast(page, "adapt dialog");
  await page.getByRole("button", { name: /Make today lighter/ }).click();
  await checkContrast(page, "adaptation preview");
});

test("text contrast in paused player, guidance, technique and completion", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.goto("/workouts/foundation-strength/start?intensity=standard");
  await expect(page.getByRole("timer")).toBeVisible();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await checkContrast(page, "paused workout");
  await page
    .getByRole("button", { name: "Open workout guidance settings" })
    .click();
  await checkContrast(page, "guidance settings");
  await page.getByRole("button", { name: "Close guidance settings" }).click();
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  const technique = page.getByRole("button", {
    name: "Technique",
    exact: true,
  });
  if (await technique.isVisible()) {
    await technique.click();
    await checkContrast(page, "technique dialog");
    await page.getByRole("button", { name: "Close technique" }).click();
  }
  for (let step = 0; step < 100; step++) {
    const skip = page.getByRole("button", { name: "Skip", exact: true });
    if (await page.getByRole("heading", { name: "Strong work." }).isVisible())
      break;
    await skip.click();
  }
  await expect(
    page.getByRole("heading", { name: "Strong work." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "How did that workout feel?" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Repeat workout", exact: true }),
  ).toBeVisible();
  await checkContrast(page, "completion and feedback");
  await page
    .getByRole("button", { name: "Just right Challenging but manageable" })
    .click();
  await checkContrast(page, "selected completion feedback");
});
