import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3100",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev -- --port 3100",
    env: {
      AI_PLANNER_ENABLED: "false",
      AXYRO_NEXT_DIST_DIR: ".next-e2e",
    },
    url: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 7"] },
    },
  ],
});
