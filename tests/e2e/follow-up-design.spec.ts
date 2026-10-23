import { expect, test, type Page } from "@playwright/test";
import { generateTrainingPlan } from "../../src/domain/training-plan/generate-training-plan";
import { representativeAthleteProfiles } from "../../src/domain/training-plan/evaluation-profiles";
import { toDateKey } from "../../src/domain/training-plan/date";

async function seedPlan(page: Page, baseURL: string) {
  const response = await page.request.post("/api/auth/signin", {
    headers: { Origin: new URL(baseURL).origin },
    data: { email: "admin", password: "admin" },
  });
  expect(response.ok()).toBe(true);
  const profile = {
    ...representativeAthleteProfiles[1],
    sessionsPerWeek: 3 as const,
    preferredDays: ["monday", "wednesday", "friday"] as const,
  };
  const plan = generateTrainingPlan(
    { ...profile, preferredDays: [...profile.preferredDays] },
    new Date(),
  );
  plan.sessions[0].scheduledDate = toDateKey(new Date());
  await page.goto("/plan");
  await page.evaluate(
    ({ plan }) => {
      localStorage.setItem(
        "veyro.owner.development-admin.veyro.training-plan.v1",
        JSON.stringify(plan),
      );
      localStorage.setItem(
        "veyro.owner.development-admin.veyro.training-profile.v2",
        JSON.stringify(plan.profile),
      );
    },
    { plan },
  );
  await page.reload();
  return plan;
}

for (const viewport of [
  { width: 844, height: 390 },
  { width: 667, height: 375 },
]) {
  test(`landscape ${viewport.width} keeps title timer and controls together after skipping`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/workouts/foundation-strength/start?minutes=5");
    for (let index = 0; index < 6; index++) {
      await page.getByRole("button", { name: "Skip", exact: true }).click();
      if (index === 0)
        await page.screenshot({
          path: `/tmp/axyro-followup-player-${viewport.width}.png`,
          scale: "css",
        });
      const stage = await page.locator(".player-stage").boundingBox();
      for (const element of [
        page.locator(".player-status h1"),
        page.getByRole("timer"),
        page.locator(".player-controls"),
      ]) {
        const bounds = await element.boundingBox();
        expect(bounds!.y).toBeGreaterThanOrEqual(stage!.y);
        expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(
          stage!.y + stage!.height,
        );
      }
    }
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await expect(page.getByText("Paused", { exact: true })).toBeInViewport();
    await page.getByRole("button", { name: "Previous", exact: true }).click();
    await expect(page.getByRole("timer")).toBeInViewport();
  });
}

test("reduced motion stops cadence movement without removing its cue", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/workouts/foundation-strength/start?minutes=5");
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await expect(page.getByLabel("Visual movement cadence")).toBeVisible();
  await expect(page.locator(".cadence-visual span").first()).toHaveCSS(
    "animation-name",
    "none",
  );
});

test("only the selected effort uses the orange fill", async ({ page }) => {
  await page.goto("/workouts/foundation-strength");
  const challenging = page.getByRole("button", { name: /Challenging/ });
  const standard = page.getByRole("button", { name: /Standard/ });
  await challenging.click();
  await expect(challenging).toHaveAttribute("aria-pressed", "true");
  await expect(standard).toHaveAttribute("aria-pressed", "false");
  await expect(challenging).toHaveCSS("background-color", "rgb(255, 107, 36)");
  await expect(standard).toHaveCSS("background-color", "rgb(27, 27, 27)");
  await expect(standard).toContainText("Recommended");
  await page.locator(".effort-options").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "/tmp/axyro-followup-effort.png",
    scale: "css",
  });
});

test("free preview search explains its scope and can be reset", async ({
  page,
}) => {
  await page.goto("/exercises?q=shoulder");
  await expect(
    page.getByRole("heading", { name: "No free-preview guides match" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Search covers the 6 free guides. Pro opens all 40 exercises.",
    ),
  ).toBeVisible();
  await page.getByRole("link", { name: "Clear all filters" }).click();
  await expect(page.locator(".exercise-card")).toHaveCount(6);
});

test("completion counts unique movements instead of repeated intervals", async ({
  page,
}) => {
  await page.goto("/workouts/foundation-strength/start?minutes=5");
  await expect(page.getByRole("timer")).toBeVisible();
  for (
    let index = 0;
    index < 30 &&
    (await page.getByRole("button", { name: "Skip", exact: true }).count());
    index++
  ) {
    await page.getByRole("button", { name: "Skip", exact: true }).click();
  }
  await expect(
    page.getByRole("heading", { name: "Strong work." }),
  ).toBeVisible();
  await expect(
    page
      .locator(".completion-stats > div")
      .filter({ hasText: "Movements" })
      .locator("dd"),
  ).toHaveText("3");
  await expect(
    page
      .locator(".completion-stats > div")
      .filter({ hasText: "Planned time" })
      .locator("dd"),
  ).toHaveText("5 min");
});

test("member sessions keep their authored name and reveal future sessions progressively", async ({
  page,
  baseURL,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const plan = await seedPlan(page, baseURL!);
  const name = plan.sessions[0].workout.name;
  await page.goto("/");
  await expect(page.locator(".today-hero .lede")).toContainText(name);
  await expect(page.locator(".today-session-card > strong")).toHaveText(name);
  await page.goto("/plan");
  await expect(page.locator("#next-session-heading")).toHaveText(name);
  await page.goto("/plan/calendar");
  await expect(page.locator(".session-list .session-card")).toHaveCount(6);
  await page.screenshot({
    path: "/tmp/axyro-followup-calendar-mobile.png",
    scale: "css",
  });
  console.log(
    "Calendar phone height",
    await page.evaluate(() => document.documentElement.scrollHeight),
  );
  await page.getByRole("button", { name: "Show next 6 sessions" }).click();
  await expect(page.locator(".session-list .session-card")).toHaveCount(12);
  const calendar = await page.locator(".calendar-card").boundingBox();
  const explanation = await page.locator(".plan-explanation").boundingBox();
  expect(calendar!.y).toBeLessThan(explanation!.y);
  await expect(
    page.getByRole("heading", { name: "Why this plan fits you" }),
  ).toBeVisible();
  await expect(
    page.getByText(/Your training days, equipment and priorities shape/),
  ).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/plan/calendar");
  await expect(page.locator(".calendar-card")).toBeVisible();
  await page.screenshot({
    path: "/tmp/axyro-followup-calendar-desktop.png",
    scale: "css",
  });
  await page.goto(`/plan/workouts/${plan.sessions[0].id}/edit`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  await expect(
    page.getByRole("link", { name: "Start workout", exact: true }),
  ).toHaveCSS("background-color", "rgb(255, 107, 36)");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "/tmp/axyro-followup-editor-mobile.png",
    scale: "css",
  });
});

test("onboarding choices use keyboard-operable native selection", async ({
  page,
  baseURL,
}) => {
  await seedPlan(page, baseURL!);
  await page.goto("/plan/setup");
  for (let index = 0; index < 3; index++)
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  const choice = page.getByRole("checkbox", { name: /Reach the net faster/ });
  await choice.focus();
  await page.keyboard.press("Space");
  await expect(choice).toBeChecked();
  await page.screenshot({
    path: "/tmp/axyro-followup-onboarding.png",
    scale: "css",
  });
  await page.keyboard.press("Space");
  await expect(choice).not.toBeChecked();
});

test("settings distinguish guest storage from a signed-in account", async ({
  page,
}) => {
  await page.goto("/settings");
  await expect(page.locator(".page-intro")).toContainText(
    "Your preferences save on this device.",
  );
  const user = {
    id: "a0000000-0000-4000-8000-000000000000",
    email: "settings@example.com",
    displayName: "Settings",
    role: "user",
    providers: ["email"],
    avatarUrl: null,
    isDevelopmentAdmin: false,
  };
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      json: { user, configured: true, developmentAdminEnabled: false },
    }),
  );
  await page.route("**/api/user-data", (route) =>
    route.fulfill({ json: { userId: user.id, data: {}, revision: 0 } }),
  );
  await page.reload();
  await expect(page.locator(".page-intro")).toContainText(
    "Your preferences save to your account and this device.",
  );
});
