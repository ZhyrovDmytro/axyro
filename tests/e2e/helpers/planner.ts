import type { Page } from "@playwright/test";
import { generateTrainingPlan } from "../../../src/domain/training-plan/generate-training-plan";
import { aiPlanRequestSchema } from "../../../src/domain/training-plan/ai-planner.schema";

/** Use the real validated compiler without external model latency in browser regressions. */
export async function installDeterministicPlanner(page: Page) {
  await page.route("**/api/training-plan", async (route) => {
    const request = aiPlanRequestSchema.parse(route.request().postDataJSON());
    const plan = generateTrainingPlan(
      request.profile,
      new Date(`${request.today}T12:00:00`),
      [],
      { adaptationProfile: request.adaptationProfile },
    );
    await route.fulfill({
      json: { plan, source: "fallback", reason: "disabled" },
    });
  });
}
