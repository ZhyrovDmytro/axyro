import { expect, test } from "@playwright/test";

test("video card shows its poster on a cold visit when the clip cannot load", async ({ page }, testInfo) => {
  const login = await page.request.post("/api/auth/signin", {
    headers: { Origin: new URL(String(testInfo.project.use.baseURL)).origin },
    data: { email: "admin", password: "admin" },
  });
  expect(login.ok()).toBe(true);
  await page.route("**/videos/dumbbell-romanian-deadlift.mov", (route) => route.abort());
  await page.goto("/exercises?q=Dumbbell+Romanian+Deadlift");
  const card = page.locator(".exercise-card:visible").filter({ hasText: "Dumbbell Romanian Deadlift" });
  await expect(card).toBeVisible();
  const poster = "/images/exercises/dumbbell-romanian-deadlift-preview.png";
  await expect.poll(async () => {
    const video = card.locator("video");
    if (await video.count()) return video.getAttribute("poster");
    const fallback = card.locator("img");
    return (await fallback.getAttribute("src"))?.includes(encodeURIComponent(poster)) ? poster : null;
  }).toBe(poster);
  await expect(card.locator(".exercise-media__loading")).toHaveCount(0);
  const response = await page.request.get(poster);
  expect(response.ok()).toBe(true);
  expect((await response.body()).length).toBeGreaterThan(10000);
  // Metadata preload is a hint; some browsers never request the blocked clip.
  const video = card.locator("video");
  if (await video.count()) await video.dispatchEvent("error");
  const fallback = card.locator(".exercise-media--fallback img");
  await expect(fallback).toBeVisible();
  await expect.poll(() => fallback.evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await card.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "/tmp/axyro-video-preview-mobile.png" });
  await page.setViewportSize({ width: 1280, height: 900 });
  await fallback.evaluate((image) => (image as HTMLImageElement).decode());
  await page.screenshot({ path: "/tmp/axyro-video-preview-desktop.png" });
  await card.screenshot({ path: "/tmp/axyro-video-preview-card.png" });
});
