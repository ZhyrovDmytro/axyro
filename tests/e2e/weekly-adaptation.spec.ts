import { expect, test, type Page } from "@playwright/test";
import { generateTrainingPlan } from "../../src/domain/training-plan/generate-training-plan";
import { representativeAthleteProfiles } from "../../src/domain/training-plan/evaluation-profiles";
import {
  addDays,
  fromDateKey,
  toDateKey,
} from "../../src/domain/training-plan/date";
import { exercises } from "../../src/content/exercises";
import {
  createWorkoutSessionSnapshot,
  createPlannedSessionSnapshot,
} from "../../src/domain/workout/create-workout-session-snapshot";
import {
  LocalWorkoutActivityRepository,
  workoutActivityStorageKey,
} from "../../src/services/persistence/local-workout-activity-repository";

async function seedHardWeek(page: Page, origin: string) {
  const login = await page.request.post("/api/auth/signin", {
    headers: { Origin: origin },
    data: { email: "admin", password: "admin" },
  });
  expect(login.ok()).toBe(true);
  const today = toDateKey(new Date());
  const plan = generateTrainingPlan(
    {
      ...representativeAthleteProfiles[1],
      sessionDurationMinutes: 20,
      sessionsPerWeek: 3,
      preferredDays: ["monday", "wednesday", "friday"],
    },
    fromDateKey(addDays(today, -7)),
  );
  const data = new Map<string, string>();
  const repository = new LocalWorkoutActivityRepository({
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  });
  repository.syncScheduledSessions(
    plan.generatedAt,
    plan.sessions.map((session) => ({
      sessionId: session.id,
      planId: plan.generatedAt,
      workoutId: session.workout.id,
      scheduledDate: session.scheduledDate,
      plannedSnapshot: createPlannedSessionSnapshot(session, exercises),
    })),
    plan.startDate,
  );
  for (const session of plan.sessions.filter((item) => item.weekNumber === 1)) {
    const completion = repository.recordCompleted({
      sessionId: session.id,
      workoutId: session.workout.id,
      intensity: "standard",
      snapshot: createWorkoutSessionSnapshot({
        workout: session.workout,
        sections: session.sections,
        exercises,
        intensity: "standard",
        progressionWeek: session.weekNumber,
        targetDurationSeconds: session.targetDurationSeconds,
        estimatedDurationSeconds: session.estimatedDurationSeconds,
      }),
      completedAt: new Date(`${session.scheduledDate}T12:00:00Z`),
    });
    repository.saveFeedbackEvent({
      completionId: completion.id,
      perceivedDifficulty: "HARD",
      reasons: ["OVERALL_INTENSITY"],
    });
  }
  await page.goto("/plan");
  await page.evaluate(
    ({ plan, activity, key }) => {
      localStorage.setItem(
        "veyro.owner.development-admin.veyro.training-plan.v1",
        JSON.stringify(plan),
      );
      localStorage.setItem(`veyro.owner.development-admin.${key}`, activity);
    },
    {
      plan,
      activity: data.get(workoutActivityStorageKey)!,
      key: workoutActivityStorageKey,
    },
  );
  return plan;
}

test("a completed access check does not leave a planned workout loading forever", async ({
  page,
}, testInfo) => {
  const plan = await seedHardWeek(
    page,
    new URL(String(testInfo.project.use.baseURL)).origin,
  );
  await page.route("**/api/billing/status", (route) =>
    route.fulfill({ json: { hasPro: false, subscription: null } }),
  );
  await page.route("**/api/billing/products", (route) =>
    route.fulfill({ json: { products: [] } }),
  );
  const session = plan.sessions.find((item) => item.weekNumber === 2)!;
  await page.goto(`/plan/workouts/${session.id}/start`);
  await expect(
    page.getByRole("dialog", { name: "Axyro Pro membership" }),
  ).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "Checking your plan access…" }),
  ).toHaveCount(0);
});

test("reviews and accepts next-week changes before a direct workout start", async ({
  page,
}, testInfo) => {
  const plan = await seedHardWeek(
    page,
    new URL(String(testInfo.project.use.baseURL)).origin,
  );
  const target = plan.sessions.find(
    (session) =>
      session.weekNumber === 2 &&
      session.scheduledDate >= toDateKey(new Date()),
  )!;
  await page.goto(`/plan/workouts/${target.id}/start`);
  const card = page.getByRole("region", { name: "Weekly plan adjustment" });
  await expect(
    card.getByRole("heading", { name: "Your plan can be adjusted" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toHaveCount(0);
  await card.getByText("Review changes", { exact: true }).click();
  await expect(
    card.getByText(/Slightly longer recovery|less time moving/).first(),
  ).toBeVisible();
  await card.getByRole("button", { name: "Adjust my plan" }).click();
  await expect(card).toHaveCount(0);
  await expect(
    page.getByRole("group", { name: "Workout controls" }),
  ).toBeVisible();
  const saved = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem(
        "veyro.owner.development-admin.veyro.training-plan.v1",
      )!,
    ),
  );
  expect(saved.weeklyAdaptationProposals[0].status).toBe("ACCEPTED");
  expect(saved.weeklyAdaptationProposals[0].resolvedAt).toBeTruthy();
  expect(
    saved.sessions.some(
      (session: { weeklyAdaptedSessionSnapshot?: unknown }) =>
        !!session.weeklyAdaptedSessionSnapshot,
    ),
  ).toBe(true);
  const changed = saved.weeklyAdaptationProposals[0].changes[0];
  expect(changed.before.originalSessionSnapshot).toEqual(
    changed.after.originalSessionSnapshot,
  );
});

test("declines once and retains upcoming prescriptions after reload", async ({
  page,
}, testInfo) => {
  await seedHardWeek(
    page,
    new URL(String(testInfo.project.use.baseURL)).origin,
  );
  await page.reload();
  const card = page.getByRole("region", { name: "Weekly plan adjustment" });
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Keep current plan" }).click();
  await expect(card).toHaveCount(0);
  await page.reload();
  await expect(card).toHaveCount(0);
  const saved = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem(
        "veyro.owner.development-admin.veyro.training-plan.v1",
      )!,
    ),
  );
  expect(saved.weeklyAdaptationProposals[0].status).toBe("DECLINED");
  expect(
    saved.sessions.every(
      (session: { weeklyAdaptedSessionSnapshot?: unknown }) =>
        !session.weeklyAdaptedSessionSnapshot,
    ),
  ).toBe(true);
});

test("refreshes a stale tab without overwriting another tab's plan decision or edits", async ({
  page,
  context,
}, testInfo) => {
  await seedHardWeek(
    page,
    new URL(String(testInfo.project.use.baseURL)).origin,
  );
  await page.reload();
  const card = page.getByRole("region", { name: "Weekly plan adjustment" });
  await expect(card).toBeVisible();

  const otherTab = await context.newPage();
  await otherTab.goto("/plan");
  const otherCard = otherTab.getByRole("region", {
    name: "Weekly plan adjustment",
  });
  await expect(otherCard).toBeVisible();
  await otherCard.getByRole("button", { name: "Keep current plan" }).click();
  await expect(otherCard).toHaveCount(0);
  await otherTab.evaluate(() => {
    const key = "veyro.owner.development-admin.veyro.training-plan.v1";
    const saved = JSON.parse(localStorage.getItem(key)!);
    saved.sessions[0].workout.name = "Edited in another tab";
    localStorage.setItem(key, JSON.stringify(saved));
  });

  await page.bringToFront();
  await expect(card).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const saved = JSON.parse(
          localStorage.getItem(
            "veyro.owner.development-admin.veyro.training-plan.v1",
          )!,
        );
        return {
          decision: saved.weeklyAdaptationProposals[0].status,
          title: saved.sessions[0].workout.name,
        };
      }),
    )
    .toEqual({ decision: "DECLINED", title: "Edited in another tab" });
  await otherTab.close();
});
