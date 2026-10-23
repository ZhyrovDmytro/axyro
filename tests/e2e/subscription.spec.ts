import { expect, test, type Page } from "@playwright/test";
import { generateTrainingPlan } from "../../src/domain/training-plan/generate-training-plan";
import { aiPlanRequestSchema } from "../../src/domain/training-plan/ai-planner.schema";

const account = {
  id: "a0000000-0000-4000-8000-000000000000",
  email: "player@example.com",
  displayName: "Padel Player",
  avatarUrl: null,
  role: "user",
  providers: ["email"],
  isDevelopmentAdmin: false,
};
async function mockServices(page: Page) {
  let user: typeof account | null = account;
  let pro = false;
  let data: Record<string, string> = {};
  let revision = 0;
  let generations = 0;
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      json: { user, configured: true, developmentAdminEnabled: false },
    }),
  );
  await page.route("**/api/user-data", async (route) => {
    if (route.request().method() === "PUT") {
      const input = route.request().postDataJSON();
      data = input.data;
      revision++;
      await route.fulfill({ json: { revision } });
    } else await route.fulfill({ json: { userId: user?.id, data, revision } });
  });
  await page.route("**/api/billing/status", (route) =>
    route.fulfill({
      json: {
        hasPro: pro,
        subscription: pro
          ? {
              status: "active",
              expiresAt: "2030-01-01T00:00:00Z",
              cancelAtPeriodEnd: false,
            }
          : null,
      },
    }),
  );
  await page.route("**/api/billing/products", (route) =>
    route.fulfill({
      json: {
        products: [
          {
            id: "price_test_year",
            amount: 5000,
            currency: "eur",
            interval: "year",
            intervalCount: 1,
          },
        ],
      },
    }),
  );
  await page.route("**/api/billing/checkout", async (route) => {
    expect(generations).toBe(0);
    expect(route.request().postDataJSON().returnTo).toBe(
      "/plan/setup?resume=1",
    );
    pro = true;
    await route.fulfill({
      json: {
        url: new URL(
          "/plan/setup?resume=1&checkout=success",
          route.request().url(),
        ).toString(),
      },
    });
  });
  await page.route("**/api/training-plan", async (route) => {
    expect(pro).toBe(true);
    generations++;
    const input = aiPlanRequestSchema.parse(route.request().postDataJSON());
    const plan = generateTrainingPlan(
      input.profile,
      new Date(`${input.today}T12:00:00`),
      [],
      { adaptationProfile: input.adaptationProfile },
    );
    await route.fulfill({
      json: { plan, source: "fallback", reason: "disabled" },
    });
  });
  await page.route("**/api/auth/logout", async (route) => {
    user = null;
    await route.fulfill({ json: { ok: true } });
  });
  return {
    generations: () => generations,
    setGuest: () => {
      user = null;
    },
    signIn: () => {
      user = account;
    },
  };
}

test("Free workout to Pro checkout continues directly into personal plan and signs out", async ({
  page,
}) => {
  test.setTimeout(60000);
  const state = await mockServices(page);
  await page.goto("/workouts/foundation-strength/start?minutes=5");
  await expect(page.getByRole("timer")).toBeVisible();
  await page.goto("/workouts");
  await expect(page.getByRole("link", { name: /Pro ·/ }).first()).toBeVisible();
  await page.goto("/plan/setup");
  for (let step = 0; step < 15; step++) {
    if (
      await page
        .getByRole("button", { name: "Create My Plan", exact: true })
        .isVisible()
    )
      break;
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  }
  await page
    .getByRole("button", { name: "Create My Plan", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Build your personal padel training plan",
    }),
  ).toBeVisible();
  expect(state.generations()).toBe(0);
  await page
    .getByRole("button", { name: "Unlock My Plan", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "What’s next?", exact: true }),
  ).toBeVisible({ timeout: 30000 });
  expect(state.generations()).toBe(1);
  await page.goto("/account");
  await expect(
    page.getByText("Pro · Your personal training workspace"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Keep your training with you." }),
  ).toBeVisible();
  await expect(
    page.getByText("player@example.com", { exact: true }),
  ).toHaveCount(0);
});

test("registration mismatch and reset email use account API boundaries", async ({
  page,
}) => {
  const state = await mockServices(page);
  state.setGuest();
  let registrations = 0;
  await page.route("**/api/auth/signup", async (route) => {
    registrations++;
    await route.fulfill({ json: { user: null, requiresVerification: true } });
  });
  await page.goto("/signup");
  await page.getByLabel("Name", { exact: true }).fill("Player");
  await page.getByLabel("Email", { exact: true }).fill("player@example.com");
  await page
    .getByLabel("Password", { exact: true })
    .fill("secure-password-123");
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("different-password");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.locator("#auth-error")).toContainText(
    "Passwords must match",
  );
  expect(registrations).toBe(0);
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("secure-password-123");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Check your email");
  expect(registrations).toBe(1);
  await page.route("**/api/auth/recover", (route) =>
    route.fulfill({ json: { ok: true } }),
  );
  await page.goto("/forgot-password");
  await page.getByLabel("Email", { exact: true }).fill("player@example.com");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("status")).toContainText("If an account exists");
});
