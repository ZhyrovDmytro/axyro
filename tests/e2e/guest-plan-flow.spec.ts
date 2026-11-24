import { accountNavigation, openNavigation } from "./helpers/navigation";
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
  let data: Record<string, string> = {};
  let revision = 0;
  await page.route("**/api/user-data", (route) => {
    if (route.request().method() === "PUT") {
      data = route.request().postDataJSON().data;
      return route.fulfill({ json: { revision: ++revision } });
    }
    return route.fulfill({ json: { userId: user.id, data, revision } });
  });
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
      await openNavigation(page);
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
    await openNavigation(page);
    await accountNavigation(page)
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
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await openNavigation(page);
    await expect(
      page
        .getByRole("navigation", { name: "Primary navigation" })
        .getByRole("link", { name: "Home", exact: true }),
    ).toHaveAttribute("aria-current", "page");
  });
}

test("a failed paid save keeps answers and retries into one durable block", async ({
  page,
}) => {
  await mockAccess(page, () => true, true);
  await installDeterministicPlanner(page);
  await page.goto("/plan/setup");
  await reviewPlan(page);
  let failed = 0;
  const rejectPlanWrite = async (route: import("@playwright/test").Route) => {
    if (
      route.request().method() !== "PUT" ||
      !route.request().postDataJSON().data["veyro.training-plan.v1"]
    )
      return route.fallback();
    failed += 1;
    return route.fulfill({ status: 503, json: { error: "Unavailable" } });
  };
  await page.route("**/api/user-data", rejectPlanWrite);
  const create = page.getByRole("button", {
    name: "Create My Plan",
    exact: true,
  });
  await create.click();
  await expect(
    page.locator(".onboarding-card").getByRole("alert"),
  ).toContainText("Your answers are still here");
  expect(failed).toBe(1);
  await expect(page).toHaveURL(/\/plan\/setup$/);
  expect(
    await page.evaluate((key) => sessionStorage.getItem(key), draftKey),
  ).not.toBeNull();
  const planKey = `veyro.owner.${user.id}.veyro.training-plan.v1`;
  expect(
    await page.evaluate((key) => localStorage.getItem(key), planKey),
  ).toBeNull();
  await page.unroute("**/api/user-data", rejectPlanWrite);
  await create.click();
  await expect(page).toHaveURL(/\/plan$/);
  const identity = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).generatedAt,
    planKey,
  );
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Your training plan", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).generatedAt,
      planKey,
    ),
  ).toBe(identity);
  expect(
    await page.evaluate((key) => sessionStorage.getItem(key), draftKey),
  ).toBeNull();
});

test("a member reviews and saves a refinement, then finishes a revised workout", async ({
  page,
}) => {
  test.slow();
  // Protected pages check membership on the server too. The development account
  // admits those pages while the client routes exercise a mocked normal member.
  const login = await page.request.post("/api/auth/signin", {
    headers: { Origin: new URL(test.info().project.use.baseURL!).origin },
    data: { email: "admin", password: "admin" },
  });
  expect(login.ok()).toBe(true);
  await mockAccess(page, () => true, true);
  await installDeterministicPlanner(page);
  await page.goto("/plan/setup");
  await reviewPlan(page);
  await page
    .getByRole("button", { name: "Create My Plan", exact: true })
    .click();
  await expect(page).toHaveURL(/\/plan$/);
  const planKey = `veyro.owner.${user.id}.veyro.training-plan.v1`;
  const readPlan = () =>
    page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), planKey);
  const original = await readPlan();
  await page.goto("/plan/refine");
  const nextStep = page.getByRole("button", { name: "Continue", exact: true });
  await nextStep.press("Enter");
  await expect(
    page.getByRole("heading", { name: "How much time can you set aside?" }),
  ).toBeFocused();
  await page.getByRole("radio", { name: "5 min", exact: true }).check();
  await page.getByRole("radio", { name: "Ongoing", exact: true }).check();
  const preview = page.getByRole("button", {
    name: "Review changes",
    exact: true,
  });
  const apply = page.getByRole("button", {
    name: "Apply to upcoming workouts",
  });
  for (let i = 0; i < 3; i++) await nextStep.click();
  await preview.click();
  await expect(
    page.getByRole("heading", { name: "Review changes" }),
  ).toBeFocused();
  await expect(page.getByText("20 min → 5 min").first()).toBeVisible();
  expect((await readPlan()).profile.sessionDurationMinutes).toBe(20);
  await page.evaluate((key) => {
    const otherTabEdit = JSON.parse(localStorage.getItem(key)!);
    otherTabEdit.sessions[0].workout.name = "Edit from another tab";
    localStorage.setItem(key, JSON.stringify(otherTabEdit));
  }, planKey);
  await apply.click();
  await expect(
    page.getByText("Your plan changed since this preview", { exact: false }),
  ).toBeVisible();
  expect((await readPlan()).sessions[0].workout.name).toBe(
    "Edit from another tab",
  );
  await apply.click();
  await expect(page).toHaveURL(/\/plan\?adjusted=/);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Your training plan", exact: true }),
  ).toBeVisible();
  const updated = await readPlan();
  expect(updated.generatedAt).toBe(original.generatedAt);
  expect(updated.startDate).toBe(original.startDate);
  expect(updated.endDate).toBe(original.endDate);
  expect(updated.profile.sessionDurationMinutes).toBe(5);
  expect(updated.profile.equipment).toEqual(original.profile.equipment);
  await page.goto(`/plan/workouts/${updated.sessions[0].id}/edit`);
  await page
    .getByRole("link", { name: /^Start workout/ })
    .first()
    .click();
  const pause = page.getByRole("button", { name: "Pause", exact: true });
  const pauseSaved = page.waitForResponse((response) => {
    if (
      !response.url().endsWith("/api/user-data") ||
      response.request().method() !== "PUT" ||
      !response.ok()
    )
      return false;
    const active = response.request().postDataJSON().data[
      "veyro.active-workout.v1"
    ];
    return typeof active === "string" && JSON.parse(active).paused === true;
  });
  await pause.click();
  const resume = page.getByRole("button", { name: "Resume", exact: true });
  await expect(resume).toBeVisible();
  const pausedTime = await page.getByRole("timer").getAttribute("aria-label");
  await pauseSaved;
  await page.reload();
  await expect(resume).toBeVisible();
  await expect(page.getByRole("timer")).toHaveAttribute(
    "aria-label",
    pausedTime!,
  );
  await resume.click();
  const done = page.getByRole("heading", { name: "Strong work." });
  for (let step = 0; step < 50 && !(await done.isVisible()); step++) {
    await page.getByRole("button", { name: "Skip", exact: true }).click();
  }
  await expect(done).toBeVisible();
  await page.getByRole("button", { name: "Just right", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Edit feedback" }),
  ).toBeVisible();
});
