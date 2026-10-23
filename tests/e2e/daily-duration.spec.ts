import { test, expect } from "@playwright/test";
import { installDeterministicPlanner } from "./helpers/planner";

test("daily duration controls and responsive screens", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Train anywhere\.\s*Win on court\./ }),
  ).toBeVisible();
  await page.screenshot({ path: "/tmp/axyro-home-mobile.png", fullPage: true });
  await page.goto("/workouts");
  await page.screenshot({
    path: "/tmp/axyro-workouts-mobile.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: /Foundation Strength/ }).click();
  await expect(
    page.getByRole("radio", { name: "10 min Daily default" }),
  ).toBeChecked();
  await page.getByRole("radio", { name: "5 min Short on time" }).check();
  await expect(page.locator(".selected-workout-duration strong")).toHaveText(
    "5 min",
  );
  await page.getByRole("button", { name: /Challenging/ }).click();
  await expect(page.locator(".selected-workout-duration strong")).toHaveText(
    "5 min",
  );
  await expect(
    page.getByRole("link", { name: /Start workout/ }),
  ).toHaveAttribute("href", /minutes=5/);
  await page.screenshot({
    path: "/tmp/axyro-workout-mobile.png",
    fullPage: true,
  });
  await page.goto("/plan/setup");
  await page.screenshot({
    path: "/tmp/axyro-setup-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.screenshot({
    path: "/tmp/axyro-home-desktop.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("creates a five-minute plan and exposes duration refinement", async ({
  page,
}) => {
  const login = await page.request.post("/api/auth/signin", {
    headers: {
      Origin: new URL(
        process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3100",
      ).origin,
    },
    data: { email: "admin", password: "admin" },
  });
  expect(login.ok()).toBe(true);
  await installDeterministicPlanner(page);
  await page.goto("/plan/setup");
  for (let step = 0; step < 15; step++) {
    if (
      await page.getByRole("radio", { name: "5 min Short on time" }).isVisible()
    )
      break;
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  }
  await expect(
    page.getByRole("radio", { name: "10 min Daily default" }),
  ).toBeChecked();
  await page.getByRole("radio", { name: "5 min Short on time" }).check();
  await page.screenshot({ path: "/tmp/axyro-schedule-mobile.png" });
  for (let step = 0; step < 5; step++) {
    if (await page.getByRole("button", { name: "Create My Plan" }).isVisible())
      break;
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  }
  await page.getByRole("button", { name: "Create My Plan" }).click();
  await expect(
    page.getByRole("heading", { name: "What’s next?" }),
  ).toBeVisible();
  await expect(page.getByText("5 minutes, made for your day.")).toBeVisible();
  await page.screenshot({ path: "/tmp/axyro-plan-mobile.png" });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: "/tmp/axyro-plan-desktop.png" });
  await page.getByRole("link", { name: "Change session length" }).click();
  await expect(
    page.getByRole("radio", { name: "5 min Short on time" }),
  ).toBeChecked();
  await page.getByRole("radio", { name: "20 min Go a little longer" }).check();
  await expect(
    page.getByRole("radio", { name: "20 min Go a little longer" }),
  ).toBeChecked();
});
