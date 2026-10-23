import { expect, test, type Page } from "@playwright/test";

const alice = {
  id: "a0000000-0000-4000-8000-000000000000",
  email: "alice@example.com",
  displayName: "Alice",
  avatarUrl: null,
  role: "user",
  providers: ["email"],
  isDevelopmentAdmin: false,
};
const bob = {
  ...alice,
  id: "b0000000-0000-4000-8000-000000000000",
  email: "bob@example.com",
  displayName: "Bob",
};
async function mockAccount(page: Page, current: () => typeof alice | null) {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      json: {
        user: current(),
        configured: true,
        developmentAdminEnabled: false,
      },
    }),
  );
  await page.route("**/api/billing/status", (route) =>
    route.fulfill({ json: { hasPro: false, subscription: null } }),
  );
  await page.route("**/api/user-data", (route) =>
    route.fulfill({ json: { userId: current()?.id, data: {}, revision: 0 } }),
  );
}

test("account switching remounts personal UI and never shows the previous profile", async ({
  page,
}) => {
  let current: typeof alice | null = alice;
  await mockAccount(page, () => current);
  await page.goto("/account");
  await expect(
    page.getByRole("heading", { name: "Alice", exact: true }),
  ).toBeVisible();
  current = bob;
  await page.evaluate(() =>
    window.dispatchEvent(new Event("axyro:identity-changed")),
  );
  await expect(
    page.getByRole("heading", { name: "Bob", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("alice@example.com", { exact: true }),
  ).toHaveCount(0);
  current = null;
  await page.evaluate(() =>
    window.dispatchEvent(new Event("axyro:identity-changed")),
  );
  await expect(
    page.getByRole("heading", { name: "Keep your training with you." }),
  ).toBeVisible();
  await expect(page.getByText("bob@example.com", { exact: true })).toHaveCount(
    0,
  );
});

test("a failed cloud identity check hides personal UI until retry succeeds", async ({
  page,
}) => {
  await mockAccount(page, () => alice);
  await page.route("**/api/user-data", (route) =>
    route.fulfill({ status: 503, json: { error: "Unavailable" } }),
  );
  await page.goto("/account");
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Could not load your training data" }),
  ).toContainText("Could not load your training data");
  await expect(
    page.getByRole("heading", { name: "Alice", exact: true }),
  ).toHaveCount(0);
});

test("OAuth-only account explains provider credentials without a password form", async ({
  page,
}) => {
  await mockAccount(page, () => ({ ...alice, providers: ["google"] }));
  await page.goto("/account");
  await expect(page.getByText(/Signed in with google/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Change password" }),
  ).toHaveCount(0);
});

test("local development administrator uses a real server session when explicitly enabled", async ({
  page,
  request,
}) => {
  const session = await request.get("/api/auth/session");
  const configuration = await session.json();
  test.skip(
    !configuration.developmentAdminEnabled,
    "Development admin is deliberately disabled on this server.",
  );
  await page.goto("/signin?next=/account");
  await page.getByLabel("Email or development login").fill("admin");
  await page.getByLabel(/^Password/).fill("admin");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Development Admin", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("PRO · Admin", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Keep your training with you." }),
  ).toBeVisible();
});

test("payment recovery offers management instead of another subscription", async ({
  page,
}) => {
  await mockAccount(page, () => alice);
  await page.route("**/api/billing/status", (route) =>
    route.fulfill({
      json: {
        hasPro: false,
        subscription: {
          status: "past_due",
          expiresAt: null,
          cancelAtPeriodEnd: false,
        },
      },
    }),
  );
  await page.goto("/account");
  await expect(
    page.getByRole("button", { name: "Manage subscription" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Upgrade to Pro" })).toHaveCount(
    0,
  );
  await expect(page.getByLabel("New password", { exact: true })).toBeHidden();
  await page.getByText("Change password", { exact: true }).click();
  await expect(page.getByLabel("New password", { exact: true })).toBeVisible();
});
