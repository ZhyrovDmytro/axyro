import { expect, test } from "@playwright/test";
import { exercises } from "../../src/content/exercises";
import { generateTrainingPlan } from "../../src/domain/training-plan/generate-training-plan";

test("keeps exercises unique while allowing additional sets", async ({
  page,
}) => {
  const plan = generateTrainingPlan({
    sport: "padel",
    experience: "beginner",
    sessionsPerWeek: 3,
    sessionDurationMinutes: 10,
    preferredDays: ["monday", "wednesday", "friday"],
    equipment: ["bodyweight"],
    goals: ["strength"],
    developmentAreas: [],
    padelLimitations: [],
    painAreas: [],
    matches: [],
  });
  const login = await page.request.post("/api/auth/signin", {
    headers: { Origin: new URL(test.info().project.use.baseURL!).origin },
    data: { email: "admin", password: "admin" },
  });
  expect(login.ok()).toBe(true);
  await page.goto("/plan");
  await page.evaluate(
    (seed) =>
      localStorage.setItem(
        "veyro.owner.development-admin.veyro.training-plan.v1",
        JSON.stringify(seed),
      ),
    plan,
  );
  await page.goto(`/plan/workouts/${plan.sessions[0].id}/edit`);
  await page.getByRole("button", { name: "Edit workout", exact: true }).click();
  const existing = exercises.find(
    (exercise) => exercise.id === plan.sessions[0].workout.items[0].exerciseId,
  )!;
  await page.getByRole("button", { name: "Add exercise", exact: true }).click();
  await page
    .getByPlaceholder("Search movement or body area")
    .fill(existing.name);
  await expect(page.locator(".exercise-picker-list button")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Close exercise library", exact: true })
    .click();
  const first = page.locator(".editor-exercise-list > li").first();
  await first.getByLabel("Sets", { exact: true }).fill("3");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Edit workout", exact: true }).click();
  await expect(
    page
      .locator(".editor-exercise-list > li")
      .first()
      .getByLabel("Sets", { exact: true }),
  ).toHaveValue("3");
  const ids = await page.evaluate(() => {
    const saved = JSON.parse(
      localStorage.getItem(
        "veyro.owner.development-admin.veyro.training-plan.v1",
      )!,
    );
    return saved.sessions[0].workout.items.map(
      (item: { exerciseId: string }) => item.exerciseId,
    );
  });
  expect(ids.length).toBe(new Set(ids).size);
});

test("adds and replaces movements from the end of the pickers and starts the edited workout", async ({
  page,
}) => {
  const plan = generateTrainingPlan({
    sport: "other",
    experience: "beginner",
    sessionsPerWeek: 3,
    sessionDurationMinutes: 10,
    preferredDays: ["monday", "wednesday", "friday"],
    equipment: ["bodyweight", "two-dumbbells"],
    goals: ["strength"],
    developmentAreas: [],
    padelLimitations: [],
    painAreas: [],
    matches: [],
  });
  const login = await page.request.post("/api/auth/signin", {
    headers: { Origin: new URL(test.info().project.use.baseURL!).origin },
    data: { email: "admin", password: "admin" },
  });
  expect(login.ok()).toBe(true);
  await page.goto("/plan");
  await page.evaluate(
    (seed) =>
      localStorage.setItem(
        "veyro.owner.development-admin.veyro.training-plan.v1",
        JSON.stringify(seed),
      ),
    plan,
  );
  await page.goto(`/plan/workouts/${plan.sessions[0].id}/edit`);
  await page.getByRole("button", { name: "Edit workout", exact: true }).click();
  const add = page.getByRole("button", { name: "Add exercise", exact: true });
  await add.click();
  const dialog = page.getByRole("dialog", { name: /Add exercise/ });
  await page.keyboard.press("Escape");
  await expect(add).toBeFocused();
  await add.click();
  const last = dialog.locator(".exercise-picker-list button").last();
  const name = await last.locator("strong").innerText();
  await dialog.getByRole("textbox", { name: "Search exercises" }).fill(name);
  await dialog.getByRole("button", { name: new RegExp(name, "i") }).click();
  const originalName = exercises.find(
    ({ id }) => id === plan.sessions[0].workout.items[0].exerciseId,
  )!.name;
  await page
    .getByRole("button", { name: `Replace ${originalName}`, exact: true })
    .click();
  const options = page.getByRole("dialog").locator(".replacement-list button");
  const replacement = await options.last().locator("strong").innerText();
  await options.last().click();
  await page
    .getByRole("button", { name: "Use this session", exact: true })
    .click();
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page.reload();
  await expect(
    page.locator(".workout-plan").getByText(name, { exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".workout-plan").getByText(replacement, { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: /^Start workout/ })
    .first()
    .click();
  await expect(page.getByRole("timer")).toBeVisible();
  const movement = page.getByRole("heading", {
    name: replacement,
    exact: true,
  });
  for (let step = 0; step < 12 && !(await movement.isVisible()); step++) {
    await page.getByRole("button", { name: "Skip", exact: true }).click();
  }
  await expect(movement).toBeVisible();
  await expect(page.locator(".player-media .exercise-media")).toBeVisible();
});
