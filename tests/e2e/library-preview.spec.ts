import { expect, test } from "@playwright/test";

test("guest preview keeps six real guides and offers account actions after the gradient", async ({
  page,
}) => {
  await page.goto("/exercises?page=3");
  const cards = page.locator(".exercise-card");
  await expect(cards).toHaveCount(6);
  await expect(page.getByText("Locked guide", { exact: false })).toHaveCount(0);
  await expect(cards.first().locator("img, video").first()).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Create account", exact: true }),
  ).toHaveAttribute("href", "/signup?next=/exercises");
  await expect(
    page
      .locator(".library-invitation")
      .getByRole("link", { name: "Sign in", exact: true }),
  ).toHaveAttribute("href", "/signin?next=/exercises");
  await expect(
    page.getByRole("navigation", { name: "Exercise result pages" }),
  ).toHaveCount(0);
  await cards.first().click();
  await expect(page).toHaveURL(/\/exercises\/[^?]+/);
  await expect(page.locator("main img, main video").first()).toBeVisible();
});

test("Free member sees Explore Pro instead of registration in the library", async ({
  page,
}) => {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      json: {
        configured: true,
        developmentAdminEnabled: false,
        user: {
          id: "a0000000-0000-4000-8000-000000000000",
          email: "preview@example.com",
          displayName: "Preview",
          role: "user",
          providers: ["email"],
          isDevelopmentAdmin: false,
          avatarUrl: null,
        },
      },
    }),
  );
  await page.route("**/api/user-data", (route) =>
    route.fulfill({
      json: {
        userId: "a0000000-0000-4000-8000-000000000000",
        data: {},
        revision: 0,
      },
    }),
  );
  await page.route("**/api/billing/status", (route) =>
    route.fulfill({ json: { hasPro: false, subscription: null } }),
  );
  await page.goto("/exercises");
  await expect(page.locator(".exercise-card")).toHaveCount(6);
  await expect(
    page.getByRole("link", { name: "Explore Pro", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Create account", exact: true }),
  ).toHaveCount(0);
});
