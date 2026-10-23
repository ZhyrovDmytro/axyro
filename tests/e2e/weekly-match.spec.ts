import { expect, test } from "@playwright/test";
import {
  generateTrainingPlan,
  rebalancePlanAroundGames,
} from "../../src/domain/training-plan/generate-training-plan";
import { addDays, toDateKey } from "../../src/domain/training-plan/date";

test("adds and edits a weekly match without replacing training", async ({
  page,
}) => {
  const now = new Date();
  const plan = generateTrainingPlan(
    {
      sport: "padel",
      experience: "intermediate",
      sessionsPerWeek: 3,
      sessionDurationMinutes: 10,
      preferredDays: ["monday", "wednesday", "friday"],
      equipment: ["bodyweight"],
      goals: ["power"],
      developmentAreas: [],
      padelLimitations: [],
      painAreas: [],
      matches: [],
    },
    now,
  );
  // Keep a training session in this week regardless of the day the test runs.
  plan.sessions[0].scheduledDate = toDateKey(now);
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
  await page.goto("/plan");
  await page.evaluate((seed) => {
    localStorage.setItem(
      "veyro.owner.development-admin.veyro.training-plan.v1",
      JSON.stringify(seed),
    );
  }, plan);
  await page.reload();
  const row = page.locator(".plan-week__days li.has-session").first();
  const workout = await row.locator("strong").innerText();
  await row.getByRole("button", { name: /Add match/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Game name").fill("Friday league match");
  await dialog.getByRole("button", { name: "Save game" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(row.getByText("Friday league match · Match day")).toBeVisible();
  await expect(row.locator("strong")).toHaveText(workout);
  await expect(row.getByRole("button", { name: /Edit match/ })).toBeFocused();
  await page.reload();
  await expect(row.getByText("Friday league match · Match day")).toBeVisible();
  await row.getByRole("button", { name: /Edit match/ }).click();
  await expect(dialog.getByLabel("Game name")).toHaveValue(
    "Friday league match",
  );
  await dialog.getByLabel("Game name").fill("Club match");
  await dialog.getByRole("button", { name: "Update game" }).click();
  await expect(row.getByText("Club match · Match day")).toBeVisible();
  await expect(row).toHaveClass(/has-game/);
  await expect(row.getByText("Training + match · Same day")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Rebalance plan/ }),
  ).toBeVisible();
  await row.getByRole("button", { name: /Edit match/ }).click();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(row.getByRole("button", { name: /Edit match/ })).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/axyro-weekly-match-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({
    path: "/tmp/axyro-weekly-match-desktop.png",
    fullPage: true,
  });
  const destination = Array.from({ length: 14 }, (_, index) =>
    addDays(toDateKey(now), index + 1),
  ).find(
    (date) => !plan.sessions.some((session) => session.scheduledDate === date),
  )!;
  await row.getByText("Move training", { exact: true }).click();
  await row.getByLabel("New training date").fill(destination);
  await row.getByRole("button", { name: "Save date" }).click();
  await expect(page.getByText("Club match", { exact: true })).toBeVisible();
  await page.reload();
  const saved = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem(
        "veyro.owner.development-admin.veyro.training-plan.v1",
      )!,
    ),
  );
  expect(
    saved.sessions.find(
      (session: { id: string }) => session.id === plan.sessions[0].id,
    ).scheduledDate,
  ).toBe(destination);
  expect(
    saved.games.find((game: { label: string }) => game.label === "Club match")
      .date,
  ).toBe(toDateKey(now));
  await expect(page.getByText("Training + match · Same day")).toHaveCount(0);
  const expected = rebalancePlanAroundGames(saved);
  await page.getByRole("button", { name: /Rebalance plan/ }).click();
  await expect(page.getByRole("status")).toContainText("No workouts moved.");
  await page.reload();
  const rebalanced = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem(
        "veyro.owner.development-admin.veyro.training-plan.v1",
      )!,
    ),
  );
  expect(rebalanced.sessions).toEqual(expected.sessions);
  expect(rebalanced.games).toEqual(saved.games);
});
