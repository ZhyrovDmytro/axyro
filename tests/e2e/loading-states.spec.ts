import { openNavigation } from "./helpers/navigation";
import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mockFreeMember } from "./helpers/free-member";

for (const width of [390, 1280]) {
  test(`renders the shell while account and training data load at ${width}px`, async ({
    page,
  }) => {
    await mockFreeMember(page);
    let releaseSession!: () => void;
    const sessionReady = new Promise<void>((resolve) => {
      releaseSession = resolve;
    });
    let releaseData!: () => void;
    const dataReady = new Promise<void>((resolve) => {
      releaseData = resolve;
    });
    await page.route("**/api/auth/session", async (route) => {
      await sessionReady;
      await route.fallback();
    });
    await page.route("**/api/user-data", async (route) => {
      await dataReady;
      await route.fallback();
    });
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await openNavigation(page);
    await expect(
      page.getByRole("navigation", { name: "Primary navigation" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Play better padel. Train beyond the court.", exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("status", { name: "" })
        .filter({ hasText: "Loading account" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Sign in", exact: true }),
    ).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Build My Training Plan" })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    if (width < 768)
      await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.screenshot({
      path: `/tmp/axyro-loading-${width}.png`,
      fullPage: true,
    });
    releaseSession();
    await expect(page.getByRole("link", { name: "Build My Training Plan" })).toBeVisible();
    releaseData();
    await expect(
      page.getByRole("banner").getByRole("link", { name: "Account", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Train at home for padel" }),
    ).toBeVisible();
    await expect(page.locator(".page-skeleton")).toHaveCount(0);
  });
}

test("workout catalog is usable before the account response arrives", async ({
  page,
}) => {
  await page.route("**/api/auth/session", () => {});
  await page.goto("/workouts");
  await expect(
    page.getByRole("heading", { name: "Find your workout." }),
  ).toBeVisible();
  await expect(page.locator(".workout-card").first()).toBeVisible();
  await openNavigation(page);
  await page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: "Home", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Play better padel. Train beyond the court.", exact: true }),
  ).toBeVisible();
});

test("library search survives account initialization", async ({ page }) => {
  await mockFreeMember(page);
  let releaseSession!: () => void;
  const sessionReady = new Promise<void>((resolve) => { releaseSession = resolve; });
  await page.route("**/api/auth/session", async (route) => {
    await sessionReady;
    await route.fallback();
  });
  await page.goto("/exercises");
  const search = page.getByRole("searchbox", { name: "Search exercises" });
  await search.fill("shoulder");
  releaseSession();
  await expect(page.getByRole("link", { name: "Account", exact: true })).toBeVisible();
  await expect(search).toHaveValue("shoulder");
  await expect(page).toHaveURL(/\/exercises\?q=shoulder$/);
});

test("a guide click during account loading preserves the library and resolves to sign-in", async ({ page }) => {
  let releaseSession!: () => void;
  const sessionReady = new Promise<void>((resolve) => { releaseSession = resolve; });
  await page.route("**/api/auth/session", async (route) => {
    await sessionReady;
    await route.fulfill({ json: { user: null, configured: true, developmentAdminEnabled: false } });
  });
  await page.goto("/exercises");
  await page.locator(".exercise-card").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page).toHaveURL(/\/exercises$/);
  releaseSession();
  await expect(page.getByRole("dialog", { name: "Sign in to continue" })).toBeVisible();
  await expect(page).toHaveURL(/\/exercises$/);
});

for (const width of [320, 1280]) {
  for (const [path, layout] of [
    ["/activity", "list"],
    ["/settings", "form"],
    ["/plan/setup", "form"],
    ["/workouts/foundation-strength/start", "player"],
  ]) {
    test(`${path} reserves its content layout while loading at ${width}px`, async ({
      page,
    }) => {
      await page.route("**/api/auth/session", () => {});
      await page.setViewportSize({ width, height: 844 });
      await page.goto(path);
      const main = page.getByRole("main");
      await expect(main).toHaveClass(new RegExp(`page-skeleton--${layout}`));
      await expect(main).toHaveAttribute("aria-busy", "true");
      const status = page
        .getByRole("status")
        .filter({ hasText: "Loading your account…" });
      await expect(status).toHaveCount(1);
      expect(
        await status.evaluate(
          (node) => node.closest('[aria-busy="true"]') === null,
        ),
      ).toBe(true);
      expect(
        await page
          .locator(".skeleton")
          .evaluateAll((nodes) =>
            nodes.every(
              (node) => getComputedStyle(node).animationName === "none",
            ),
          ),
      ).toBe(true);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    });
  }
}

test("membership requests respect reduced motion and keep dismissal available", async ({
  page,
}) => {
  await mockFreeMember(page);
  await page.route("**/api/billing/products", () => {});
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/settings");
  await page
    .getByRole("link", { name: "Activity", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  const status = dialog
    .getByRole("status")
    .filter({ hasText: "Loading memberships…" });
  await expect(status).toBeVisible();
  await expect(status.locator(".button-spinner")).toHaveCSS(
    "animation-name",
    "none",
  );
  await dialog.getByRole("button", { name: "Close paywall" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Activity", exact: true }),
  ).toBeFocused();
});

test("account errors keep navigation and offer retry", async ({ page }) => {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ status: 503, json: {} }),
  );
  await page.goto("/");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "Your account could not be loaded",
  );
  await openNavigation(page);
  await expect(
    page.getByRole("navigation", { name: "Primary navigation" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      json: { user: null, configured: true, developmentAdminEnabled: false },
    }),
  );
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { level: 1 })).not.toHaveText(
    "Your training",
  );
  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
});

test("personal home waits for membership without flashing discovery", async ({
  page,
}) => {
  await mockFreeMember(page);
  let releaseMembership!: () => void;
  const membershipReady = new Promise<void>((resolve) => {
    releaseMembership = resolve;
  });
  await page.route("**/api/billing/status", async (route) => {
    await membershipReady;
    await route.fallback();
  });
  await page.goto("/");
  await expect(
    page.getByRole("banner").getByRole("link", { name: "Account", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("main")).toHaveAttribute("aria-busy", "true");
  await expect(
    page.getByRole("heading", { name: "Train at home for padel" }),
  ).toHaveCount(0);
  releaseMembership();
  await expect(
    page.getByRole("heading", { name: "Train at home for padel" }),
  ).toBeVisible();
});
