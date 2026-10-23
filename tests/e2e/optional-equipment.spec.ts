import { expect, test } from "@playwright/test";

test("explains optional weights in the guide and compact workout player", async ({
  page,
}, testInfo) => {
  const login = await page.request.post("/api/auth/signin", {
    headers: { Origin: new URL(String(testInfo.project.use.baseURL)).origin },
    data: { email: "admin", password: "admin" },
  });
  expect(login.ok()).toBe(true);
  await page.goto("/exercises/prone-y-raise");
  await expect(page.getByRole("note")).toContainText(
    "You can do this exercise without weights.",
  );
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto("/workouts/padel-core-rotation/start?intensity=light");
  await expect(
    page.locator(".player-status .optional-equipment-note"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeInViewport();
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await expect(
    page.locator(".player-status .optional-equipment-note"),
  ).toBeVisible();
  const heading = page.locator(".player-status h1");
  const frame = await page.locator(".player-media").boundingBox();
  const title = await heading.boundingBox();
  expect(title!.y).toBeGreaterThanOrEqual(frame!.y + frame!.height);
  await page.screenshot({ path: "/tmp/axyro-optional-equipment-mobile.png" });
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await expect(page.locator(".next-preview-copy strong")).toHaveText(
    "Recovery",
  );
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Recovery", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".player-status .optional-equipment-note"),
  ).toHaveCount(0);
});
