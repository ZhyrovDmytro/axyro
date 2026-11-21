import { expect, test } from "@playwright/test";

test("publishes public pages and keeps account and gated details out of search", async ({
  request,
}) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("https://axyro.app/help");
  expect(sitemap).toContain("https://axyro.app/workouts/foundation-strength");
  expect(sitemap).not.toMatch(/axyro\.app\/(account|plan|exercises\/)/);
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Sitemap: https://axyro.app/sitemap.xml");
  const headers = { "User-Agent": "Twitterbot" };
  const home = await (await request.get("/", { headers })).text();
  expect(home).toContain('name="twitter:card" content="summary_large_image"');
  const image = home.match(/property="og:image" content="([^"]+)"/)?.[1];
  expect(image).toBeTruthy();
  const card = await request.get(new URL(image!).pathname);
  expect(card.headers()["content-type"]).toContain("image/png");
  const png = await card.body();
  expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630]);
  expect(await (await request.get("/account", { headers })).text()).toContain(
    'content="noindex, nofollow"',
  );
});

test("help remains available during account service outages", async ({
  page,
}) => {
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ status: 503, json: {} }),
  );
  await page.goto("/help");
  await expect(
    page.getByRole("heading", { name: "Help with Axyro" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Reset my password" }),
  ).toHaveAttribute("href", "/forgot-password");
});
