import { expect, test } from "@playwright/test";
test.beforeEach(async ({ page }, testInfo) => {
  const login = await page.request.post("/api/auth/signin", {
    headers: { Origin: new URL(String(testInfo.project.use.baseURL)).origin },
    data: { email: "admin", password: "admin" },
  });
  expect(login.ok()).toBe(true);
});
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
