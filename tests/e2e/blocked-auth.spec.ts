import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const account = {
  id: "a0000000-0000-4000-8000-000000000000",
  email: "player@example.com",
  displayName: "Player",
  avatarUrl: null,
  role: "user",
  providers: ["email"],
  isDevelopmentAdmin: false,
};

async function finishQuestionnaire(page: Page) {
  for (let step = 0; step < 12; step++) {
    const create = page.getByRole("button", {
      name: "Create My Plan",
      exact: true,
    });
    if (await create.isVisible()) return create;
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  }
  throw new Error("Plan review was not reached");
}

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

for (const width of [390, 1280]) {
  test(`Home plan entry asks for sign-in only after the questionnaire at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page
      .getByRole("link", { name: "Create your plan", exact: true })
      .first()
      .click();
    await expect(page).toHaveURL(/\/plan\/setup$/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const create = await finishQuestionnaire(page);
    await create.click();
    const modal = page.getByRole("dialog", { name: "Sign in to continue" });
    await expect(modal.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page).toHaveURL(/\/plan\/setup\?resume=1&generate=1$/);
    await expect(modal.getByLabel("Email", { exact: true })).toBeVisible();
    await modal
      .getByRole("link", { name: "Create account", exact: true })
      .click();
    await expect(
      modal.getByRole("heading", { name: "Create your account" }),
    ).toBeVisible();
    await modal.getByRole("link", { name: "Sign in", exact: true }).click();
    await modal.getByRole("link", { name: "Forgot password?" }).click();
    await expect(
      modal.getByRole("heading", { name: "Reset your password" }),
    ).toBeVisible();
    await modal.getByRole("link", { name: "Back to sign in" }).click();
    await page.route("**/api/auth/signin", (route) =>
      route.fulfill({
        status: 401,
        json: { error: "Invalid email or password." },
      }),
    );
    await modal.getByLabel("Email", { exact: true }).fill("player@example.com");
    await modal.getByLabel("Password", { exact: true }).fill("wrong-password");
    await modal.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(modal.getByRole("alert")).toHaveText(
      "Invalid email or password.",
    );
    expect(
      (await new AxeBuilder({ page }).include("dialog").analyze()).violations,
    ).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath(`signin-modal-${width}.png`),
    });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(create).toBeFocused();
  });
}

for (const path of [
  "/exercises/bodyweight-squat?sport=padel",
  "/plan/refine",
  "/activity",
  "/upgrade",
  "/workouts/lower-body-control",
  "/workouts/lower-body-control/start?minutes=5",
]) {
  test(`guest direct access to ${path} requires sign-in`, async ({ page }) => {
    await page.goto(path);
    const modal = page.getByRole("dialog", { name: "Sign in to continue" });
    await expect(modal.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.locator(".plan-onboarding")).toHaveCount(0);
    await expect(page.locator(".exercise-detail-hero")).toHaveCount(0);
    await expect(page.getByRole("radio", { name: /Monthly/ })).toHaveCount(0);
  });
}

test("guest entry points open sign-in and free content remains available", async ({
  page,
}) => {
  await page.goto("/exercises");
  await page.getByRole("link", { name: "Explore Pro", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Sign in to continue" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.goto("/workouts");
  await page.getByRole("link", { name: /Pro ·/ }).first().click();
  await expect(
    page.getByRole("dialog", { name: "Sign in to continue" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/workouts$/);
  await page.keyboard.press("Escape");
  await page.goto("/workouts/foundation-strength");
  await page.locator(".plan-copy a").first().click();
  await expect(
    page.getByRole("dialog", { name: "Sign in to continue" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/workouts\/foundation-strength$/);
  await page.keyboard.press("Escape");
  await page.goto("/workouts/foundation-strength/start?minutes=5");
  await expect(page.getByRole("timer")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

for (const destination of [
  "/activity",
  "/exercises/bodyweight-squat?sport=padel",
  "/activity?direct=1",
]) {
  for (const pro of [false, true]) {
    test(`sign-in continues to ${destination} for ${pro ? "Pro" : "Free"} users`, async ({
      page,
    }) => {
      let signedIn = false;
      await page.route("**/api/auth/session", (route) =>
        route.fulfill({
          json: {
            user: signedIn ? account : null,
            configured: true,
            developmentAdminEnabled: false,
          },
        }),
      );
      await page.route("**/api/user-data", (route) =>
        route.fulfill({ json: { userId: account.id, data: {}, revision: 0 } }),
      );
      await page.route("**/api/billing/status", (route) =>
        route.fulfill({
          json: { hasPro: signedIn && pro, subscription: null },
        }),
      );
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
      await page.route("**/api/auth/signin", (route) => {
        signedIn = true;
        return route.fulfill({ json: { user: account } });
      });
      await page.goto(destination);
      const modal = page.getByRole("dialog");
      await modal.getByLabel("Email", { exact: true }).fill(account.email);
      await modal.getByLabel("Password", { exact: true }).fill("test-password");
      await modal.getByRole("button", { name: "Sign in", exact: true }).click();
      if (pro || destination.startsWith("/exercises/")) {
        await expect(page).toHaveURL(
          new RegExp(
            `${destination.split("?")[0]}${destination.startsWith("/exercises/") ? "\\?sport=padel" : ""}$`,
          ),
        );
        await expect(modal).toHaveCount(0);
        if (destination.startsWith("/exercises/"))
          await expect(page.locator(".exercise-detail-hero")).toBeVisible();
      } else {
        await expect(modal).toBeVisible();
        await expect(
          modal.getByRole("button", { name: "Close paywall" }),
        ).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(modal).toHaveCount(0);
      }
    });
  }
}

for (const reduced of [false, true]) {
  test(`modal entrance ${reduced ? "fades without movement" : "fades and scales"} and can be dismissed immediately`, async ({
    page,
  }) => {
    await page.emulateMedia({
      reducedMotion: reduced ? "reduce" : "no-preference",
    });
    await page.addInitScript(() => {
      document.addEventListener("transitionrun", (event) => {
        if (event.target instanceof HTMLDialogElement) {
          const prefix = event.pseudoElement ? "backdrop" : "dialog";
          document.documentElement.dataset.modalTransitions = `${document.documentElement.dataset.modalTransitions ?? ""} ${prefix}:${event.propertyName}`;
        }
      });
    });
    await page.goto("/exercises");
    const create = page.getByRole("link", { name: "Explore Pro", exact: true });
    for (let opening = 0; opening < 2; opening++) {
      await page.evaluate(() => {
        document.documentElement.dataset.modalTransitions = "";
      });
      await create.click();
      const modal = page.getByRole("dialog");
      await expect(page.locator("html")).toHaveAttribute(
        "data-modal-transitions",
        /dialog:opacity/,
      );
      await expect(page.locator("html")).toHaveAttribute(
        "data-modal-transitions",
        /backdrop:opacity/,
      );
      const transitions = await page
        .locator("html")
        .getAttribute("data-modal-transitions");
      expect(transitions?.includes("dialog:transform")).toBe(!reduced);
      if (reduced) await expect(modal).toHaveCSS("transform", "none");
      await page.keyboard.press("Escape");
      await expect(modal).toHaveCount(0);
      await expect(create).toBeFocused();
    }
  });
}
