import { expect, test } from "@playwright/test";
test.beforeEach(async ({ page }, testInfo) => {
  const login = await page.request.post("/api/auth/signin", {
    headers: { Origin: new URL(String(testInfo.project.use.baseURL)).origin },
    data: { email: "admin", password: "admin" },
  });
  expect(login.ok()).toBe(true);
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 320, height: 640 },
  { width: 844, height: 390 },
  { width: 1440, height: 900 },
]) {
  test(`player preparation, dock and technique fit at ${viewport.width}×${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.clock.install();
    await page.goto("/workouts/foundation-strength/start?intensity=light");
    const ready = page.locator(".player-ready-label");
    await expect(ready).toHaveText("Get ready");
    await expect(ready).toBeVisible();
    await page.clock.fastForward(5_000);
    await expect(ready).toHaveCount(0);
    const dock = await page.locator(".player-dock").boundingBox();
    const preview = await page.locator(".next-preview").boundingBox();
    expect(preview!.width).toBeCloseTo(dock!.width, 0);
    expect(preview!.x).toBeCloseTo(dock!.x, 0);
    expect(preview!.y + preview!.height).toBeLessThanOrEqual(viewport.height);
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await page.getByRole("button", { name: "Technique", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Technique", exact: true });
    await expect(dialog).toBeVisible();
    const bounds = await dialog.boundingBox();
    expect(bounds!.x + bounds!.width / 2).toBeCloseTo(viewport.width / 2, 0);
    expect(bounds!.y + bounds!.height / 2).toBeCloseTo(viewport.height / 2, 0);
    expect(bounds!.y).toBeGreaterThanOrEqual(16);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(
      viewport.height - 16,
    );
    await expect(
      dialog.getByRole("button", { name: "Close technique" }),
    ).toBeFocused();
    await page.screenshot({
      path: `/tmp/axyro-technique-${viewport.width}.png`,
    });
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Technique", exact: true }),
    ).toBeFocused();
    await page.getByRole("button", { name: "Skip", exact: true }).click();
    await page.getByRole("button", { name: "Skip", exact: true }).click();
    await expect(ready).toBeVisible();
    await page.screenshot({
      path: `/tmp/axyro-get-ready-${viewport.width}.png`,
    });
  });
}
test("recovery keeps the media frame and appears in up next", async ({
  page,
}) => {
  await page.goto("/workouts/foundation-strength/start?intensity=light");
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await expect(page.locator(".next-preview-copy strong")).toHaveText(
    "Recovery",
  );
  const previewIcon = page.locator(".next-preview .player-recovery-symbol");
  await expect(previewIcon).toHaveCSS("color", "rgb(17, 17, 17)");
  await expect(previewIcon.locator("svg")).toBeVisible();
  const before = await page.locator(".player-media").boundingBox();
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  const recovery = page.locator(".player-media > .player-recovery-panel");
  await expect(recovery).toBeVisible();
  const after = await recovery.boundingBox();
  expect(after?.width).toBeCloseTo(before!.width, 0);
  expect(after?.height).toBeCloseTo(before!.height, 0);
  await expect(page.locator(".player-reference")).toHaveCSS("opacity", "0");
  await page.screenshot({ path: "/tmp/axyro-recovery-mobile.png" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(recovery).toBeVisible();
  const frame = await page.locator(".player-media").boundingBox();
  const desktop = await recovery.boundingBox();
  expect(desktop?.width).toBeCloseTo(frame!.width, 0);
  expect(desktop?.height).toBeCloseTo(frame!.height, 0);
  await page.screenshot({ path: "/tmp/axyro-recovery-desktop.png" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(recovery.locator(".player-recovery-symbol")).toHaveCSS(
    "animation-name",
    "none",
  );
});
test("continues through delayed background updates and preserves manual pause", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/workouts/foundation-strength/start?intensity=light");
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await page.clock.fastForward(65_000);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("progressbar")).not.toHaveAttribute(
    "aria-valuenow",
    "0",
  );
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const frozen = await page.getByRole("timer").textContent();
  await page.clock.fastForward(20_000);
  await expect(page.getByRole("timer")).toHaveText(frozen!);
});
