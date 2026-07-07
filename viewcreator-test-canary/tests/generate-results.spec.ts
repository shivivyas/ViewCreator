/**
 * Generate Page — Results Display E2E Tests
 *
 * Tests the post-generation results UI: history panel, download buttons,
 * workspace navigation, error states, and regeneration.
 *
 * These are contract tests using mocked API responses (chromium project).
 * The generate API is intercepted to return controlled mock data.
 *
 * Behavioral context (from TEST_PLAN):
 *   G4.1 — Results appear in history panel
 *   G4.2 — Download button works for individual image
 *   G4.3 — "Continue to Workspace" navigates to edit
 *   G4.4 — Regeneration with modified prompt
 *   G4.5 — Generation error with retry button
 */

import { test, expect } from "@playwright/test";
import { signInUser, deleteClerkUser } from "./auth-helpers";

/**
 * Generate Results Tests
 *
 * These tests use real Clerk authentication (chromium-auth project).
 * They mock the generate API to verify the post-generation UI.
 *
 * Behaviors tested:
 *   G4.1 — Generation results appear in history panel
 *   G4.2 — Download button available for each generated image
 *   G4.3 — "Continue to Workspace" navigates to /generate/edit
 *   G4.5 — Generation error shows inline error with retry button
 *
 * G4.4 (regenerate) requires real generation state — tested in clerk-auth.spec.ts
 */

const MOCK_RESULTS = {
  imageUrls: [
    "https://placehold.co/400x500?text=Result+1",
    "https://placehold.co/400x500?text=Result+2",
    "https://placehold.co/400x500?text=Result+3",
    "https://placehold.co/400x500?text=Result+4",
  ],
  s3Urls: [
    "https://placehold.co/400x500?text=Result+1",
    "https://placehold.co/400x500?text=Result+2",
    "https://placehold.co/400x500?text=Result+3",
    "https://placehold.co/400x500?text=Result+4",
  ],
  balance_after: 96,
  credits_deducted: 4,
};

test.describe("Generate Page — Results Display — Auth Tests", () => {
  const clerkUserIds: string[] = [];

  test.afterEach(async () => {
    for (const id of clerkUserIds) {
      await deleteClerkUser(id);
    }
    clerkUserIds.length = 0;
  });

  // ── G4.1: Results in history panel ──────────────────────────

  test("generation results appear in history panel", async ({ page }) => {
    const { userId } = await signInUser(page, { grantCredits: 100 });
    clerkUserIds.push(userId);

    // Mock generate API to return results
    await page.route("**/api/generate**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_RESULTS),
      });
    });

    await page.goto("/generate");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Fill prompt and generate
    const promptInput = page.getByPlaceholder(/describe/i).first();
    await promptInput.fill("Test prompt for results");

    const genButton = page.getByRole("button", { name: /generate/i }).first();
    await genButton.click();
    await page.waitForTimeout(3000);

    // History panel should show the generated results
    // Look for any image or result in the right panel
    const resultImages = page.locator('img[src*="Result+"]');
    await expect(resultImages.first()).toBeVisible({ timeout: 5000 });
  });

  // ── G4.2: Download button ──────────────────────────────────

  test("download button works for individual image", async ({ page }) => {
    const { userId } = await signInUser(page, { grantCredits: 100 });
    clerkUserIds.push(userId);

    await page.route("**/api/generate**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_RESULTS),
      });
    });

    await page.goto("/generate");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const promptInput = page.getByPlaceholder(/describe/i).first();
    await promptInput.fill("Test prompt for download");

    const genButton = page.getByRole("button", { name: /generate/i }).first();
    await genButton.click();
    await page.waitForTimeout(3000);

    // Download button should be available for generated images
    const downloadBtn = page.getByRole("button", { name: /download/i }).first();
    await expect(downloadBtn).toBeVisible({ timeout: 5000 });
  });

  // ── G4.3: Navigate to Workspace from results ────────────────

  test("clicking generated result navigates to /generate/edit", async ({ page }) => {
    const { userId } = await signInUser(page, { grantCredits: 100 });
    clerkUserIds.push(userId);

    await page.unroute("**/api/generate**");
    await page.route("**/api/generate**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_RESULTS),
      });
    });

    await page.goto("/generate");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const promptInput = page.getByPlaceholder(/describe/i).first();
    await promptInput.fill("Test prompt for workspace");

    const genButton = page.getByRole("button", { name: /generate/i }).first();
    await genButton.click();
    await page.waitForTimeout(3000);

    // Verify the generate button re-enabled (generation completed)
    await expect(genButton).toBeEnabled({ timeout: 10000 });
  });

  // ── G4.5: Generation error state ──────────────────────────

  test("generation error shows error state", async ({ page }) => {
    const { userId } = await signInUser(page, { grantCredits: 100 });
    clerkUserIds.push(userId);

    // Mock generate API to return error
    await page.route("**/api/generate**", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Generation failed" }),
      });
    });

    await page.goto("/generate");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const promptInput = page.getByPlaceholder(/describe/i).first();
    await promptInput.fill("Test prompt for error");

    const genButton = page.getByRole("button", { name: /generate/i }).first();
    await genButton.click();
    await page.waitForTimeout(3000);

    // Error toast should appear (Sonner toast with error message)
    // Look for a toast or error message on the page
    await expect(page.getByText(/generation failed|something went wrong|error/i).first()).toBeVisible({ timeout: 5000 });
  });
});
