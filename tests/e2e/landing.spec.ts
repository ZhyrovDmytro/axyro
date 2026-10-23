import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const width of [320, 1280]) {
  test(`landing workflow and closing actions fit at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const workflow = page.getByRole("region", {
      name: "A plan with your name on it.",
    });
    await expect(workflow.getByRole("listitem")).toHaveCount(3);
    const closing = page.getByRole("region", {
      name: "Your next match. Better prepared.",
    });
    await expect(
      closing.getByRole("link", { name: "Create my plan", exact: true }),
    ).toHaveAttribute("href", "/plan/setup");
    await expect(
      closing.getByRole("link", { name: "Try a free workout first" }),
    ).toHaveAttribute("href", "/workouts/foundation-strength");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await closing.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        closing
          .locator("img")
          .evaluate(
            (image: HTMLImageElement) =>
              image.complete && image.naturalWidth > 0,
          ),
      )
      .toBe(true);
    await closing.screenshot({
      path: `/tmp/axyro-closing-${width}.png`,
      scale: "css",
    });
    if (width === 1280)
      await workflow.screenshot({ path: "/tmp/axyro-workflow-1280.png" });
    expect(
      (
        await new AxeBuilder({ page })
          .include("[aria-labelledby='personal-heading']")
          .include("[aria-labelledby='start-training-heading']")
          .analyze()
      ).violations,
    ).toEqual([]);
    await closing
      .getByRole("link", { name: "Try a free workout first" })
      .click();
    await expect(page).toHaveURL(/\/workouts\/foundation-strength$/);
  });
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      json: { user: null, configured: true, developmentAdminEnabled: false },
    }),
  );
  await page.route("**/api/billing/status", (route) =>
    route.fulfill({ json: { hasPro: false, subscription: null } }),
  );
});

test("guest landing offers a working free workout and accessible preview", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Train anywhere. Win on court.",
  );
  await expect(
    page.getByRole("navigation", { name: "Primary navigation" }),
  ).toBeVisible();
  for (const link of await page
    .getByRole("link", { name: "Create my plan", exact: true })
    .all()) {
    await expect(link).toHaveAttribute("href", "/plan/setup");
  }
  await expect(
    page.getByRole("img", {
      name: "Standing Dumbbell Wood Chop movement demonstration",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Pause preview" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Pause preview" }).click();
  await expect(
    page.getByRole("button", { name: "Play movement" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Play movement" }).click();
  await expect(
    page.getByRole("button", { name: "Pause preview" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pause preview" }).click();
  await expect(
    page.getByRole("heading", { name: "Can I try Axyro without an account?" }),
  ).toBeVisible();
  await expect(
    page.getByText("Yes. One complete starter workout", { exact: false }),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page
    .getByRole("link", { name: "Try a free workout first" })
    .first()
    .click();
  await expect(page).toHaveURL(/\/workouts\/foundation-strength$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("signed-in members retain the existing home", async ({ page }) => {
  const user = {
    id: "a0000000-0000-4000-8000-000000000000",
    email: "test@example.com",
    displayName: "Test",
    role: "user",
    providers: ["email"],
    avatarUrl: null,
  };
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({
      json: { user, configured: true, developmentAdminEnabled: false },
    }),
  );
  await page.route("**/api/user-data", (route) =>
    route.fulfill({ json: { userId: user.id, data: {}, revision: 0 } }),
  );
  await page.goto("/");
  await expect(
    page.getByRole("navigation", { name: "Primary navigation" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Your daily 10. Make it count." }),
  ).toBeVisible();
});

test("scroll chapters update the illustrative player with reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Play movement" }),
  ).toBeVisible();
  const rest = page.getByRole("heading", { name: "Rest is part of the work." });
  await rest.scrollIntoViewIfNeeded();
  await expect(page.getByText("Take a breath", { exact: true })).toBeVisible();
  await expect(page.getByText("Next movement", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    ),
  ).toBe("auto");
});

test("plan example adjusts training around a changed match", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Move match to Wednesday" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Move match to Wednesday" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: /Friday/ }),
  ).toContainText("Training moves to Friday");
  const week = page.getByLabel("Example adjusted training week");
  await expect(week.getByText("Match", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Reset example" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Reset example" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: /Friday/ }),
  ).toContainText("Friday stays clear");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("padel landing previews the library and customizable planned workouts", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Know the movement/ }),
  ).toBeVisible();
  const library = page.locator("#exercise-library");
  await expect(library.locator("article")).toHaveCount(6);
  await expect(library.locator('article[aria-hidden="true"]')).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Add side plank from library" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Add side plank from library" })
    .click();
  await expect(
    page.getByText("Side plank added to this example."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Remove side plank from example" })
    .click();
  await expect(
    page.getByText("Try adding a movement to this example."),
  ).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

test("hero rotates exercises and pause holds the current poster", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  const demo = page.locator('[class*="heroImage"]');
  await expect(
    page.getByRole("button", { name: "Pause preview" }),
  ).toBeVisible();
  await expect(demo.getByRole("img")).toHaveAttribute(
    "alt",
    "Standing Dumbbell Wood Chop movement demonstration",
  );
  await page.clock.fastForward(3500);
  await expect(demo.getByRole("img")).toHaveAttribute("src", /lateral-stick/);
  await page.getByRole("button", { name: "Pause preview" }).click();
  await expect(demo.getByRole("img")).toHaveAttribute(
    "src",
    /lateral-stick-preview.png/,
  );
  await page.clock.fastForward(7000);
  await expect(demo.getByRole("img")).toHaveAttribute(
    "src",
    /lateral-stick-preview.png/,
  );
  await page.getByRole("button", { name: "Play movement" }).click();
  await page.clock.fastForward(3500);
  await expect(demo.getByRole("img")).toHaveAttribute("src", /bird-dog/);
  await page.clock.fastForward(3500);
  await expect(demo.getByRole("img")).toHaveAttribute(
    "src",
    /dynamic-court-march/,
  );
  await page.clock.fastForward(3500);
  await expect(demo.getByRole("img")).toHaveAttribute(
    "src",
    /side-plank-rotation/,
  );
  await page.clock.fastForward(3500);
  await expect(demo.getByRole("img")).toHaveAttribute(
    "src",
    /standing-dumbbell-wood-chop/,
  );
});

test("hero does not auto-rotate with reduced motion or while offscreen", async ({
  page,
}) => {
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const demo = page.locator('[class*="heroImage"]');
  await expect(
    page.getByRole("button", { name: "Play movement" }),
  ).toBeVisible();
  await page.clock.fastForward(7000);
  await expect(demo.getByRole("img")).toHaveAttribute(
    "src",
    /wood-chop-preview.png/,
  );
  await page.getByRole("button", { name: "Play movement" }).click();
  await page.clock.fastForward(7000);
  await expect(demo.getByRole("img")).toHaveAttribute(
    "src",
    /standing-dumbbell-wood-chop/,
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.locator("footer").last().scrollIntoViewIfNeeded();
  await expect(demo.getByRole("img")).toHaveAttribute(
    "src",
    /wood-chop-preview.png/,
  );
  await page.clock.fastForward(7000);
  await expect(demo.getByRole("img")).toHaveAttribute(
    "src",
    /wood-chop-preview.png/,
  );
});

test("Fancy preview selection is keyboard accessible and holds the selected poster", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const picker = page.getByRole("group", { name: "Preview exercises" });
  const selection = picker.getByRole("button", {
    name: "Preview Bird Dog",
    exact: true,
  });
  await selection.focus();
  await page.keyboard.press("Enter");
  await expect(selection).toHaveAttribute("aria-pressed", "true");
  await expect(picker.locator('[aria-pressed="true"]')).toHaveCount(1);
  await expect(
    page.locator('[class*="heroImage"]').getByRole("img"),
  ).toHaveAttribute("src", /bird-dog-preview.png/);
  await expect(
    page.getByRole("button", { name: "Play movement", exact: true }),
  ).toBeVisible();
  const plan = page
    .getByRole("link", { name: "Create my plan", exact: true })
    .first();
  await plan.focus();
  expect(await plan.evaluate((el) => getComputedStyle(el).transform)).toBe(
    "none",
  );
});

test("hero supporting words rotate without shifting layout and respect reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const quality = page.locator('[class*="qualityWords"]');
  const words = quality.locator(":scope > span");
  await expect(words).toHaveText([
    "power.",
    "control.",
    "confidence.",
    "endurance.",
    "speed.",
    "stability.",
  ]);
  await expect(words.first()).not.toHaveCSS("animation-name", "none");
  const initialWidth = await quality.evaluate(
    (element) => element.getBoundingClientRect().width,
  );
  for (let index = 0; index < 6; index += 1) {
    await words.evaluateAll((elements, time) => {
      elements.forEach((element) =>
        element.getAnimations().forEach((animation) => {
          animation.pause();
          animation.currentTime = time;
        }),
      );
    }, index * 1400);
    const visibleWords = await quality.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return Array.from(element.children)
        .filter((word) => {
          const rect = word.getBoundingClientRect();
          return rect.top >= bounds.top - 1 && rect.bottom <= bounds.bottom + 1;
        })
        .map((word) => word.textContent);
    });
    expect(visibleWords).toEqual([await words.nth(index).textContent()]);
    expect(
      await quality.evaluate(
        (element) => element.getBoundingClientRect().width,
      ),
    ).toBe(initialWidth);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(words.first()).toHaveCSS("animation-name", "none");
  await expect(words.first()).toBeVisible();
  await expect(words.nth(1)).toBeHidden();
  await expect(
    page.getByText(
      "Build your power, control, confidence, endurance, speed and stability.",
      { exact: true },
    ),
  ).toHaveClass("sr-only");
});
