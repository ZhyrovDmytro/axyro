import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      json: { user: null, configured: true, developmentAdminEnabled: false },
    }),
  );
  await page.route("**/api/billing/status", (route) =>
    route.fulfill({ json: { hasPro: false, subscription: null } }),
  );
});

test("unavailable subscriptions explain account limits and offer a free workout", async ({
  page,
}) => {
  await page.route("**/api/billing/products", (route) =>
    route.fulfill({ status: 503, json: { error: "Unavailable" } }),
  );
  await page.goto("/plan");
  await expect(page.locator(".paywall").getByRole("alert")).toContainText(
    "Subscriptions are currently unavailable",
  );
  await expect(
    page.getByText(
      "Creating an account will not unlock Pro while subscriptions are unavailable.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Create a free account", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Try the free workout", exact: true })
    .click();
  await expect(page).toHaveURL(/\/workouts\/foundation-strength$/);
});

test("signed-in members get a working fallback when the membership list is empty", async ({
  page,
}) => {
  const user = {
    id: "a0000000-0000-4000-8000-000000000000",
    email: "review@example.com",
    displayName: "Review",
    role: "user",
    providers: ["email"],
    avatarUrl: null,
  };
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      json: {
        user,
        configured: true,
        developmentAdminEnabled: false,
      },
    }),
  );
  await page.route("**/api/user-data", (route) =>
    route.fulfill({
      json: {
        userId: user.id,
        data: {},
        revision: 0,
      },
    }),
  );
  await page.route("**/api/billing/products", (route) =>
    route.fulfill({ json: { products: [] } }),
  );
  await page.goto("/plan");
  await expect(
    page.getByRole("link", { name: "Try the free workout", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Unlock My Plan|Start Pro/ }),
  ).toHaveCount(0);
  await expect(
    page.getByText(
      "You can keep using the free workout. Pro access requires an active subscription.",
    ),
  ).toBeVisible();
});

test("workout setup keeps choices above its action at short mobile sizes", async ({
  page,
}) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 667 });
    await page.goto("/workouts/foundation-strength");
    await page.getByRole("radio", { name: "5 min Short on time" }).check();
    await page.getByRole("button", { name: /Challenging/ }).click();
    const action = page.locator(".workout-start-action");
    const choices = page.locator(".effort-options");
    const choiceBounds = await choices.boundingBox();
    const actionBounds = await action.boundingBox();
    expect(actionBounds!.y).toBeGreaterThanOrEqual(
      choiceBounds!.y + choiceBounds!.height,
    );
    await page
      .getByRole("link", { name: "Start workout · Challenging" })
      .click();
    await expect(page).toHaveURL(/intensity=challenging&minutes=5/);
    await expect(
      page.getByText("Warm-up complete", { exact: true }),
    ).toHaveCount(0);
    await expect(page.getByRole("timer")).toBeVisible();
  }
});

test("phone library cards fit their content and show the first name without scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/exercises");
  const first = page.locator(".exercise-card").first();
  await expect(first.getByRole("heading")).toBeInViewport();
  const title = await first.getByRole("heading").boundingBox();
  const navigation = await page
    .getByRole("navigation", { name: "Primary navigation" })
    .boundingBox();
  expect(title!.y + title!.height).toBeLessThan(navigation!.y);
  const box = await first.boundingBox();
  expect(box!.height).toBeLessThan(430);
  await first.click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("player uses one phase label and keeps pause and skip reachable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 667 });
  await page.clock.install();
  await page.goto("/workouts/foundation-strength/start?minutes=5");
  await expect(page.getByRole("timer")).toBeVisible();
  await expect(page.getByText("Warm-up complete", { exact: true })).toHaveCount(
    0,
  );
  await page.clock.fastForward(6000);
  await expect(page.getByText("Work", { exact: true })).toHaveCount(1);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.getByText("Paused", { exact: true })).toBeVisible();
  const timer = await page.getByRole("timer").textContent();
  await page.clock.fastForward(5000);
  await expect(page.getByRole("timer")).toHaveText(timer!);
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /Pause|Resume/, exact: true }),
  ).toBeInViewport();
});
