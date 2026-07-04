import { defineConfig, devices } from "@playwright/test";

/**
 * ViewCreator Test Canary — Playwright Configuration
 *
 * This is an INDEPENDENT test harness that plugs into a running
 * ViewCreator instance. It does NOT live inside the app.
 *
 * Required before running:
 *   Terminal 1: cd ../viewcreator-ui  && npm run dev   (port 3000)
 *   Terminal 2: cd ../viewcreator-api && npm run dev   (port 3001)
 */

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { open: "never" }],
    ["json", { outputFile: "test-results/report.json" }],
  ],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on",
    screenshot: "on",
    video: "on",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // DO NOT auto-start webServer — the app must already be running.
  // This keeps the canary independent from app internals.
});
