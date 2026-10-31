import { expect, test } from "@playwright/test";
import { generateTrainingPlan } from "../../src/domain/training-plan/generate-training-plan";
import { representativeAthleteProfiles } from "../../src/domain/training-plan/evaluation-profiles";

test("match refinement keeps fields and actions spaced at phone and desktop widths", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      json: {
        user: {
          id: "development-admin",
          email: "admin@example.com",
          displayName: "Test player",
          avatarUrl: null,
          role: "admin",
          providers: ["email"],
          isDevelopmentAdmin: true,
        },
        configured: true,
        developmentAdminEnabled: true,
      },
    }),
  );
  await page.route("**/api/billing/status", (route) =>
    route.fulfill({ json: { hasPro: true, subscription: null } }),
  );
  const plan = generateTrainingPlan(
    representativeAthleteProfiles[1],
    new Date(),
  );
  await page.goto("/plan/refine");
  await page.evaluate((seed) => {
    localStorage.setItem(
      "veyro.owner.development-admin.veyro.training-plan.v1",
      JSON.stringify(seed),
    );
  }, plan);
  await page.reload();
  for (let step = 0; step < 5; step++) {
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  }
  const date = page.getByLabel("Match date", { exact: true });
  const importance = page.getByLabel("Importance", { exact: true });
  const add = page.getByRole("button", { name: "Add match", exact: true });
  await expect(date).toBeVisible();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const dateBox = (await date.boundingBox())!;
    const importanceBox = (await importance.boundingBox())!;
    const addBox = (await add.boundingBox())!;
    if (width < 640) {
      expect(
        addBox.y - importanceBox.y - importanceBox.height,
      ).toBeGreaterThanOrEqual(16);
    } else {
      expect(
        Math.abs(dateBox.y + dateBox.height - addBox.y - addBox.height),
      ).toBeLessThan(2);
      expect(
        addBox.x - importanceBox.x - importanceBox.width,
      ).toBeGreaterThanOrEqual(16);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `/tmp/match-form-${width}.png`,
      fullPage: true,
    });
  }
  await date.fill("2026-11-05");
  await importance.selectOption("important");
  await importance.focus();
  await page.keyboard.press("Tab");
  await expect(add).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByText("2026-11-05", { exact: true })).toBeVisible();
  await expect(date).toHaveValue("");
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(page.getByText("2026-11-05", { exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});
