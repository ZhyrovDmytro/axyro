import { expect, test } from "@playwright/test";
import { installDeterministicPlanner } from "./helpers/planner";

test.beforeEach(async ({ page }, testInfo) => {
  const guestScenarios = new Set([
    "loads the application shell",
    "keeps mobile navigation to one safe five-item row",
    "browses a workout and previews its plan",
  ]);
  if (!guestScenarios.has(testInfo.title)) {
    // Authenticate against the real development endpoint; never forge entitlement state.
    const response = await page.request.post("/api/auth/signin", {
      headers: { Origin: new URL(String(testInfo.project.use.baseURL)).origin },
      data: { email: "admin", password: "admin" },
    });
    expect(
      response.ok(),
      "Smoke regressions require real development administrator login",
    ).toBe(true);
    const session = await page.request.get("/api/auth/session");
    expect((await session.json()).user?.role).toBe("admin");
    const billing = await page.request.get("/api/billing/status");
    expect((await billing.json()).hasPro).toBe(true);
  }
  await installDeterministicPlanner(page);
});

test("loads the application shell", async ({ page }) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      name: /Train anywhere\.\s*Win on court\./,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "A plan with your name on it." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: /Your workout\.\s*With the thinking taken out\./,
    }),
  ).toBeVisible();
});

test("keeps mobile navigation to one safe five-item row", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/workouts");

  const primaryNavigation = page.getByRole("navigation", {
    name: "Primary navigation",
  });
  await expect(primaryNavigation.getByRole("link")).toHaveCount(5);
  for (const label of ["Home", "Plan", "Workouts", "Library", "Activity"]) {
    await expect(
      primaryNavigation.getByRole("link", { name: label, exact: true }),
    ).toBeVisible();
  }

  const linkBoxes = await primaryNavigation
    .getByRole("link")
    .evaluateAll((links) =>
      links.map((link) => link.getBoundingClientRect().top),
    );
  expect(new Set(linkBoxes.map(Math.round)).size).toBe(1);

  await expect(
    page
      .getByRole("banner")
      .getByRole("link", { name: "Sign in", exact: true }),
  ).toBeVisible();
});

test("browses a workout and previews its plan", async ({ page }) => {
  await page.goto("/workouts");
  await page.getByRole("link", { name: /Foundation Strength/ }).click();

  await expect(
    page.getByRole("heading", { name: "Foundation Strength" }),
  ).toBeVisible();
  await expect(
    page.getByText("Exercise overview", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Light/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Standard/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Challenging/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Start workout/ })).toBeVisible();
});

test("builds and customizes a 60-day training plan", async ({ page }) => {
  test.slow();
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  await page.goto("/plan");
  await expect(
    page.getByRole("link", { name: "Try a quick workout" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Create my plan" }).click();
  await expect(page.getByRole("link", { name: /quick workout/i })).toHaveCount(
    0,
  );

  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page
    .getByRole("checkbox", { name: /Shoulders and upper back/ })
    .check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("checkbox", { name: /Reach the net faster/ }).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await page
    .getByRole("checkbox", { name: /Rotate better on bandejas and víboras/ })
    .check();
  for (let step = 0; step < 5; step += 1) {
    await page.getByRole("button", { name: "Continue" }).click();
  }

  await expect(
    page.getByRole("heading", {
      name: "Your next 60 days, shaped around what matters to you.",
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Create My Plan" })
    .click({ force: true });

  await expect(page.getByRole("heading", { name: "What’s next?" })).toBeVisible(
    { timeout: 60_000 },
  );
  await expect(
    page.locator(".plan-next-session").getByText("Your selected focus"),
  ).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "This week" })).toBeVisible();
  await expect(page.getByText(/sessions complete/)).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Refine my plan" }),
  ).toBeVisible();
  await page.getByRole("link", { name: /View full calendar/ }).click();
  await expect(page.getByText(/^\d+ planned$/)).toBeVisible();
  await expect(page.getByText("Your selected focus")).toHaveCount(0);
  await expect(
    page.getByText(/Built for your .*minute preference/),
  ).toHaveCount(0);
  const progressedSession = page.getByText("Progressed this week").first();
  while (!(await progressedSession.isVisible())) {
    const showMore = page.getByRole("button", { name: /^Show next/ });
    if (!(await showMore.isVisible())) break;
    await showMore.click();
  }
  await expect(progressedSession).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Your training arc" }),
  ).toBeVisible();
  await expect(page.getByText("Foundation", { exact: true })).toBeVisible();
  await page.locator(".calendar-day:not(:disabled)").first().click();
  await expect(page.getByRole("button", { name: "Add game" })).toBeVisible();
  await page.getByRole("button", { name: "Add game" }).click();
  await expect(page.getByRole("dialog", { name: /Add game/i })).toBeVisible();
  await expect(page.getByLabel("Game name")).toHaveValue("Padel match");
  await page.getByRole("button", { name: "Save game" }).click();
  await expect(
    page
      .getByRole("region", { name: /Selected day:/ })
      .getByText("Padel match", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Rebalance plan/ }).click();
  expect(
    consoleErrors.some(
      (message) =>
        message.includes("Cannot update a component") &&
        message.includes("while rendering a different component"),
    ),
  ).toBe(false);
  await page.getByRole("button", { name: "Edit Padel match" }).click();
  const editGameDialog = page.getByRole("dialog", { name: /Edit game/i });
  await expect(editGameDialog).toBeVisible();
  await expect(
    editGameDialog.getByRole("button", { name: "Delete match" }),
  ).toHaveCount(0);
  await editGameDialog.getByRole("button", { name: "Cancel" }).click();
  await page
    .getByRole("button", { name: "Delete Padel match", exact: true })
    .click();
  const deleteGameDialog = page.getByRole("dialog", {
    name: "Delete this match?",
  });
  await expect(deleteGameDialog).toBeVisible();
  await deleteGameDialog
    .getByRole("button", { name: "Delete match", exact: true })
    .click();
  await expect(page.getByText("No games added yet.")).toBeVisible();
  await page.getByRole("link", { name: "Review", exact: true }).first().click();
  await expect(page.locator(".detail-hero--workout")).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Exercise overview" }),
  ).toBeVisible();
  await page.getByText("Exercise overview", { exact: true }).click();
  await expect(page.getByRole("button", { name: /Standard/ })).toBeVisible();
  await page.getByRole("button", { name: "Edit workout" }).click();
  const exerciseItems = page.locator(".editor-exercise-list > li");
  const firstExerciseName = await exerciseItems
    .nth(0)
    .locator(".editor-exercise-copy > a")
    .innerText();
  const firstDragHandle = exerciseItems
    .nth(0)
    .getByRole("button", { name: /^Reorder / });
  await firstDragHandle.scrollIntoViewIfNeeded();
  await firstDragHandle.press("ArrowDown");
  await expect(
    exerciseItems.nth(1).locator(".editor-exercise-copy > a"),
  ).toHaveText(firstExerciseName);
  await page.getByRole("button", { name: "Add exercise", exact: true }).click();
  await page.getByPlaceholder("Search movement or body area").fill("dead bug");
  await page.locator(".exercise-picker-list button").first().click();
  await page.getByRole("button", { name: "Adapt today" }).click();
  await expect(
    page.getByRole("heading", { name: "Adapt today" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Make today lighter/ }).click();
  await expect(
    page.getByRole("heading", { name: "Updated session" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Use this session" }).click();
  await expect(
    page.getByRole("button", { name: "Reset adaptations" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset adaptations" }).click();
  await expect(
    page.getByRole("button", { name: "Reset adaptations" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.goto("/plan/calendar");

  await expect(page.getByText("Edited", { exact: true })).toBeVisible();
  await expect(page.getByText(/\d+ exercises/).first()).toBeVisible();
});

test("deletes every locally stored Axyro data category", async ({ page }) => {
  await page.goto("/settings");
  await page.evaluate(() => {
    window.localStorage.setItem(
      "veyro.preferences.v1",
      "unattributed legacy data",
    );
    window.localStorage.setItem(
      "veyro.owner.another-user.veyro.preferences.v1",
      "another account",
    );
    for (const key of [
      "veyro.training-profile.v2",
      "veyro.training-plan.v1",
      "veyro.workout-activity.v1",
      "veyro.active-workout.v1",
      "veyro.preferences.v1",
      "veyro.adaptation-profile.v1",
    ]) {
      window.localStorage.setItem(
        `veyro.owner.development-admin.${key}`,
        "test-value",
      );
    }
  });

  await page.getByRole("button", { name: "Delete all my data" }).click();
  await page
    .getByRole("button", { name: "Delete all data", exact: true })
    .click();
  await expect(page).toHaveURL(/\/plan\/setup$/);

  const remainingKeys = await page.evaluate(() =>
    Object.keys(window.localStorage).filter((key) =>
      key.startsWith("veyro.owner.development-admin."),
    ),
  );
  expect(remainingKeys).toEqual([]);
  expect(
    await page.evaluate(() =>
      window.localStorage.getItem("veyro.preferences.v1"),
    ),
  ).toBe("unattributed legacy data");
  expect(
    await page.evaluate(() =>
      window.localStorage.getItem(
        "veyro.owner.another-user.veyro.preferences.v1",
      ),
    ),
  ).toBe("another account");
});

test("opens a home-compatible shoulder workout including the prone shoulder movements", async ({
  page,
}) => {
  await page.goto("/workouts/padel-shoulder-overhead-durability");
  await expect(
    page.getByRole("heading", { name: "Shoulder & Overhead Durability" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Foam-Roller|Plate Over/ }),
  ).toHaveCount(0);
  for (const name of [
    "Prone Overhead Shoulder Press",
    "Prone Shoulder Internal/External Rotation",
    "Single-Arm Prone Shoulder Arc",
  ]) {
    await expect(
      page.getByRole("link", { name, exact: true }).first(),
    ).toBeVisible();
  }
  await page.getByRole("button", { name: /Light/ }).click();
  await expect(page.locator(".selected-workout-duration strong")).toHaveText(
    "10 min",
  );
  await page.getByRole("link", { name: "Start workout · Light" }).click();
  await expect(page.getByRole("timer")).toBeVisible();
  await page.goto("/exercises/prone-foam-roller-overhead-shoulder-press");
  await expect(
    page.getByRole("heading", {
      name: "Prone Overhead Shoulder Press",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole("note")).toContainText("Dumbbells optional");
  await expect(
    page.getByText(/optional light dumbbell resistance/),
  ).toBeVisible();
});

test("remembers the preferred effort and audio setting", async ({ page }) => {
  await page.goto("/workouts/foundation-strength");
  await page.getByRole("button", { name: /Light/ }).click();
  await page.getByRole("link", { name: "Start workout · Light" }).click();
  await expect(
    page.getByRole("heading", { name: "Bodyweight Squat" }),
  ).toBeVisible();

  await page.goBack();
  await expect(page.getByRole("button", { name: /Light/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  await page.getByRole("link", { name: "Start workout · Light" }).click();
  await page.getByRole("button", { name: "Audio guidance" }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Audio guidance" }),
  ).toHaveAttribute("aria-pressed", "false");

  await page.getByRole("button", { name: "Audio guidance" }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Audio guidance" }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("keeps essential workout controls visible on a small phone", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto("/workouts/foundation-strength");
  await page.getByRole("link", { name: /Start workout/ }).click();

  const essentialControls = [
    page.locator(".player-media"),
    page.getByRole("heading", { name: "Bodyweight Squat" }),
    page.getByRole("timer"),
    page.getByRole("button", { name: "Previous" }),
    page
      .getByRole("group", { name: "Workout controls" })
      .getByRole("button", { name: "Pause" }),
    page.getByRole("button", { name: "Skip" }),
    page.getByRole("button", { name: "Audio guidance", exact: true }),
  ];

  await expect(page.getByText("Up next", { exact: true })).toBeVisible();
  for (const control of essentialControls) {
    await expect(control).toBeVisible();
    const bounds = await control.boundingBox();
    expect(bounds).not.toBeNull();
    expect((bounds?.y ?? 641) + (bounds?.height ?? 0)).toBeLessThanOrEqual(640);
  }

  const playerDimensions = await page
    .locator(".player-shell")
    .evaluate((node) => ({
      clientHeight: node.clientHeight,
      scrollHeight: node.scrollHeight,
    }));
  expect(playerDimensions.scrollHeight).toBeLessThanOrEqual(
    playerDimensions.clientHeight,
  );

  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page.getByText("Focus", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Technique" })).toBeVisible();
  const coachingBounds = await page.locator(".player-coaching").boundingBox();
  const controlsBounds = await page
    .getByRole("group", { name: "Workout controls" })
    .boundingBox();
  expect(coachingBounds).not.toBeNull();
  expect(controlsBounds).not.toBeNull();
  expect(controlsBounds!.y).toBeGreaterThanOrEqual(
    coachingBounds!.y + coachingBounds!.height,
  );
  expect(controlsBounds!.y + controlsBounds!.height).toBeLessThanOrEqual(640);
  await page.getByRole("button", { name: "Technique" }).click();
  const techniqueDialog = page.getByRole("dialog", { name: "Technique" });
  await expect(techniqueDialog).toBeVisible();
  await expect(
    techniqueDialog.getByText("Setup", { exact: true }),
  ).toBeVisible();
  await expect(techniqueDialog.getByText("Do", { exact: true })).toBeVisible();
  await expect(
    techniqueDialog.getByText("Watch for", { exact: true }),
  ).toBeVisible();
  await techniqueDialog
    .getByRole("button", { name: "Close technique" })
    .click();

  const documentDimensions = await page.evaluate(() => ({
    clientHeight: document.documentElement.clientHeight,
    scrollHeight: document.documentElement.scrollHeight,
  }));
  expect(documentDimensions.scrollHeight).toBeLessThanOrEqual(
    documentDimensions.clientHeight,
  );
});

test("browses the shoulder library and opens full coaching details", async ({
  page,
}) => {
  await page.goto("/exercises?area=shoulders");

  await expect(
    page.getByRole("heading", { name: "Exercise library." }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: /Single-Arm Prone Shoulder Arc/,
    }),
  ).toBeVisible();
  await page
    .getByRole("heading", {
      name: "Single-Arm Prone Shoulder Arc",
      level: 2,
    })
    .click();
  const singleArmVideo = page.getByLabel(
    "Single-Arm Prone Shoulder Arc movement demonstration",
  );
  await expect(singleArmVideo).toHaveAttribute(
    "src",
    "/videos/single-arm-prone-plate-over-obstacle-v2.mov",
  );
  await expect(singleArmVideo).not.toHaveAttribute("controls", "");
  await expect(singleArmVideo).toHaveAttribute("tabindex", "-1");
  await expect(
    page.getByRole("heading", { name: "How to move" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Key cues" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "What it develops" }),
  ).toBeVisible();

  await page.goto("/exercises/prone-foam-roller-overhead-shoulder-press");
  const foamRollerVideo = page.getByLabel(
    "Prone Overhead Shoulder Press movement demonstration",
  );
  await expect(foamRollerVideo).toHaveAttribute(
    "src",
    "/videos/prone-foam-roller-overhead-shoulder-press-v2.mov",
  );
  await expect(foamRollerVideo).not.toHaveAttribute("controls", "");
  await expect(foamRollerVideo).toHaveAttribute("tabindex", "-1");

  await page.goto(
    "/exercises/prone-foam-roller-plate-internal-external-rotation",
  );
  const rotationVideo = page.getByLabel(
    "Prone Shoulder Internal/External Rotation movement demonstration",
  );
  await expect(rotationVideo).toHaveAttribute(
    "src",
    "/videos/prone-foam-roller-plate-internal-external-rotation-v2.mov",
  );
  await expect(rotationVideo).not.toHaveAttribute("controls", "");
  await expect(rotationVideo).toHaveAttribute("tabindex", "-1");
});

test("controls and completes a workout session", async ({ page }) => {
  await page.goto("/workouts/foundation-strength/start?intensity=light");

  await expect(
    page.getByRole("heading", { name: "Bodyweight Squat" }),
  ).toBeVisible();
  await expect(page.getByRole("timer")).toBeVisible();
  await page.waitForTimeout(5_500);
  await expect(page.getByText("Set 1 of 1")).toBeVisible();

  await page.getByRole("button", { name: "Audio guidance" }).click();
  await expect(
    page.getByRole("button", { name: "Audio guidance" }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Audio guidance" }).click();

  await page
    .getByRole("group", { name: "Workout controls" })
    .getByRole("button", { name: "Pause", exact: true })
    .click();
  const pausedTimer = await page.getByRole("timer").getAttribute("aria-label");
  await page.waitForTimeout(1_100);
  expect(await page.getByRole("timer").getAttribute("aria-label")).toBe(
    pausedTimer,
  );
  await expect(
    page
      .getByRole("group", { name: "Workout controls" })
      .getByRole("button", { name: "Resume", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("group", { name: "Workout controls" })
    .getByRole("button", { name: "Resume", exact: true })
    .click();

  await page.getByRole("button", { name: /Skip/ }).click();
  await expect(page.getByText("Recover and breathe")).toBeVisible();
  await page.getByRole("button", { name: /Previous/ }).click();
  await expect(page.getByText("Set 1 of 1")).toBeVisible();

  for (let step = 0; step < 60; step += 1) {
    if (await page.getByRole("heading", { name: "Strong work." }).isVisible())
      break;
    await page.getByRole("button", { name: /Skip/ }).click();
  }

  await expect(
    page.getByRole("heading", { name: "Strong work." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "How did that workout feel?" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Repeat workout", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Repeat workout" }),
  ).toBeVisible();
  const justRight = page.getByRole("button", {
    name: "Just right Challenging but manageable",
  });
  await justRight.click();
  await expect(justRight).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByText("Saved. Your feedback stays with this completed session."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Too easy/ })).toBeDisabled();

  await page.getByRole("link", { name: "Done" }).click();
  await expect(
    page.getByRole("heading", { name: "Foundation Strength" }).first(),
  ).toBeVisible();
  await expect(page.getByText("1 completed", { exact: true })).toBeVisible();

  await page.goto("/activity");
  await expect(page.getByRole("heading", { name: "Activity" })).toBeVisible();
  const completedActivity = page.getByRole("link", {
    name: /Foundation Strength.*Completed.*actual.*Just right/i,
  });
  await expect(completedActivity).toBeVisible();
  await completedActivity.click();
  await expect(
    page.getByRole("heading", { name: "Foundation Strength" }),
  ).toBeVisible();
  await expect(page.getByText("Completed", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Just right" })).toBeVisible();
  await expect(page.locator("main .back-link")).toBeVisible();
});

test("shows a recovery panel instead of exercise media during rest", async ({
  page,
}) => {
  await page.goto("/workouts/foundation-strength/start?intensity=light");
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await expect(page.getByRole("button", { name: "Technique" })).toBeVisible();
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Recovery", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".player-recovery-panel")).toHaveText("Recovery");
  await expect(page.locator(".player-reference--recovering")).toHaveCSS(
    "opacity",
    "0",
  );
  await expect(page.getByRole("timer")).toBeVisible();
  await page
    .getByRole("group", { name: "Workout controls" })
    .getByRole("button", { name: "Pause", exact: true })
    .click();
  await expect(page.locator(".player-recovery-panel")).toBeVisible();
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await expect(page.locator(".player-recovery-panel")).toHaveCount(0);
  await expect(page.locator(".player-media .exercise-media")).toBeVisible();
});

test("keeps the desktop workout player columns contained", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto("/workouts/foundation-strength/start?intensity=light");

  const mediaBox = await page.locator(".player-media").boundingBox();
  const contentBox = await page.locator(".player-content").boundingBox();

  expect(mediaBox).not.toBeNull();
  expect(contentBox).not.toBeNull();
  expect(mediaBox!.x + mediaBox!.width).toBeLessThanOrEqual(contentBox!.x);
  await expect(
    page.getByRole("heading", { name: "Bodyweight Squat" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: /Skip/ })).toBeVisible();
});

test("restores an interrupted workout paused at the exact phase", async ({
  page,
}) => {
  await page.goto(
    "/workouts/foundation-strength/start?intensity=light&minutes=5",
  );
  await page.getByRole("button", { name: /Skip/ }).click();
  await expect(page.getByText("Set 1 of 1")).toBeVisible();
  await page
    .getByRole("group", { name: "Workout controls" })
    .getByRole("button", { name: "Pause", exact: true })
    .click();
  const beforeReload = await page.getByRole("timer").getAttribute("aria-label");

  await page.reload();

  await expect(
    page
      .getByRole("group", { name: "Workout controls" })
      .getByRole("button", { name: "Resume", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Set 1 of 1")).toBeVisible();
  expect(await page.getByRole("timer").getAttribute("aria-label")).toBe(
    beforeReload,
  );
  await page
    .getByRole("group", { name: "Workout controls" })
    .getByRole("button", { name: "Resume", exact: true })
    .click();
  await expect(
    page
      .getByRole("group", { name: "Workout controls" })
      .getByRole("button", { name: "Pause" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Exit workout" }).click();
  await expect(
    page.getByRole("heading", { name: "Leave workout?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save & exit" }).click();
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "Resume workout" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Resume workout" }),
  ).toHaveAttribute("href", /minutes=5/);
});

test("does not overwrite a different active workout", async ({ page }) => {
  await page.goto("/workouts/foundation-strength/start?intensity=light");
  await expect(page.getByRole("timer")).toBeVisible();
  await page.goto("/workouts/lower-body-control/start?intensity=light");

  await expect(
    page.getByRole("heading", {
      name: "You already have a workout in progress.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Resume workout" }),
  ).toHaveAttribute(
    "href",
    /\/workouts\/foundation-strength\/start\?intensity=light/,
  );
});

test("asks for an affected area before saving pain feedback", async ({
  page,
}) => {
  await page.goto("/workouts/foundation-strength/start?intensity=light");

  for (let step = 0; step < 60; step += 1) {
    if (await page.getByRole("heading", { name: "Strong work." }).isVisible())
      break;
    await page.getByRole("button", { name: /Skip/ }).click();
  }

  await expect(
    page.getByRole("heading", { name: "How did that workout feel?" }),
  ).toBeVisible();

  await page
    .getByRole("button", {
      name: "Pain or discomfort Something did not feel right",
    })
    .click();
  await expect(page.getByText("Where did you feel discomfort?")).toBeVisible();
  await page.getByRole("button", { name: "Knee", exact: true }).click();
  await expect(page.getByText(/Do not push through pain/)).toBeVisible();
});

test("applies a transparent feedback change to a future plan session", async ({
  page,
}) => {
  test.slow();
  await page.goto("/plan/setup");
  for (let step = 0; step < 20; step += 1) {
    if (
      await page.getByRole("button", { name: "Create My Plan" }).isVisible()
    ) {
      break;
    }
    await page.getByRole("button", { name: "Continue" }).click();
  }
  await page.getByRole("button", { name: "Create My Plan" }).click();
  await page.getByRole("link", { name: /View full calendar/ }).click();
  await page
    .getByRole("link", { name: /Review/ })
    .first()
    .click();
  await page
    .getByRole("link", { name: /^Start workout/ })
    .first()
    .click();
  await expect(page.getByRole("timer")).toBeVisible();

  for (let step = 0; step < 100; step += 1) {
    if (await page.getByRole("heading", { name: "Strong work." }).isVisible())
      break;
    await page.getByRole("button", { name: /Skip/ }).click();
  }

  await expect(
    page.getByRole("heading", { name: "How did that workout feel?" }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Too easy I had plenty left" })
    .click();
  await expect(page.getByText("Adjusted for you")).toBeVisible();
  await page.getByRole("button", { name: "Apply change" }).click();
  await expect(
    page.getByText("Change applied to your next comparable session."),
  ).toBeVisible();
  await page.getByRole("link", { name: "Done" }).click();
  await page.getByRole("link", { name: /View full calendar/ }).click();
  await expect(page.getByText("Adjusted for you").first()).toBeVisible();
});

for (const viewport of [
  { width: 360, height: 640 },
  { width: 390, height: 844 },
] as const) {
  test(`keeps exercise results in the first viewport at ${viewport.width}×${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/exercises");

    const resultsHeading = page.getByRole("heading", { name: "Exercises" });
    await expect(resultsHeading).toBeVisible();
    const bounds = await resultsHeading.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.y).toBeLessThan(viewport.height);
    await expect(page.getByText("More filters", { exact: true })).toHaveCount(
      0,
    );
  });
}

test("updates compact exercise filters immediately and keeps them in the URL", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/exercises");

  await expect(page.getByRole("group", { name: "Sport" })).toHaveCount(0);
  await page.getByRole("button", { name: "Shoulders", exact: true }).click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("area"))
    .toBe("shoulders");
  await expect(
    page.getByRole("heading", { name: "Exercise library." }),
  ).toBeVisible();

  const search = page.getByLabel("Search exercises");
  await search.click();
  await search.pressSequentially("w");
  await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe("w");
  await expect(search).toBeFocused();
  await search.pressSequentially("all slide");
  await expect
    .poll(() => new URL(page.url()).searchParams.get("q"))
    .toBe("wall slide");
  await expect(page.getByText("1 result", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "All areas", exact: true }).click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("area"))
    .toBeNull();
});
