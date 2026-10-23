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
