import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mockFreeMember } from "./helpers/free-member";

async function reviewPlan(page: Page) {
  await page.goto("/plan/setup");
  for (let step = 0; step < 12; step++) {
    if (
      await page
        .getByRole("button", { name: "Create My Plan", exact: true })
        .isVisible()
    )
      return;
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  }
  throw new Error("Plan review was not reached");
}

test.beforeEach(async ({ page }) => {
  await mockFreeMember(page);
  await page.route("**/api/billing/products", (route) =>
    route.fulfill({
      json: {
        products: [
          {
            id: "month",
            amount: 799,
            currency: "usd",
            interval: "month",
            intervalCount: 1,
          },
          {
            id: "year",
            amount: 6999,
            currency: "usd",
            interval: "year",
            intervalCount: 1,
          },
        ],
      },
    }),
  );
});

for (const width of [390, 1280]) {
  test(`created preview opens Plan behind a non-dismissible paywall at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    let plannerCalls = 0;
    await page.route("**/api/training-plan", (route) => {
      plannerCalls++;
      return route.fulfill({ status: 403 });
    });
    await reviewPlan(page);
    await page
      .getByRole("button", { name: "Create My Plan", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Creating your plan", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: testInfo.outputPath(`creation-progress-${width}.png`),
    });
    await expect(page).toHaveURL(/\/plan$/);
    const modal = page.getByRole("dialog", { name: "Axyro Pro membership" });
    await expect(modal).toBeVisible();
    await expect(
      modal.getByRole("heading", { name: "Your plan is ready", exact: true }),
    ).toBeVisible();
    await expect(modal).toContainText(
      "Axyro Pro includes your training schedule and guided sessions.",
    );
    await expect(page.locator(".plan-preview")).toHaveAttribute("inert", "");
    await expect(page.locator(".plan-preview h1")).toHaveText(
      "Your training plan",
    );
    await expect(modal.getByRole("button", { name: /Close/ })).toHaveCount(0);
    await expect(modal.getByRole("radio", { name: /Monthly/ })).toBeChecked();
    await page.keyboard.press("Escape");
    await page.mouse.click(2, 2);
    await expect(modal).toBeVisible();
    await modal.getByRole("radio", { name: /Monthly/ }).focus();
    await page.keyboard.press("Shift+Tab");
    await expect(
      modal.getByRole("link", { name: "Manage membership" }),
    ).toBeFocused();
    expect(plannerCalls).toBe(0);
    const saved = await page.evaluate(() => ({
      preview: sessionStorage.getItem(
        "veyro.plan-draft.a0000000-0000-4000-8000-000000000000.preview",
      ),
      draft: sessionStorage.getItem(
        "veyro.plan-draft.a0000000-0000-4000-8000-000000000000",
      ),
    }));
    expect(saved.preview).not.toBeNull();
    expect(saved.draft).not.toBeNull();
    expect(
      (await new AxeBuilder({ page }).include("dialog").analyze()).violations,
    ).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath(`locked-plan-paywall-${width}.png`),
    });
    await page.reload();
    await expect(modal).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(modal).toBeVisible();
    await modal.getByRole("link", { name: "Manage membership" }).click();
    await expect(page).toHaveURL(/\/account$/);
    await expect(modal).toHaveCount(0);
  });
}

test("preview storage errors preserve the questionnaire and permit retry", async ({
  page,
}) => {
  await reviewPlan(page);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith("veyro.plan-draft.") && key.endsWith(".preview"))
        throw new Error("Storage unavailable");
      original.call(this, key, value);
    };
  });
  await page
    .getByRole("button", { name: "Create My Plan", exact: true })
    .click();
  await expect(
    page.locator(".onboarding-card").getByRole("alert"),
  ).toContainText("Your answers are still here");
  await expect(page).toHaveURL(/\/plan\/setup$/);
  await expect(
    page.getByRole("button", { name: "Create My Plan", exact: true }),
  ).toBeEnabled();
});
