import { openNavigation } from "./helpers/navigation";
import { mockFreeMember } from "./helpers/free-member";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await mockFreeMember(page);
});

for (const width of [320, 390, 1280]) {
  test(`paywall choices and account action are accessible at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: width === 1280 ? 900 : 844 });
    await page.route("**/api/billing/products", (route) =>
      route.fulfill({
        json: {
          products: [
            {
              id: "year",
              amount: 6999,
              currency: "usd",
              interval: "year",
              intervalCount: 1,
            },
            {
              id: "month",
              amount: 799,
              currency: "usd",
              interval: "month",
              intervalCount: 1,
            },
          ],
        },
      }),
    );
    await page.goto("/upgrade");
    const yearly = page.getByRole("radio", { name: /Yearly/ });
    const monthly = page.getByRole("radio", { name: /Monthly/ });
    await expect(monthly).toBeChecked();
    await expect(page.getByRole("radio").first()).toHaveAccessibleName(
      /Monthly/,
    );
    await expect(yearly).toHaveAccessibleName(/69.99.*year/);
    await expect(page.getByText(/due at checkout and every/)).toBeVisible();
    await yearly.focus();
    await page.keyboard.press("Space");
    await expect(yearly).toBeChecked();
    await expect(page.getByText(/69.99 due at checkout and every year/)).toBeVisible();
    const action = page.getByRole("button", { name: "Continue to Stripe" });
    await expect(action).toBeEnabled();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width === 1280) await expect(action).toBeInViewport();
    const results = await new AxeBuilder({ page })
      .include(".paywall")
      .analyze();
    expect(results.violations).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath(`paywall-${width}.png`),
      fullPage: true,
    });
  });
}

test("Free member sees membership loading before the purchase action", async ({
  page,
}) => {
  let releaseProducts!: () => void;
  const ready = new Promise<void>((resolve) => {
    releaseProducts = resolve;
  });
  await page.route("**/api/billing/products", async (route) => {
    await ready;
    await route.fulfill({ status: 503, json: { error: "Unavailable" } });
  });
  await page.goto("/upgrade");
  await expect(
    page.getByRole("status").filter({ hasText: "Loading memberships" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue to Stripe" }),
  ).toHaveCount(0);
  releaseProducts();
  await expect(
    page.getByRole("link", { name: "Try the free workout" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Restore purchases" }),
  ).toBeVisible();
});

for (const width of [320, 390, 1280]) {
  test(`Pro entry points preserve the library beneath a stable modal at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    let releaseProducts!: () => void;
    const ready = new Promise<void>((resolve) => {
      releaseProducts = resolve;
    });
    await page.route("**/api/billing/products", async (route) => {
      await ready;
      await route.fulfill({
        json: {
          products: [
            {
              id: "year",
              amount: 6999,
              currency: "usd",
              interval: "year",
              intervalCount: 1,
            },
            {
              id: "month",
              amount: 799,
              currency: "usd",
              interval: "month",
              intervalCount: 1,
            },
          ],
        },
      });
    });
    await page.goto("/exercises");
    const search = page.getByRole("searchbox");
    await search.fill("shoulder");
    await expect(page).toHaveURL(/\/exercises\?q=shoulder$/);
    await openNavigation(page);
    const nav = page.getByRole("navigation", { name: "Primary navigation" });
    await nav.getByRole("link", { name: "Activity", exact: true }).click();
    const modal = page.getByRole("dialog", { name: "Axyro Pro membership" });
    await expect(modal).toBeVisible();
    await expect(page).toHaveURL(/\/exercises(?:\?q=shoulder)?$/);
    await expect(modal.getByRole("status")).toHaveText("Loading memberships…");
    await expect(
      modal.getByRole("heading", { level: 2 }).first(),
    ).toBeInViewport();
    await expect(modal).toHaveCSS("transform", "none");
    const before = await modal.boundingBox();
    releaseProducts();
    await expect(modal.getByRole("radio").first()).toHaveAccessibleName(
      /Monthly/,
    );
    await expect(modal.getByRole("radio").first()).toBeChecked();
    expect(await modal.boundingBox()).toEqual(before);
    await expect(
      modal.getByRole("button", { name: "Continue to Stripe" }),
    ).toBeEnabled();
    const close = modal.getByRole("button", { name: "Close paywall" });
    await expect(close).toBeVisible();
    const first = modal.getByRole("radio").first();
    await first.focus();
    await page.keyboard.press("Shift+Tab");
    await expect(close).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(
      modal.getByRole("link", { name: "Manage membership", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(close).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(first).toBeFocused();
    expect(
      (await new AxeBuilder({ page }).include(".paywall-modal").analyze())
        .violations,
    ).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath(`paywall-modal-${width}.png`),
    });
    await page.keyboard.press("Escape");
    await expect(modal).toHaveCount(0);
    await expect(
      width < 768
        ? page.getByRole("button", { name: "Menu", exact: true })
        : nav.getByRole("link", { name: "Activity", exact: true }),
    ).toBeFocused();
    await expect(search).toHaveValue("shoulder");
    expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
    await openNavigation(page);
    await nav.getByRole("link", { name: "Activity", exact: true }).click();
    await expect(
      modal.getByRole("heading", {
        name: "Your workout history and progress",
      }),
    ).toBeVisible();
    await page.mouse.click(2, 2);
    await expect(modal).toHaveCount(0);
    await page
      .locator(".library-invitation")
      .getByRole("link", { name: "Explore Pro", exact: true })
      .click();
    await expect(
      modal.getByRole("heading", { name: "Your complete movement library" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/exercises(?:\?q=shoulder)?$/);
    await expect(
      modal.getByRole("button", { name: "Continue to Stripe" }),
    ).toBeEnabled();
    await modal.getByRole("button", { name: "Close paywall" }).click();
    await expect(modal).toHaveCount(0);
  });
}

test("Pro members navigate to Plan and Activity without a paywall", async ({
  page,
}) => {
  await page.route("**/api/billing/status", (route) =>
    route.fulfill({ json: { hasPro: true, subscription: null } }),
  );
  await page.goto("/exercises");
  await openNavigation(page);
  const nav = page.getByRole("navigation", { name: "Primary navigation" });
  await nav.getByRole("link", { name: "Activity", exact: true }).click();
  await expect(page).toHaveURL(/\/activity$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await openNavigation(page);
  await nav.getByRole("link", { name: "Plan", exact: true }).click();
  await expect(page).toHaveURL(/\/plan$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("a pending Pro check continues to the requested page without flashing offers", async ({
  page,
}) => {
  let releaseStatus!: () => void;
  const ready = new Promise<void>((resolve) => {
    releaseStatus = resolve;
  });
  await page.route("**/api/billing/status", async (route) => {
    await ready;
    await route.fulfill({ json: { hasPro: true, subscription: null } });
  });
  await page.goto("/exercises");
  await openNavigation(page);
  await page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: "Activity", exact: true })
    .click();
  const modal = page.getByRole("dialog");
  await expect(page).toHaveURL(/\/activity$/);
  await expect(page.getByRole("main")).toHaveAttribute("aria-busy", "true");
  await expect(
    page.getByRole("status").filter({ hasText: "Checking your access…" }),
  ).toHaveCount(1);
  await expect(modal).toHaveCount(0);
  releaseStatus();
  await expect(page).toHaveURL(/\/activity$/);
  await expect(page.locator(".page-skeleton")).toHaveCount(0);
  await expect(modal).toHaveCount(0);
});

test("unavailable memberships retain the fallback and close on account navigation", async ({
  page,
}) => {
  await page.route("**/api/billing/products", (route) =>
    route.fulfill({ status: 503, json: { error: "Unavailable" } }),
  );
  await page.goto("/exercises");
  await page.getByRole("link", { name: "Explore Pro", exact: true }).click();
  const modal = page.getByRole("dialog");
  await expect(
    modal.getByRole("link", { name: "Try the free workout" }),
  ).toBeVisible();
  await modal.getByRole("link", { name: "Manage membership" }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(modal).toHaveCount(0);
  expect(await page.evaluate(() => document.body.style.overflow)).not.toBe(
    "hidden",
  );
  await page.goBack();
  await expect(page).toHaveURL(/\/exercises$/);
  await expect(modal).toHaveCount(0);
});

test("unavailable memberships have a visible close control in a smaller desktop dialog", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.route("**/api/billing/products", (route) =>
    route.fulfill({ json: { products: [] } }),
  );
  await page.goto("/exercises");
  await openNavigation(page);
  const trigger = page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: "Activity", exact: true });
  await trigger.click();
  const modal = page.getByRole("dialog", { name: "Axyro Pro membership" });
  await expect(modal.getByRole("alert")).toContainText(
    "Subscriptions are currently unavailable",
  );
  const close = modal.getByRole("button", { name: "Close paywall" });
  await expect(close).toBeInViewport();
  expect((await modal.boundingBox())!.height).toBeLessThanOrEqual(640);
  await page.screenshot({
    path: testInfo.outputPath("unavailable-memberships-desktop.png"),
  });
  await close.click();
  await expect(modal).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page).toHaveURL(/\/exercises$/);
});
