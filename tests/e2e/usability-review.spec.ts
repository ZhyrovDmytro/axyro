import { mockFreeMember } from "./helpers/free-member";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function guest(page: Page) {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      json: { user: null, configured: true, developmentAdminEnabled: false },
    }),
  );
}

test("workout cards fit narrow phones and exercise links have touch targets", async ({
  page,
}) => {
  await guest(page);
  await page.setViewportSize({ width: 320, height: 667 });
  await page.goto("/workouts");
  await expect(page.locator(".workout-card").first()).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  await page.locator(".workout-card").first().click();
  for (const link of await page.locator(".plan-copy a").all()) {
    expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
});

test("setup restores answers and the current step after refresh and exit", async ({
  page,
}) => {
  await mockFreeMember(page);
  await page.goto("/plan/setup");
  await page.getByRole("radio", { name: /Another sport/ }).check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("checkbox", { name: "Get stronger", exact: true })
    .check();
  await page.reload();
  await expect(
    page.getByRole("checkbox", { name: "Get stronger", exact: true }),
  ).toBeChecked();
  await expect(page.locator(".onboarding-header")).toContainText("2 of 6");
  await page.getByRole("button", { name: "Exit", exact: true }).click();
  await page.goto("/plan/setup");
  await expect(
    page.getByRole("checkbox", { name: "Get stronger", exact: true }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(
    page.getByRole("radio", { name: /Another sport/ }),
  ).toBeChecked();
});

test("unfinished selections survive refresh and still require validation", async ({
  page,
}) => {
  await mockFreeMember(page);
  await page.goto("/plan/setup");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("checkbox", { name: "Move faster and better", exact: true })
    .uncheck();
  await page.reload();
  await expect(
    page.getByRole("checkbox", { name: "Move faster and better", exact: true }),
  ).not.toBeChecked();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.locator(".form-error")).toHaveText(
    "Choose at least one priority.",
  );
});

test("setup and review use the same two equipment choices", async ({
  page,
}) => {
  await mockFreeMember(page);
  await page.goto("/plan/setup");
  await page.getByRole("radio", { name: /Another sport/ }).check();
  for (let step = 0; step < 4; step++) {
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  }
  await page.setViewportSize({ width: 320, height: 667 });
  const choices = page.getByRole("group", {
    name: "What equipment will you have?",
  });
  const withDumbbells = choices.getByRole("radio", {
    name: "With dumbbells",
    exact: true,
  });
  const withoutDumbbells = choices.getByRole("radio", {
    name: "Without dumbbells",
    exact: true,
  });
  await expect(choices.getByRole("radio")).toHaveCount(2);
  await expect(withoutDumbbells).toBeChecked();
  await withDumbbells.check();
  await page.reload();
  await expect(withDumbbells).toBeChecked();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  const equipment = page
    .locator(".review-list > div")
    .filter({ hasText: "Equipment" });
  await expect(equipment.locator("dd")).toHaveText("With dumbbells");
  await equipment.getByRole("button", { name: "Edit equipment" }).click();
  await expect(withDumbbells).toBeChecked();
  await withoutDumbbells.check();
  await page.getByRole("button", { name: "Save answer", exact: true }).click();
  await expect(equipment.locator("dd")).toHaveText("Without dumbbells");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("leaving plan generation cancels the request and keeps the answers", async ({
  page,
}) => {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      json: {
        user: {
          id: "development-admin",
          displayName: "Test athlete",
          email: "test@example.com",
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
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/training-plan", async (route) => {
    await pending;
    await route
      .fulfill({ status: 503, json: { error: "Unavailable" } })
      .catch(() => {});
  });
  await page.goto("/plan/setup");
  await page.getByRole("radio", { name: /Another sport/ }).check();
  for (let step = 0; step < 4; step++) {
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  }
  const choices = page.getByRole("group", {
    name: "What equipment will you have?",
  });
  const withDumbbells = choices.getByRole("radio", {
    name: "With dumbbells",
    exact: true,
  });
  await withDumbbells.check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const request = page.waitForRequest("**/api/training-plan");
  await page
    .getByRole("button", { name: "Create My Plan", exact: true })
    .click();
  expect((await request).postDataJSON().profile.equipment).toEqual([
    "bodyweight",
    "one-dumbbell",
  ]);
  const cancelled = page.waitForEvent("requestfailed", (request) =>
    request.url().endsWith("/api/training-plan"),
  );
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await cancelled;
  release();
  await expect(choices).toBeVisible();
  await expect(withDumbbells).toBeChecked();
  await expect(page.locator(".form-error")).toHaveCount(0);
});

test("a failed cloud save retries without replacing local settings", async ({
  page,
}) => {
  const userId = "a0000000-0000-4000-8000-000000000000";
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      json: {
        user: {
          id: userId,
          displayName: "Test athlete",
          email: "test@example.com",
          role: "user",
          providers: ["email"],
          isDevelopmentAdmin: false,
        },
        configured: true,
        developmentAdminEnabled: false,
      },
    }),
  );
  await page.route("**/api/billing/status", (route) =>
    route.fulfill({ json: { hasPro: false, subscription: null } }),
  );
  let saves = 0;
  let loads = 0;
  await page.route("**/api/user-data", (route) => {
    if (route.request().method() === "GET") {
      loads++;
      return route.fulfill({ json: { userId, data: {}, revision: 0 } });
    }
    saves++;
    return saves === 1
      ? route.fulfill({ status: 503, json: { error: "Unavailable" } })
      : route.fulfill({ json: { revision: 1 } });
  });
  await page.goto("/settings");
  const audio = page.getByRole("checkbox", { name: /Audio/ });
  await expect(audio).toBeEnabled();
  const wasChecked = await audio.isChecked();
  await audio.setChecked(!wasChecked);
  await page.getByRole("button", { name: "Retry saving", exact: true }).click();
  await expect(page.locator(".sync-notice")).toHaveCount(0);
  expect(await audio.isChecked()).toBe(!wasChecked);
  expect(saves).toBe(2);
  expect(loads).toBe(1);
});
