import { defineConfig, devices } from "@playwright/test";

const deployedUrl = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "./tests/release",
  workers: 1,
  retries: 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: deployedUrl ?? "http://localhost:3200",
    trace: "retain-on-failure",
  },
  webServer: deployedUrl
    ? undefined
    : {
        command: "npm run start -- --port 3200",
        url: "http://localhost:3200",
        reuseExistingServer: false,
      },
  projects: [{ name: "Mobile Chrome", use: { ...devices["Pixel 7"] } }],
});
