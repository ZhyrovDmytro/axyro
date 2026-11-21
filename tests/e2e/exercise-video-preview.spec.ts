import { expect, test } from "@playwright/test";

test("the active and up-next demos both play on a phone", async ({ page }) => {
  await page.goto("/workouts/foundation-strength/start?intensity=light");
  const upcoming = page.locator(".next-preview video");
  await expect(upcoming).toBeAttached();
  await upcoming.scrollIntoViewIfNeeded();
  await expect
    .poll(() => upcoming.evaluate((el: HTMLVideoElement) => el.currentTime))
    .toBeGreaterThan(0);
  await expect(upcoming).toHaveAttribute("src", /\.mp4$/);
  await expect(upcoming).not.toHaveAttribute("poster", /.+/);
  await expect(page.locator(".player-media video")).toHaveAttribute(
    "src",
    /\.mp4$/,
  );
});

test("library filters reuse the catalog and distant cards defer demos", async ({
  page,
}) => {
  const demoRequests: string[] = [];
  page.on("request", (request) => {
    if (/\.(gif|mp4|mov)(\?|$)/i.test(request.url()))
      demoRequests.push(request.url());
  });
  await page.goto("/exercises");
  const cards = page.locator(".exercise-card");
  await expect(cards.last()).toBeAttached();
  const poster = cards.last().locator("img");
  await poster.scrollIntoViewIfNeeded();
  await expect(poster).toHaveAttribute("src", /\.webp$/);
  await expect
    .poll(() => poster.evaluate((el: HTMLImageElement) => el.naturalWidth))
    .toBeGreaterThan(0);
  expect(demoRequests).toEqual([]);

  const filterRequests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/exercises" && url.searchParams.has("q")) {
      filterRequests.push(url.pathname);
    }
  });
  await page.getByRole("searchbox").fill("no matching exercise");
  await expect(page.getByText("No preview exercises match")).toBeVisible();
  await expect(page).toHaveURL(/q=no\+matching\+exercise/);
  await page.getByRole("button", { name: "Reset filters" }).click();
  await expect(cards.first()).toBeVisible();
  expect(filterRequests).toEqual([]);
});
