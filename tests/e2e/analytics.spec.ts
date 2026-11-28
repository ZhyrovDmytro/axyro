import { expect, test } from "@playwright/test";

test("reports workout starts only while this browser has opted in", async ({
  page,
  baseURL,
}) => {
  test.skip(process.env.NEXT_PUBLIC_AXYRO_ANALYTICS !== "true");

  const signIn = await page.request.post("/api/auth/signin", {
    headers: { Origin: new URL(String(baseURL)).origin },
    data: { email: "admin", password: "admin" },
  });
  expect(signIn.ok()).toBe(true);

  const events: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/analytics") {
      events.push(request.postData() ?? "");
    }
  });

  async function startWorkout() {
    await page.goto("/workouts/foundation-strength/start?intensity=light");
    await expect(page.getByRole("timer")).toBeVisible();
  }

  await startWorkout();
  expect(events).toEqual([]);
  await page.goto("/settings#analytics");
  await page.evaluate(() => {
    for (const key of Object.keys(localStorage)) {
      if (key.endsWith("veyro.active-workout.v1")) localStorage.removeItem(key);
    }
  });
  await page.getByRole("button", { name: "Allow analytics" }).click();
  await expect(page.getByText("Analytics is on.")).toBeVisible();

  const accepted = page.waitForResponse("**/api/analytics");
  await startWorkout();
  const response = await accepted;
  expect(response.status()).toBe(204);
  expect(await response.request().headerValue("cookie")).toBeNull();
  expect(await response.request().headerValue("referer")).toBeNull();

  await page.goto("/workouts/lower-body-control/start?intensity=light");
  await expect(
    page.getByRole("heading", {
      name: "You already have a workout in progress.",
    }),
  ).toBeVisible();
  expect(events).toEqual(["workout_started"]);

  await page.getByRole("link", { name: "Resume workout" }).click();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  const finished = page.waitForResponse("**/api/analytics");
  const completion = page.getByRole("heading", { name: "Strong work." });
  for (
    let index = 0;
    index < 60 && !(await completion.isVisible());
    index += 1
  ) {
    await page.getByRole("button", { name: /Skip/ }).click();
  }
  await expect(completion).toBeVisible();
  expect((await finished).status()).toBe(204);
  expect(events).toEqual(["workout_started", "workout_completed"]);

  await page.goto("/settings#analytics");
  await expect(page.getByText("Analytics is on.")).toBeVisible();
  await page.getByRole("button", { name: "Decline analytics" }).click();
  await expect(page.getByText("Analytics is off.")).toBeVisible();
  await page.goto("/workouts/lower-body-control/start?intensity=light");
  await expect(page.getByRole("timer")).toBeVisible();
  expect(events).toEqual(["workout_started", "workout_completed"]);
});
