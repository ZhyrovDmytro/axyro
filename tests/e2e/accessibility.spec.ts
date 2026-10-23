import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const route of [
  "/",
  "/workouts",
  "/exercises",
  "/plan/setup",
  "/settings",
  "/signin",
  "/signup",
  "/account",
  "/upgrade",
  "/workouts/lower-body-control",
]) {
  test(`${route} has no automatically detectable accessibility violations`, async ({
    page,
  }) => {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page }).analyze();

    expect(results.violations).toEqual([]);
  });
}

test("workout player and guidance dialog pass an accessibility scan", async ({
  page,
}) => {
  await page.goto("/workouts/foundation-strength/start?intensity=standard");
  await page.getByRole("main").waitFor();
  await expect(page.getByRole("timer")).toBeVisible();

  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  const guidanceTrigger = page.getByRole("button", {
    name: "Open workout guidance settings",
  });
  await guidanceTrigger.click();
  await expect(
    page.getByRole("dialog", { name: "Guidance settings" }),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

  await expect(
    page.getByRole("button", { name: "Close guidance settings" }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "Save offline" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(guidanceTrigger).toBeFocused();
});
