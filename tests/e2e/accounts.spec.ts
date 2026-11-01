import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

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

test("password change shows progress and confirms success beside the form", async ({
  page,
}) => {
  await mockAccount(page, () => alice);
  let finish!: () => void;
  const pending = new Promise<void>((resolve) => {
    finish = resolve;
  });
  let requests = 0;
  await page.route("**/api/auth/password", async (route) => {
    requests++;
    expect(route.request().postDataJSON()).toEqual({
      currentPassword: "old-password",
      password: "new-long-password",
      confirmPassword: "new-long-password",
    });
    await pending;
    await route.fulfill({ json: { ok: true } });
  });
  await page.goto("/account");
  await page.getByText("Change password", { exact: true }).click();
  await page
    .getByLabel("Current password", { exact: true })
    .fill("old-password");
  await page
    .getByLabel("New password", { exact: true })
    .fill("new-long-password");
  await page
    .getByLabel("Confirm new password", { exact: true })
    .fill("new-long-password");
  await page
    .getByRole("button", { name: "Update password", exact: true })
    .click();
  try {
    await expect(
      page.getByRole("button", { name: "Updating password…", exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByLabel("New password", { exact: true }),
    ).toBeDisabled();
    await page.screenshot({
      path: test.info().outputPath("password-saving.png"),
      fullPage: true,
      scale: "css",
    });
    await expect(page.locator(".account-security form")).toHaveAttribute(
      "aria-busy",
      "true",
    );
  } finally {
    finish();
  }
  await expect(
    page.locator(".account-security").getByRole("status"),
  ).toContainText("Your password has been updated.");
  await expect(
    page.getByLabel("Current password", { exact: true }),
  ).toHaveValue("");
  await expect(page.getByLabel("New password", { exact: true })).toHaveValue(
    "",
  );
  expect(requests).toBe(1);
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: test.info().outputPath(`password-updated-${width}.png`),
      fullPage: true,
      scale: "css",
    });
  }
});

test("password errors stay beside the form and preserve values for retry", async ({
  page,
}) => {
  await mockAccount(page, () => alice);
  await page.route("**/api/auth/password", (route) =>
    route.fulfill({
      status: 400,
      json: { error: "Check your current password and try again." },
    }),
  );
  await page.goto("/account");
  await page.getByText("Change password", { exact: true }).click();
  await page
    .getByLabel("Current password", { exact: true })
    .fill("old-password");
  await page
    .getByLabel("New password", { exact: true })
    .fill("new-long-password");
  await page
    .getByLabel("Confirm new password", { exact: true })
    .fill("different-password");
  await page
    .getByRole("button", { name: "Update password", exact: true })
    .click();
  await expect(page.locator(".account-security").getByRole("alert")).toHaveText(
    "Passwords must match.",
  );
  await page
    .getByLabel("Confirm new password", { exact: true })
    .fill("new-long-password");
  await page
    .getByRole("button", { name: "Update password", exact: true })
    .click();
  await expect(page.locator(".account-security").getByRole("alert")).toHaveText(
    "Check your current password and try again.",
  );
  await expect(page.getByLabel("New password", { exact: true })).toHaveValue(
    "new-long-password",
  );
  await expect(
    page.getByRole("button", { name: "Update password", exact: true }),
  ).toBeEnabled();
  await page.route("**/api/auth/password", (route) =>
    route.fulfill({ json: { ok: true } }),
  );
  await page
    .getByRole("button", { name: "Update password", exact: true })
    .click();
  await expect(
    page.locator(".account-security").getByRole("status"),
  ).toContainText("Your password has been updated.");
  await expect(
    page.locator(".account-security").getByRole("alert"),
  ).toHaveCount(0);
});

test("recovery password replacement shows progress and an explicit completion screen", async ({
  page,
}) => {
  await mockAccount(page, () => alice);
  let finish!: () => void;
  const pending = new Promise<void>((resolve) => {
    finish = resolve;
  });
  await page.route("**/api/auth/password", async (route) => {
    await pending;
    await route.fulfill({ json: { ok: true } });
  });
  await page.goto("/reset-password");
  await page.getByLabel("Password", { exact: true }).fill("new-long-password");
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("new-long-password");
  await page
    .getByRole("button", { name: "Update password", exact: true })
    .click();
  try {
    await expect(
      page.getByRole("button", { name: "Updating password…", exact: true }),
    ).toBeDisabled();
    await expect(page.getByLabel("Password", { exact: true })).toBeDisabled();
  } finally {
    finish();
  }
  await expect(
    page.getByRole("heading", { name: "Password updated", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".auth-panel").getByRole("status")).toContainText(
    "Your password has been updated.",
  );
  await expect(page.getByLabel("Password", { exact: true })).toHaveCount(0);
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: test.info().outputPath(`reset-completed-${width}.png`),
      fullPage: true,
      scale: "css",
    });
  }
  await page.getByRole("link", { name: "Continue to account" }).click();
  await expect(page).toHaveURL(/\/account$/);
});
