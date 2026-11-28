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

test("creates, saves and starts a custom workout from the workout library", async ({
  page,
}) => {
  const login = await page.request.post("/api/auth/signin", {
    headers: { Origin: new URL(test.info().project.use.baseURL!).origin },
    data: { email: "admin", password: "admin" },
  });
  expect(login.ok()).toBe(true);
  await page.goto("/workouts");
  await page.getByRole("link", { name: "Add workout" }).click();
  await expect(
    page.getByRole("heading", { name: "Create workout" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save workout" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText(
    "add at least one exercise",
  );
  await page
    .getByRole("textbox", { name: "Workout name" })
    .fill("My court prep");

  const add = page.getByRole("button", { name: "Add exercise", exact: true });
  const picker = page.getByRole("dialog", { name: /Add exercise/ });
  await add.click();
  await expect(picker.locator(".exercise-picker-list button")).toHaveCount(40);
  await picker
    .getByRole("textbox", { name: "Search exercises" })
    .fill("Bodyweight Squat");
  await picker.getByRole("button", { name: /Bodyweight Squat/ }).click();
  await add.click();
  await picker
    .getByRole("textbox", { name: "Search exercises" })
    .fill("Bodyweight Squat");
  await expect(picker.locator(".exercise-picker-list button")).toHaveCount(0);
  await picker
    .getByRole("textbox", { name: "Search exercises" })
    .fill("Dead Bug");
  await picker.getByRole("button", { name: /Dead Bug/ }).click();

  await page.getByRole("button", { name: "Save workout" }).click();
  await expect(page).toHaveURL(/\/workouts\/custom\/custom-/);
  await page.goto("/workouts");
  await page.getByRole("link", { name: /My court prep/ }).click();
  await expect(page.getByRole("textbox", { name: "Workout name" })).toHaveValue(
    "My court prep",
  );
  await expect(page.locator(".editor-exercise-list > li")).toHaveCount(2);
  await page.getByRole("link", { name: "Start workout · Standard" }).click();
  await expect(
    page.getByRole("heading", { name: "Bodyweight Squat" }),
  ).toBeVisible();
  await expect(page.getByRole("timer")).toBeVisible();
  await page.getByRole("button", { name: "Exit workout" }).click();
  await page.getByRole("button", { name: "Save & exit" }).click();
  const resume = page.getByRole("link", { name: "Resume workout" });
  await expect(resume).toHaveAttribute(
    "href",
    /\/workouts\/custom\/custom-.*\/start\?intensity=standard/,
  );
  await resume.click();
  await expect(
    page.getByRole("group", { name: "Workout controls" }).getByRole("button", {
      name: "Resume",
      exact: true,
    }),
  ).toBeVisible();
});
