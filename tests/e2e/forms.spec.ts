import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const member = {
  id: "a0000000-0000-4000-8000-000000000000",
  email: "alice@example.com",
  displayName: "Alice",
  avatarUrl: null,
  role: "user",
  providers: ["email"],
  isDevelopmentAdmin: false,
};

async function mockAuth(page: Page, signedIn = false, configured = true) {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      json: {
        user: signedIn ? member : null,
        configured,
        developmentAdminEnabled: false,
      },
    }),
  );
  await page.route("**/api/billing/status", (route) =>
    route.fulfill({ json: { hasPro: false, subscription: null } }),
  );
  await page.route("**/api/user-data", (route) =>
    route.fulfill({ json: { userId: member.id, data: {}, revision: 0 } }),
  );
}

for (const width of [320, 390, 1440]) {
  test(`account forms remain accessible and fit at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await mockAuth(page);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const [route, title, action] of [
      ["signup", "Create your account", "Create account"],
      ["signin", "Welcome back", "Sign in"],
      ["forgot-password", "Reset your password", "Send reset link"],
      ["reset-password", "Choose a new password", "Update password"],
    ]) {
      await page.goto(`/${route}`);
      await expect(page.getByRole("heading", { name: title })).toBeVisible();
      await expect(
        page.getByRole("button", { name: action, exact: true }),
      ).toBeEnabled();
      await expect(page.locator(".auth-story")).toBeVisible({
        visible: width >= 896,
      });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await expect(
        page.getByRole("link", { name: "Back to Axyro" }),
      ).toHaveCount(route === "signin" ? 0 : 1);
      const fields = page.locator(".account-form input");
      for (const field of await fields.all()) {
        expect(
          await field.evaluate((input) =>
            parseFloat(getComputedStyle(input).fontSize),
          ),
        ).toBeGreaterThanOrEqual(16);
      }
      await fields.first().focus();
      expect(
        await fields
          .first()
          .evaluate((input) => getComputedStyle(input).outlineStyle),
      ).toBe("solid");
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.screenshot({
        path: test.info().outputPath(`${route}-${width}.png`),
        fullPage: true,
        scale: "css",
      });
    }
    expect(errors).toEqual([]);
  });
}

test("signup preserves validation, independent password visibility and verification feedback", async ({
  page,
}) => {
  await mockAuth(page);
  let submissions = 0;
  await page.route("**/api/auth/signup", async (route) => {
    submissions++;
    expect(route.request().postDataJSON()).toMatchObject({
      email: member.email,
      displayName: "Alice",
      next: "/account",
    });
    await route.fulfill({ json: { user: null } });
  });
  await page.goto("/signup?next=/account");
  await page.getByLabel("Name", { exact: true }).fill("Alice");
  await page.getByLabel("Email", { exact: true }).fill(member.email);
  await page.getByLabel("Password", { exact: true }).fill("a-long-password");
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("different-password");
  await page
    .getByRole("button", { name: "Show password", exact: true })
    .click();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
    "type",
    "text",
  );
  await expect(
    page.getByLabel("Confirm password", { exact: true }),
  ).toHaveAttribute("type", "password");
  await page
    .getByRole("button", { name: "Hide password", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.locator(".auth-panel").getByRole("alert")).toHaveText(
    "Passwords must match.",
  );
  expect(submissions).toBe(0);
  await page
    .getByLabel("Confirm password", { exact: true })
    .fill("a-long-password");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Check your email");
  expect(submissions).toBe(1);
});

test("recovery reports success and server errors, with a working sign-in link", async ({
  page,
}) => {
  await mockAuth(page);
  await page.route("**/api/auth/recover", (route) =>
    route.fulfill({ json: {} }),
  );
  await page.goto("/forgot-password");
  await page.getByLabel("Email", { exact: true }).fill(member.email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("status")).toContainText("If an account exists");
  await page.route("**/api/auth/recover", (route) =>
    route.fulfill({ status: 429, json: { error: "Please try again later." } }),
  );
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.locator(".auth-panel").getByRole("alert")).toHaveText(
    "Please try again later.",
  );
  await page.getByRole("link", { name: "Back to sign in" }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
});

test("account profile, password and deletion forms share accessible controls", async ({
  page,
}) => {
  await mockAuth(page, true);
  await page.goto("/account");
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Alice");
  await expect(page.getByLabel("Email", { exact: true })).toHaveAttribute(
    "readonly",
    "",
  );
  await page.getByText("Change password", { exact: true }).click();
  await page
    .getByLabel("New password", { exact: true })
    .fill("a-long-password");
  await page
    .getByRole("button", { name: "Show new password", exact: true })
    .click();
  await expect(
    page.getByLabel("New password", { exact: true }),
  ).toHaveAttribute("type", "text");
  await expect(
    page.getByLabel("Current password", { exact: true }),
  ).toHaveAttribute("type", "password");
  await page
    .getByRole("button", { name: "Delete account", exact: true })
    .click();
  await expect(page.getByLabel("Type DELETE to confirm")).toHaveAttribute(
    "pattern",
    "DELETE",
  );
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("unavailable account services retain the free workout fallback", async ({
  page,
}) => {
  await mockAuth(page, false, false);
  await page.goto("/signup");
  await expect(
    page.getByText(/Account services are temporarily unavailable/),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Try the free workout" }),
  ).toHaveAttribute("href", "/workouts/foundation-strength");
  await expect(
    page.getByRole("button", { name: "Create account", exact: true }),
  ).toHaveCount(0);
});
