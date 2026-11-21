import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { generateTrainingPlan } from "../../src/domain/training-plan/generate-training-plan";
import { representativeAthleteProfiles } from "../../src/domain/training-plan/evaluation-profiles";

async function openAdjustment(page: Page) {
  const login = await page.request.post("/api/auth/signin", {
    headers: { Origin: new URL(test.info().project.use.baseURL!).origin },
    data: { email: "admin", password: "admin" },
  });
  expect(login.ok()).toBe(true);
  const plan = generateTrainingPlan(
    representativeAthleteProfiles[1],
    new Date(),
  );
  await page.goto("/plan");
  await page.evaluate(
    (seed) =>
      localStorage.setItem(
        "veyro.owner.development-admin.veyro.training-plan.v1",
        JSON.stringify(seed),
      ),
    plan,
  );
  await page.goto("/plan/refine");
  return plan;
}

test("plan adjustment steps retain answers and combine changes into one review", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openAdjustment(page);
  await expect(
    page.getByRole("heading", { name: "Which days can you train now?" }),
  ).toBeVisible();
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`adjust-plan-${width}.png`),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 390, height: 900 });
  const continueButton = page.getByRole("button", {
    name: "Continue",
    exact: true,
  });
  await expect(page.getByRole("checkbox", { name: "Tuesday" })).toBeChecked();
  await page.getByRole("checkbox", { name: "Thursday" }).check();
  await page.getByRole("radio", { name: "Ongoing", exact: true }).check();
  await continueButton.press("Enter");
  await expect(
    page.getByRole("heading", { name: "How much time can you set aside?" }),
  ).toBeFocused();
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 760 });
    const duration = page
      .getByRole("radio", { name: "10 min", exact: true })
      .locator("..");
    const box = await duration.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeLessThanOrEqual(56);
    await expect(continueButton).toBeInViewport();
    await page.screenshot({
      path: testInfo.outputPath(`adjust-duration-${width}.png`),
    });
  }
  await page.setViewportSize({ width: 390, height: 900 });
  await page.getByRole("radio", { name: "5 min", exact: true }).check();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "Thursday" })).toBeChecked();
  await expect(
    page.getByRole("radio", { name: "Ongoing", exact: true }),
  ).toBeChecked();
  await continueButton.click();
  await expect(
    page.getByRole("radio", { name: "5 min", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("radio", { name: "For the next 7 days" }),
  ).toBeChecked();
  await page.reload();
  await expect(
    page.getByRole("radio", { name: "5 min", exact: true }),
  ).toBeChecked();
  await continueButton.click();
  const equipment = page.getByRole("group", { name: "Available equipment" });
  await expect(equipment.getByRole("radio")).toHaveCount(2);
  await expect(
    equipment.getByRole("radio", { name: "With dumbbells" }),
  ).toBeChecked();
  await equipment.getByRole("radio", { name: "Without dumbbells" }).check();
  await expect(
    equipment.getByRole("radio", { name: "With dumbbells" }),
  ).not.toBeChecked();
  await continueButton.click();
  await expect(page.getByRole("button", { name: "Discomfort" })).toHaveCount(0);
  const keep = page.getByRole("radio", { name: "Keep workouts as planned" });
  const replace = page.getByRole("radio", { name: "Replace exercises" });
  await expect(keep).toBeChecked();
  await page.getByRole("radio", { name: "Make workouts lighter" }).check();
  await expect(continueButton).toBeEnabled();
  const harder = page.getByRole("radio", { name: "Make workouts harder" });
  await harder.check();
  await expect(harder).toBeChecked();
  await expect(continueButton).toBeEnabled();
  await replace.check();
  await expect(continueButton).toBeDisabled();
  const exercises = page.getByRole("group", { name: "Exercises to replace" });
  const firstExercise = exercises.getByRole("checkbox").nth(0);
  const secondExercise = exercises.getByRole("checkbox").nth(1);
  await firstExercise.check();
  await secondExercise.check();
  await expect(firstExercise).toBeChecked();
  await expect(secondExercise).toBeChecked();
  const choices = exercises.getByRole("checkbox");
  for (let index = 2; index < 5; index++) await choices.nth(index).check();
  await expect(exercises.getByRole("status")).toHaveText("5 of 5 selected");
  await expect(choices.nth(5)).toBeDisabled();
  await choices.nth(4).uncheck();
  await expect(choices.nth(5)).toBeEnabled();
  await choices.nth(5).check();
  await page.reload();
  await expect(replace).toBeChecked();
  await expect(exercises.getByRole("status")).toHaveText("5 of 5 selected");
  await expect(choices.nth(4)).toBeDisabled();
  await expect(firstExercise).toBeChecked();
  await expect(secondExercise).toBeChecked();
  await continueButton.click();
  await expect(
    page.getByRole("heading", { name: "Which areas should workouts avoid?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(secondExercise).toBeChecked();
  await page.setViewportSize({ width: 320, height: 760 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    (await new AxeBuilder({ page }).include("main").analyze()).violations,
  ).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath("adjust-difficulty-320.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 900 });
  await keep.check();
  await continueButton.click();
  await continueButton.click();
  await page
    .getByRole("button", { name: "Review changes", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Review changes" }),
  ).toBeFocused();
  await expect(
    page.getByText("10 min → 5 min", { exact: false }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit session length" }).click();
  await expect(
    page.getByRole("radio", { name: "5 min", exact: true }),
  ).toBeChecked();
  await page
    .getByRole("button", { name: "Review changes", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Edit training days" }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("adjust-review-390.png"),
    fullPage: true,
  });
  expect(
    (await new AxeBuilder({ page }).include("main").analyze()).violations,
  ).toEqual([]);
  await page
    .getByRole("button", { name: "Apply to upcoming workouts" })
    .click();
  await expect(page).toHaveURL(/\/plan\?adjusted=/);
  const saved = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem(
        "veyro.owner.development-admin.veyro.training-plan.v1",
      )!,
    ),
  );
  expect(saved.profile.preferredDays).toContain("thursday");
  expect(saved.profile.sessionDurationMinutes).toBe(10);
  expect(saved.adjustmentWindows).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        kind: "duration",
        profile: { sessionDurationMinutes: 5 },
      }),
      expect.objectContaining({
        kind: "equipment",
        profile: { equipment: ["bodyweight"] },
      }),
    ]),
  );
  expect(errors).toEqual([]);
});

test("removes incompatible workouts only after reviewing and applying", async ({
  page,
}) => {
  const plan = await openAdjustment(page);
  const next = page.getByRole("button", { name: "Continue", exact: true });
  for (let step = 0; step < 4; step++) await next.click();
  for (const area of [
    "Shoulder",
    "Neck or upper back",
    "Lower back",
    "Hip or groin",
  ]) {
    await page.getByRole("checkbox", { name: area, exact: true }).check();
  }
  await next.click();
  const review = page.getByRole("button", {
    name: "Review changes",
    exact: true,
  });
  await review.click();

  const conflicts = page.getByRole("region", {
    name: /dates? needs? your attention/,
  });
  await expect(conflicts.getByRole("heading")).toBeFocused();
  await expect(
    page.getByRole("heading", {
      name: "What should upcoming workouts prioritize?",
    }),
  ).toBeVisible();
  const removals = conflicts.getByRole("checkbox", { name: /^Remove workout/ });
  await expect(removals.first()).toBeVisible();
  await expect(review).toBeDisabled();
  await removals.first().check();
  await page
    .getByRole("checkbox", { name: "Core and lower back", exact: true })
    .check();
  await expect(conflicts).toHaveCount(0);
  await review.click();
  await expect(removals.first()).not.toBeChecked();
  const count = await removals.count();
  for (let index = 0; index < count; index++) await removals.nth(index).check();
  await review.click();

  await expect(
    page.getByRole("heading", { name: "Review changes" }),
  ).toBeFocused();
  await expect(
    page
      .getByRole("list", { name: "Affected workouts" })
      .getByText(/^Remove ·/),
  ).toHaveCount(count);
  const readPlan = () =>
    page.evaluate(() =>
      JSON.parse(
        localStorage.getItem(
          "veyro.owner.development-admin.veyro.training-plan.v1",
        )!,
      ),
    );
  expect((await readPlan()).sessions).toHaveLength(plan.sessions.length);
  await page
    .getByRole("button", { name: "Apply to upcoming workouts" })
    .click();
  await expect(page).toHaveURL(/\/plan\?adjusted=/);
  expect((await readPlan()).sessions).toHaveLength(
    plan.sessions.length - count,
  );
  await page.reload();
  const saved = (await readPlan()) as typeof plan;
  expect(saved.sessions).toHaveLength(plan.sessions.length - count);
  const removedIds = plan.sessions
    .filter(({ id }) => !saved.sessions.some((session) => session.id === id))
    .map(({ id }) => id);
  const canceledIds = await page.evaluate(() => {
    const { activities } = JSON.parse(
      localStorage.getItem(
        "veyro.owner.development-admin.veyro.workout-activity.v1",
      )!,
    ) as { activities: { sessionId: string; status: string }[] };
    return activities
      .filter(({ status }) => status === "cancelled")
      .map(({ sessionId }) => sessionId);
  });
  expect(canceledIds).toEqual(expect.arrayContaining(removedIds));
});
