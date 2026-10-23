import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("empty search can be cleared without restoring the old query", async ({
  page,
}) => {
  await page.goto("/exercises?q=zzzz-no-movement");
  await page.getByRole("link", { name: "Clear all filters" }).click();
  await expect(page.getByRole("searchbox")).toHaveValue("");
  await expect(page).toHaveURL(/\/exercises$/);
  await expect(
    page.getByRole("heading", { name: "No exercises found" }),
  ).toHaveCount(0);
});

test("filter changes reset pagination and can be reset from the search panel", async ({
  page,
}) => {
  await page.goto("/exercises?page=2");
  await page.getByRole("searchbox").fill("shoulder");
  await expect(page).toHaveURL(/\/exercises\?q=shoulder$/);
  await page.getByRole("button", { name: "Reset filters" }).click();
  await expect(page.getByRole("searchbox")).toHaveValue("");
  await expect(page).toHaveURL(/\/exercises$/);
});

test("keyboard users can skip navigation and reach Activity", async ({
  page,
}) => {
  await page.goto("/workouts");
  await page.getByRole("heading", { level: 1 }).waitFor();
  // Next's development toolbar can precede the app in the document tab order.
  await page.getByRole("link", { name: "Skip to content" }).focus();
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
  await page
    .getByRole("navigation", { name: "Primary navigation" })
    .getByRole("link", { name: "Activity" })
    .press("Enter");
  await expect(
    page.getByRole("link", { name: "Activity", exact: true }),
  ).toHaveAttribute("aria-current", "page");
});

test("setup moves focus forward and back", async ({ page }) => {
  await page.goto("/plan/setup");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.locator("#setup-step-heading")).toBeFocused();
  await expect(page.locator("#setup-step-heading")).toContainText("Step 2");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.locator("#setup-step-heading")).toBeFocused();
  await expect(page.locator("#setup-step-heading")).toContainText("Step 1");
});

for (const width of [320, 768, 1280]) {
  test(`missing pages offer recovery without overflow at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/this-page-does-not-exist");
    await expect(
      page.getByRole("heading", { name: "This page isn’t here" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page
      .getByRole("link", { name: "Browse workouts", exact: true })
      .click();
    await expect(page).toHaveURL(/\/workouts$/);
  });
}
