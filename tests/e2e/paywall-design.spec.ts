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
    const promoCode = page.getByRole("textbox", { name: "Promo code" });
    await expect(promoCode).toHaveAccessibleDescription(
      "Promo codes are coming soon. Codes entered here won’t change your price yet.",
    );
    await promoCode.fill("PADEL20");
    await expect(promoCode).toHaveValue("PADEL20");
    await expect(yearly).toHaveAccessibleName(/69.99.*year/);
    await yearly.focus();
    await page.keyboard.press("Space");
    await expect(yearly).toBeChecked();
    await expect(promoCode).toHaveValue("PADEL20");
    const action = page.getByRole("button", { name: "Unlock My Plan" });
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
    page.getByRole("button", { name: "Unlock My Plan" }),
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
    const nav = page.getByRole("navigation", { name: "Primary navigation" });
    await nav.getByRole("link", { name: "Plan", exact: true }).click();
    const modal = page.getByRole("dialog", { name: "Axyro Pro membership" });
    await expect(modal).toBeVisible();
    await expect(page).toHaveURL(/\/exercises$/);
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
      modal.getByRole("button", { name: "Unlock My Plan" }),
    ).toBeEnabled();
    await expect(
      modal.getByRole("button", { name: "Close paywall" }),
    ).toHaveCount(0);
    const first = modal.getByRole("radio").first();
    await first.focus();
    await page.keyboard.press("Shift+Tab");
    await expect(
      modal.getByRole("link", { name: "Manage membership", exact: true }),
    ).toBeFocused();
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
    await page.mouse.click(2, 2);
    await expect(modal).toBeVisible();
    await expect(search).toHaveValue("shoulder");
    expect(await page.evaluate(() => document.body.style.overflow)).toBe(
      "hidden",
    );
    await page.goto("/exercises");
    await nav.getByRole("link", { name: "Activity", exact: true }).click();
    await expect(
      modal.getByRole("heading", {
        name: "Unlock your full training progress",
      }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(modal).toBeVisible();
    await page.goto("/exercises");
    await page
      .locator(".library-invitation")
      .getByRole("link", { name: "Explore Pro", exact: true })
      .click();
    await expect(
      modal.getByRole("heading", { name: "Your complete movement library" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/exercises$/);
    await expect(
      modal.getByRole("button", { name: "Start Pro" }),
    ).toBeEnabled();
    await expect(modal.getByRole("button", { name: /Close/ })).toHaveCount(0);
  });
}

test("Pro members navigate to Plan and Activity without a paywall", async ({
  page,
}) => {
  await page.route("**/api/billing/status", (route) =>
    route.fulfill({ json: { hasPro: true, subscription: null } }),
  );
  await page.goto("/exercises");
  const nav = page.getByRole("navigation", { name: "Primary navigation" });
  await nav.getByRole("link", { name: "Activity", exact: true }).click();
  await expect(page).toHaveURL(/\/activity$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
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
  await page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: "Activity", exact: true })
    .click();
  const modal = page.getByRole("dialog");
  await expect(modal.getByRole("status")).toHaveText("Checking membership…");
  await expect(modal.locator(".paywall")).toHaveCount(0);
  releaseStatus();
  await expect(page).toHaveURL(/\/activity$/);
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
