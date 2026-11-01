import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      json: { user: null, configured: true, developmentAdminEnabled: false },
    }),
  );
  await page.route("**/api/billing/status", (route) =>
    route.fulfill({ json: { hasPro: false, subscription: null } }),
  );
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
    await expect(yearly).toBeChecked();
    await expect(yearly).toHaveAccessibleName(/69.99.*year/);
    const promoCode = page.getByRole("textbox", { name: "Promo code" });
    await expect(promoCode).toHaveAccessibleDescription(
      "Promo codes are coming soon. Codes entered here won’t change your price yet.",
    );
    await promoCode.fill("PADEL20");
    await expect(promoCode).toHaveValue("PADEL20");
    await expect(yearly).toHaveAccessibleName(/69.99.*year/);
    await monthly.focus();
    await page.keyboard.press("Space");
    await expect(monthly).toBeChecked();
    await expect(promoCode).toHaveValue("PADEL20");
    const action = page.getByRole("link", {
      name: "Create account to continue",
    });
    await expect(action).toHaveAttribute(
      "href",
      "/signup?next=%2Fplan%2Fsetup",
    );
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

test("guest sees membership loading before the account action", async ({
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
    page.getByRole("link", { name: "Create account to continue" }),
  ).toHaveCount(0);
  releaseProducts();
  await expect(
    page.getByRole("link", { name: "Try the free workout" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Create a free account" }),
  ).toBeVisible();
});
