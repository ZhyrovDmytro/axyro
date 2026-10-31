import { expect, test } from "@playwright/test";

test("serves public pages and disables development administrator access", async ({
  page,
  request,
}) => {
  for (const path of [
    "/",
    "/workouts",
    "/exercises",
    "/settings",
    "/privacy",
    "/terms",
    "/upgrade",
  ]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.locator("h1").first()).toBeVisible();
  }

  const response = await request.get("/api/auth/session");
  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({
    user: null,
    developmentAdminEnabled: false,
  });
  const billing = await request.get("/api/billing/status");
  expect(billing.status()).toBe(200);
  expect(await billing.json()).toMatchObject({ hasPro: false });
});

test("guest can start, pause, resume and finish a free workout", async ({
  page,
}) => {
  await page.goto("/workouts/foundation-strength");
  await page.getByRole("link", { name: /Start workout/ }).click();
  await expect(page.getByRole("timer")).toBeVisible();
  const audio = page.getByRole("button", {
    name: "Audio guidance",
    exact: true,
  });
  const audioBefore = await audio.getAttribute("aria-pressed");
  await audio.click();
  await expect(audio).toHaveAttribute(
    "aria-pressed",
    String(audioBefore !== "true"),
  );

  const controls = page.getByRole("group", { name: "Workout controls" });
  await controls.getByRole("button", { name: "Pause", exact: true }).click();
  const pausedTime = await page.getByRole("timer").getAttribute("aria-label");
  await page.waitForTimeout(1100);
  await expect(page.getByRole("timer")).toHaveAttribute(
    "aria-label",
    pausedTime!,
  );
  await controls.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(
    controls.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();

  // Skip intervals to check completion without waiting for the full session budget.
  for (let step = 0; step < 100; step += 1) {
    if (await page.getByRole("heading", { name: "Strong work." }).isVisible())
      break;
    await controls.getByRole("button", { name: "Skip", exact: true }).click();
  }
  await expect(
    page.getByRole("heading", { name: "Strong work." }),
  ).toBeVisible();
});
