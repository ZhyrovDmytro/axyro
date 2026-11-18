import { expect, test } from "@playwright/test";
import { generateTrainingPlan } from "../../src/domain/training-plan/generate-training-plan";
import { representativeAthleteProfiles } from "../../src/domain/training-plan/evaluation-profiles";

test("mobile exercise overview shows the full image without a dark side gutter", async ({
  page,
}, testInfo) => {
  const login = await page.request.post("/api/auth/signin", {
    headers: { Origin: new URL(String(testInfo.project.use.baseURL)).origin },
    data: { email: "admin", password: "admin" },
  });
  expect(login.ok()).toBe(true);
  const plan = generateTrainingPlan(
    representativeAthleteProfiles[1],
    new Date(),
  );
  await page.goto("/plan/calendar");
  await page.evaluate(
    (seed) =>
      localStorage.setItem(
        "veyro.owner.development-admin.veyro.training-plan.v1",
        JSON.stringify(seed),
      ),
    plan,
  );
  await page.goto(`/plan/workouts/${plan.sessions[0].id}/edit`);
  const overview = page.getByRole("region", { name: "Exercise overview" });
  await expect(overview).toBeVisible();
  await expect(overview.getByText("Unchanged", { exact: true })).toHaveCount(0);
  const rows = overview.locator(".workout-plan > li");
  const sideItem = plan.sessions[0].sections
    .flatMap((section) => section.items)
    .find((item) => item.prescription.perSide)!;
  expect(sideItem).toBeDefined();
  const sideRow = rows.filter({
    has: page.locator(`a[href="/exercises/${sideItem.exerciseId}"]`),
  });
  await expect(sideRow).toContainText(`${sideItem.sets} per side`);
  await expect(sideRow).toContainText(`${sideItem.prescription.durationSeconds} sec per side`);
  await expect(sideRow).toContainText("Left → switch → right. Both sides included.");
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await rows.first().scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (width >= 672) continue;
    for (const row of [rows.nth(0), rows.nth(1)]) {
      await row.scrollIntoViewIfNeeded();
      const mediaBounds = (await row.locator(".plan-media").boundingBox())!;
      for (const selector of [".plan-copy > p", ".plan-timing"]) {
        const bounds = (await row.locator(selector).boundingBox())!;
        expect(Math.abs(bounds.x - mediaBounds.x)).toBeLessThanOrEqual(1);
        expect(Math.abs(bounds.width - mediaBounds.width)).toBeLessThanOrEqual(
          1,
        );
      }
      const asset = row.locator(".exercise-media--image img");
      await expect(asset).toBeVisible();
      await expect
        .poll(() =>
          asset.evaluate((el) => (el as HTMLImageElement).naturalWidth),
        )
        .toBeGreaterThan(0);
      const geometry = await asset.evaluate((el) => {
        const image = el as HTMLImageElement;
        const box = image.getBoundingClientRect();
        const parent = image.parentElement!.getBoundingClientRect();
        return {
          actualRatio: box.width / box.height,
          naturalRatio: image.naturalWidth / image.naturalHeight,
          widthGap: parent.width - box.width,
          heightGap: parent.height - box.height,
        };
      });
      expect(geometry.actualRatio).toBeCloseTo(geometry.naturalRatio, 2);
      expect(geometry.widthGap).toBeLessThanOrEqual(2);
      expect(geometry.heightGap).toBeLessThanOrEqual(2);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await sideRow.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "/tmp/axyro-exercise-overview-mobile.png" });
  await page.setViewportSize({ width: 1280, height: 900 });
  await sideRow.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "/tmp/axyro-exercise-overview-desktop.png" });
});
