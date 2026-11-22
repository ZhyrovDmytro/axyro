import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const signedIn of [false, true]) {
  for (const width of [320, 390, 768, 1280]) {
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
      await expect(
        header.getByRole("link", {
          name: signedIn ? "Account" : "Sign in",
          exact: true,
        }),
      ).toBeVisible();
      const nav = page.getByRole("navigation", {
        name: "Primary navigation",
      });
      const menu = header.getByRole("button", { name: /^(Menu|Close)$/ });
      if (width < 768) {
        await expect(nav).toBeHidden();
        const headerBefore = await header.boundingBox();
        const contentBefore = await page.locator("#main-content").boundingBox();
        await menu.click();
        await expect(menu).toHaveAttribute("aria-expanded", "true");
        await expect(
          page.getByRole("dialog", { name: "Navigation", exact: true }),
        ).toBeVisible();
        expect(await header.boundingBox()).toEqual(headerBefore);
        expect(await page.locator("#main-content").boundingBox()).toEqual(
          contentBefore,
        );
        await nav
          .getByRole("link", {
            name: "Home",
            exact: true,
          })
          .focus();
        await page.keyboard.press("Escape");
        await expect(menu).toBeFocused();
        await expect(nav).toBeHidden();
        await menu.press("Enter");
        const headerBox = await header.boundingBox();
        const navBox = await nav.boundingBox();
        expect(headerBox).not.toBeNull();
        expect(navBox).not.toBeNull();
        expect(navBox!.y).toBeGreaterThanOrEqual(
          headerBox!.y + headerBox!.height,
        );
        await page.mouse.click(4, 400);
        await expect(nav).toBeHidden();
        await menu.click();
      } else {
        await expect(menu).toBeHidden();
      }
      await expect(nav.getByRole("link")).toHaveText([
        "Home",
        "Plan",
        "Workouts",
        "Library",
        "Rehub",
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
        (
          await new AxeBuilder({ page })
            .include(".site-header")
            .include(width < 768 ? ".mobile-nav-popup" : ".primary-nav")
            .analyze()
        ).violations,
      ).toEqual([]);
      await page.screenshot({
        path: `/tmp/axyro-nav-${signedIn ? "member" : "guest"}-${width}.png`,
        scale: "css",
      });
      await nav
        .getByRole("link", {
          name: "Workouts",
          exact: true,
        })
        .click();
      if (width < 768) {
        await expect(nav).toBeHidden();
        await expect(menu).toHaveAttribute("aria-expanded", "false");
        await menu.click();
      }
      await expect(page).toHaveURL(/\/workouts$/);
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
        signedIn ? "/account" : "/signin",
      );
      await accountLink.press("Enter");
      await expect(accountLink).toHaveAttribute("aria-current", "page");
      if (!signedIn)
        await expect(accountLink).toHaveAttribute("href", "/signin");
      await header.getByRole("link", { name: "Settings" }).click();
      await expect(
        page.getByRole("heading", { name: "Settings" }),
      ).toBeVisible();
      await expect(
        page.getByRole("link", { name: "Activity", exact: true }),
      ).toHaveCount(signedIn ? 1 : 0);
      await page.goto("/workouts/foundation-strength/start");
      await expect(page.getByRole("timer")).toBeVisible();
      await expect(page.getByRole("banner")).toHaveCount(0);
    });
  }
}

for (const width of [320, 1440]) {
  test(`Rehub preview is public at ${width}px`, async ({ page }) => {
    await page.route("**/api/auth/session", () => {});
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/workouts");
    if (width < 768)
      await page.getByRole("button", { name: "Menu", exact: true }).click();
    await page
      .getByRole("navigation", { name: "Primary navigation" })
      .getByRole("link", { name: "Rehub" })
      .press("Enter");
    await expect(page).toHaveURL(/\/rehub$/);
    await expect(page.getByRole("heading", { name: "Rehub" })).toBeVisible();
    await expect(page.getByText("Coming soon to Axyro Pro")).toBeVisible();
    await expect(page.locator("main img")).toHaveCount(0);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({ path: `/tmp/rehub-${width}.png` });
  });
}
