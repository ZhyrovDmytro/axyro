import { expect, test } from "@playwright/test";
import { publishedExercises } from "../../src/content/exercises";
import { starterWorkouts } from "../../src/content/workouts";
import { FREE_WORKOUT_ID } from "../../src/domain/access/entitlements";
import { librarySelection } from "../../src/lib/library-access";
import { mockFreeMember } from "./helpers/free-member";

const ordered = librarySelection(publishedExercises, true);

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
        ],
      },
    }),
  );
});

for (const index of [0, 9, 10, 39]) {
  test(`Free account ${index < 10 ? "opens" : "cannot open"} exercise ${index + 1} by direct URL`, async ({
    page,
  }) => {
    await page.goto(`/exercises/${ordered[index].slug}`);
    if (index < 10) {
      await expect(page.locator(".exercise-detail-hero h1")).toHaveText(
        ordered[index].name,
      );
      await expect(page.getByRole("dialog")).toHaveCount(0);
    } else {
      const modal = page.getByRole("dialog", { name: "Axyro Pro membership" });
      await expect(modal).toBeVisible();
      await expect(page.locator(".exercise-detail-hero")).toHaveCount(0);
      await expect(modal.getByRole("button", { name: /Close/ })).toHaveCount(0);
      await page.keyboard.press("Escape");
      await page.mouse.click(2, 2);
      await expect(modal).toBeVisible();
      await page.reload();
      await expect(modal).toBeVisible();
    }
  });
}

test("Pro account can open a guide beyond the free ten", async ({ page }) => {
  await page.route("**/api/billing/status", (route) =>
    route.fulfill({ json: { hasPro: true, subscription: null } }),
  );
  await page.goto(`/exercises/${ordered[10].slug}`);
  await expect(page.locator(".exercise-detail-hero h1")).toHaveText(
    ordered[10].name,
  );
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("only the first workout is accessible to Free accounts", async ({
  page,
}) => {
  expect(starterWorkouts[0].id).toBe(FREE_WORKOUT_ID);
  await page.goto(`/workouts/${starterWorkouts[0].slug}`);
  await expect(page.getByRole("link", { name: /Start workout/ })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto(`/workouts/${starterWorkouts[1].slug}`);
  const modal = page.getByRole("dialog");
  await expect(modal).toBeVisible();
  await expect(modal.getByRole("button", { name: /Close/ })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(modal).toBeVisible();
  await page.goto("/workouts");
  await page.getByRole("link", { name: /Pro ·/ }).first().click();
  await expect(modal).toBeVisible();
  await expect(page).toHaveURL(/\/workouts$/);
});

test("loaded catalog cards retain the first-ten boundary when membership is Free", async ({
  page,
}, testInfo) => {
  const response = await page.request.post("/api/auth/signin", {
    headers: { Origin: new URL(String(testInfo.project.use.baseURL)).origin },
    data: { email: "admin", password: "admin" },
  });
  expect(response.ok()).toBe(true);
  // The full catalog was rendered while authorized; the current client membership is Free.
  await page.goto("/exercises");
  const cards = page.locator(".exercise-card");
  await expect(cards).toHaveCount(18);
  await expect(cards.nth(9)).toContainText("View guide");
  await expect(cards.nth(10)).toContainText("Unlock guide");
  await expect(cards.nth(10).locator(".membership-lock")).toHaveText("Pro");
  await cards.nth(10).click();
  const modal = page.getByRole("dialog", { name: "Axyro Pro membership" });
  await expect(modal).toBeVisible();
  await expect(page).toHaveURL(/\/exercises$/);
  await page.keyboard.press("Escape");
  await expect(modal).toBeVisible();
});

test.describe("Czech browser language", () => {
  test.use({ locale: "cs-CZ" });
  test("the global first-ten access boundary stays the same", async ({
    page,
  }) => {
    await page.goto(`/exercises/${ordered[9].slug}`);
    await expect(page.locator(".exercise-detail-hero h1")).toHaveText(
      ordered[9].name,
    );
    await page.goto(`/exercises/${ordered[10].slug}`);
    await expect(
      page.getByRole("dialog", { name: "Axyro Pro membership" }),
    ).toBeVisible();
    await expect(page.locator(".exercise-detail-hero")).toHaveCount(0);
  });
});
