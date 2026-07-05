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
 *
 * Projects:
 *   global-setup   — Obtains Clerk testing token once before all tests
 *   chromium       — API contract tests + guest UI tests (mock-based)
 *   chromium-auth  — Clerk-authenticated persona tests (real Clerk sign-in)
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
      name: "global-setup",
      testDir: "./tests",
      testMatch: "global.setup.ts",
    },
    {
      name: "chromium",
      testIgnore: ["clerk-auth.spec.ts", "global.setup.ts"],
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["global-setup"],
    },
    {
      name: "chromium-auth",
      testMatch: "clerk-auth.spec.ts",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["global-setup"],
      timeout: 120000,
    },
  ],
  // DO NOT auto-start webServer — the app must already be running.
  // This keeps the canary independent from app internals.
});
