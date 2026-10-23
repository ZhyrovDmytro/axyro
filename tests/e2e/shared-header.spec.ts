import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const signedIn of [false, true]) {
  for (const width of [320, 768, 1280]) {
    test(`${signedIn ? "member" : "guest"} shares navigation at ${width}px`, async ({
      page,
    }) => {
      const user = signedIn
        ? {
            id: "a0000000-0000-4000-8000-000000000000",
            email: "test@example.com",
            displayName: "Test",
            role: "user",
            providers: ["email"],
            avatarUrl: null,
          }
        : null;
      await page.route("**/api/auth/session", (route) =>
        route.fulfill({
          json: { user, configured: true, developmentAdminEnabled: false },
        }),
      );
      await page.route("**/api/billing/status", (route) =>
        route.fulfill({ json: { hasPro: false, subscription: null } }),
      );
      if (user)
        await page.route("**/api/user-data", (route) =>
          route.fulfill({ json: { userId: user.id, data: {}, revision: 0 } }),
        );
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      const header = page.getByRole("banner");
      await expect(header).toHaveCount(1);
      await expect(
        header.getByRole("link", { name: "Axyro home" }),
      ).toBeVisible();
      await expect(page).toHaveTitle(/Axyro/);
      const nav = header.getByRole("navigation", {
        name: "Primary navigation",
      });
      await expect(nav.getByRole("link")).toHaveText([
        "Home",
        "Plan",
        "Workouts",
        "Library",
        "Activity",
      ]);
      await expect(
        nav.getByRole("link", { name: "Home", exact: true }),
      ).toHaveAttribute("aria-current", "page");
      await expect(
        header.getByRole("link", {
          name: signedIn ? "Account" : "Sign in",
          exact: true,
        }),
      ).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const targets = await nav.getByRole("link").evaluateAll((links) =>
        links.map((link) => {
          const rect = link.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        }),
      );
      expect(
        targets.every((rect) => rect.width >= 44 && rect.height >= 44),
      ).toBe(true);
      expect(
        (await new AxeBuilder({ page }).include(".site-header").analyze())
          .violations,
      ).toEqual([]);
      await page.screenshot({
        path: `/tmp/axyro-nav-${signedIn ? "member" : "guest"}-${width}.png`,
        scale: "css",
      });
      await nav.getByRole("link", { name: "Workouts", exact: true }).click();
      await expect(
        nav.getByRole("link", { name: "Workouts", exact: true }),
      ).toHaveAttribute("aria-current", "page");
      await expect(
        header.getByRole("link", {
          name: signedIn ? "Account" : "Sign in",
          exact: true,
        }),
      ).toBeVisible();
      const accountLink = header.getByRole("link", {
        name: signedIn ? "Account" : "Sign in",
        exact: true,
      });
      await expect(accountLink).toHaveAttribute(
        "href",
        signedIn ? "/account" : "/signin?next=%2Fworkouts",
      );
      await accountLink.press("Enter");
      await expect(accountLink).toHaveAttribute("aria-current", "page");
      if (!signedIn)
        await expect(accountLink).toHaveAttribute("href", "/signin?next=%2F");
      await page.goto("/workouts/foundation-strength/start");
      await expect(page.getByRole("timer")).toBeVisible();
      await expect(page.getByRole("banner")).toHaveCount(0);
    });
  }
}
