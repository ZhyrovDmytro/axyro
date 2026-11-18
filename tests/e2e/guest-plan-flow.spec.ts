import { expect, test, type Page } from "@playwright/test";
import { installDeterministicPlanner } from "./helpers/planner";

const user = {
  id: "a0000000-0000-4000-8000-000000000000",
  email: "player@example.com",
  displayName: "Player",
  avatarUrl: null,
  role: "user",
  providers: ["email"],
  isDevelopmentAdmin: false,
};
const draftKey = `veyro.plan-draft.${user.id}`;

async function reviewPlan(page: Page) {
  for (let step = 0; step < 12; step++) {
    if (
      await page
        .getByRole("button", { name: "Create My Plan", exact: true })
        .isVisible()
    )
      return;
    const duration = page.getByRole("radio", {
      name: "20 min Go a little longer",
    });
    if (await duration.isVisible()) await duration.check();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  }
  throw new Error("Plan review was not reached");
}

async function mockAccess(page: Page, signedIn: () => boolean, pro = false) {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      json: {
        user: signedIn() ? user : null,
        configured: true,
        developmentAdminEnabled: false,
      },
    }),
  );
  await page.route("**/api/user-data", (route) =>
    route.fulfill({
      json: {
        userId: user.id,
        data: {},
        revision: 0,
      },
    }),
  );
  await page.route("**/api/billing/status", (route) =>
    route.fulfill({
      json: {
        hasPro: signedIn() && pro,
        subscription: null,
      },
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
}

for (const pro of [false, true]) {
  for (const authMode of ["signin", "signup"] as const) {
    test(`guest questionnaire survives ${authMode} and creates a ${pro ? "Pro plan" : "locked Free preview"}`, async ({
      page,
    }) => {
      let signedIn = false;
      await mockAccess(page, () => signedIn, pro);
      let plannerCalls = 0;
      await installDeterministicPlanner(page);
      page.on("request", (request) => {
        if (request.url().endsWith("/api/training-plan")) plannerCalls++;
      });
      await page.route(`**/api/auth/${authMode}`, (route) => {
        expect(route.request().postDataJSON().next).toBe(
          "/plan/setup?resume=1&generate=1",
        );
        signedIn = true;
        return route.fulfill({ json: { user } });
      });
      await page.goto("/exercises");
      await page
        .getByRole("navigation", { name: "Primary navigation" })
        .getByRole("link", { name: "Plan", exact: true })
        .click();
      await expect(page).toHaveURL(/\/plan$/);
      await expect(
        page.getByRole("heading", { name: "Train for the way you play." }),
      ).toBeVisible();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await page
        .getByRole("link", { name: "Create my plan", exact: true })
        .click();
      await reviewPlan(page);
      const answers = await page.evaluate(() =>
        sessionStorage.getItem("veyro.plan-draft.guest"),
      );
      expect(answers).not.toBeNull();
      await page
        .getByRole("button", { name: "Create My Plan", exact: true })
        .click();
      const modal = page.getByRole("dialog", { name: "Sign in to continue" });
      await expect(modal).toBeVisible();
      expect(plannerCalls).toBe(0);
      // The explicit guest submission must win over an older account draft.
      await page.evaluate((key) => sessionStorage.setItem(key, "{}"), draftKey);
      if (authMode === "signup") {
        await modal
          .getByRole("link", { name: "Create account", exact: true })
          .click();
        await modal.getByLabel("Name", { exact: true }).fill("Player");
        await modal
          .getByLabel("Confirm password", { exact: true })
          .fill("test-password");
      }
      await modal.getByLabel("Email", { exact: true }).fill(user.email);
      await modal.getByLabel("Password", { exact: true }).fill("test-password");
      await modal
        .getByRole("button", {
          name: authMode === "signin" ? "Sign in" : "Create account",
          exact: true,
        })
        .click();
      await expect(page).toHaveURL(/\/plan$/);
      const saved = await page.evaluate(
        ({ draftKey, userId }) => ({
          preview: sessionStorage.getItem(`${draftKey}.preview`),
          active: localStorage.getItem(
            `veyro.owner.${userId}.veyro.training-plan.v1`,
          ),
          guest: sessionStorage.getItem("veyro.plan-draft.guest"),
        }),
        { draftKey, userId: user.id },
      );
      expect(saved.guest).toBeNull();
      const generated = JSON.parse((pro ? saved.active : saved.preview)!);
      expect(generated.profile).toEqual(JSON.parse(answers!));
      expect(plannerCalls).toBe(pro ? 1 : 0);
      if (pro) {
        await expect(page.getByRole("dialog")).toHaveCount(0);
        expect(saved.preview).toBeNull();
      } else {
        const paywall = page.getByRole("dialog", {
          name: "Axyro Pro membership",
        });
        await expect(
          paywall.getByRole("heading", {
            name: "Your plan is ready",
            exact: true,
          }),
        ).toBeVisible();
        expect(saved.active).toBeNull();
        await page.reload();
        await expect(paywall).toBeVisible();
      }
    });
  }
}

test("guest answers survive a full-page authentication return", async ({
  page,
}) => {
  let signedIn = false;
  await mockAccess(page, () => signedIn);
  await page.goto("/plan/setup");
  await reviewPlan(page);
  await page
    .getByRole("button", { name: "Create My Plan", exact: true })
    .click();
  const modal = page.getByRole("dialog", { name: "Sign in to continue" });
  await expect(modal).toBeVisible();
  const google = modal.getByRole("link", { name: "Continue with Google" });
  const href = await google.getAttribute("href");
  expect(new URL(href!, "http://localhost").searchParams.get("next")).toBe(
    "/plan/setup?resume=1&generate=1",
  );
  signedIn = true;
  // Simulate the provider returning to the destination using the same tab storage.
  await page.goto("/plan/setup?resume=1&generate=1");
  await expect(page).toHaveURL(/\/plan$/);
  await expect(
    page.getByRole("heading", { name: "Your plan is ready", exact: true }),
  ).toBeVisible();
});

test("guest cannot lose answers to sign-in when session storage is unavailable", async ({
  page,
}) => {
  await mockAccess(page, () => false);
  await page.goto("/plan/setup");
  await reviewPlan(page);
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new Error("Storage blocked");
    };
  });
  await page
    .getByRole("button", { name: "Create My Plan", exact: true })
    .click();
  await expect(
    page.locator(".onboarding-card").getByRole("alert"),
  ).toContainText("Allow browser storage");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("signed-in Free users without a plan see the public creation page", async ({
  page,
}) => {
  await mockAccess(page, () => true);
  await page.goto("/plan");
  await expect(
    page.getByRole("link", { name: "Create my plan", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("link", { name: "Create my plan", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Continue", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

for (const mode of ["signin", "signup"] as const) {
  test(`ordinary first ${mode} lands on Home without a paywall`, async ({
    page,
  }) => {
    let signedIn = false;
    await mockAccess(page, () => signedIn);
    await page.route(`**/api/auth/${mode}`, (route) => {
      expect(route.request().postDataJSON().next).toBe("/");
      signedIn = true;
      return route.fulfill({ json: { user } });
    });
    await page.goto("/plan");
    await page
      .getByRole("banner")
      .getByRole("link", { name: "Sign in", exact: true })
      .click();
    await expect(page).toHaveURL(/\/signin$/);
    if (mode === "signup") {
      await page
        .getByRole("link", { name: "Create account", exact: true })
        .click();
      await page.getByLabel("Name", { exact: true }).fill(user.displayName);
      await page
        .getByLabel("Confirm password", { exact: true })
        .fill("test-password");
    }
    const google = page.getByRole("link", { name: "Continue with Google" });
    expect(
      new URL(
        (await google.getAttribute("href"))!,
        "http://localhost",
      ).searchParams.get("next"),
    ).toBe("/");
    await page.getByLabel("Email", { exact: true }).fill(user.email);
    await page.getByLabel("Password", { exact: true }).fill("test-password");
    await page
      .getByRole("button", {
        name: mode === "signin" ? "Sign in" : "Create account",
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page
        .getByRole("navigation", { name: "Primary navigation" })
        .getByRole("link", { name: "Home", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
}
