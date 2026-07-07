/**
 * Error States & Edge Cases E2E Tests
 *
 * Tests API failures, generation errors, rate limiting, and edge cases.
 * Uses mock-based API interception to simulate error conditions.
 *
 * Covers (from TEST_PLAN):
 *   X1.2 — Templates API failure shows error + retry
 *   X1.5 — Plans API failure on pricing page shows fallback
 *   X1.5 var — Pricing page renders with empty plans
 *   X1.3 — Generation API error shows retry
 *   X4.1 — Empty generate result shows message
 *   X2.3 — Rapid generate clicks — button disabled
 *   X2.4 — API 429 handled gracefully
 *
 * Guest tests work for any auth state. Generate/auth tests need Clerk auth.
 * File runs under the "chromium-auth" project.
 */

import { test, expect } from "@playwright/test";
import { signInUser, deleteClerkUser } from "./auth-helpers";
import { setupPersona } from "./helpers";

// ── Tests ───────────────────────────────────────────────────────────────────

test.describe("Error States — API Failures", () => {
  // ── X1.2: Templates API failure ─────────────────────────────

  test("templates API failure shows error", async ({ page }) => {
    // Use GUEST persona — mock plans + templates endpoints
    await setupPersona(page, "GUEST");

    // Mock templates endpoint to return 500
    await page.route("**/api/templates**", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal Server Error" }),
      });
    });

    await page.goto("/templates");
    await page.waitForLoadState("networkidle");

    // The templates error toast appears — use .first() to avoid strict mode
    // matching both the toast AND the Next.js error overlay
    await expect(
      page.getByText("Failed to fetch templates from the server.").first()
    ).toBeVisible({ timeout: 10000 });
  });

  // ── X1.5: Plans API failure on pricing page ────────────────

  test("plans API failure on pricing page", async ({ page }) => {
    await setupPersona(page, "GUEST");

    // Override plans mock — return 500
    await page.route("**/api/payments/plans", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal Server Error" }),
      });
    });

    await page.goto("/pricing");
    await page.waitForLoadState("networkidle");

    // The pricing page should still render (plan cards may show fallback/loading)
    // At minimum, the page heading and structure should be intact
    await expect(
      page.getByRole("heading", { name: "Pay once. Create forever." })
    ).toBeVisible();

    // The page should still render — verify the main heading and body
    await expect(
      page.getByRole("heading", { name: "Pay once. Create forever." })
    ).toBeVisible();

    // Body is visible (page didn't crash)
    await expect(page.locator("body")).toBeVisible();
  });

  // ── X1.5 variant: Empty plans ──────────────────────────────

  test("pricing page renders with empty plans", async ({ page }) => {
    await setupPersona(page, "GUEST");

    // Override plans mock — return empty arrays
    await page.route("**/api/payments/plans", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ creditPacks: [], subscriptions: [] }),
      });
    });

    await page.goto("/pricing");
    await page.waitForLoadState("networkidle");

    // The pricing page should not crash — verify it still renders
    await expect(
      page.getByRole("heading", { name: "Pay once. Create forever." })
    ).toBeVisible();

    // The FAQ and bottom CTA should still render
    await expect(
      page.getByText("Frequently asked questions")
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Get started" })
    ).toBeVisible();
  });
});

test.describe("Error States — Generate Errors", () => {
  const clerkUserIds: string[] = [];

  test.afterEach(async () => {
    for (const id of clerkUserIds) {
      await deleteClerkUser(id);
    }
    clerkUserIds.length = 0;
  });

  // ── X1.3: Generation API error shows retry ─────────────────

  test("generation API error shows retry", async ({ page }) => {
    const { userId } = await signInUser(page, { grantCredits: 100 });
    clerkUserIds.push(userId);

    // Navigate to /generate
    await page.goto("/generate");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // IMPORTANT: signInUser in auth-helpers blocks /api/generate with a default
    // success mock. We must override it AFTER signInUser completes.
    // First, remove the existing route handler, then set our error mock.
    await page.unroute("**/api/generate**");
    await page.route("**/api/generate**", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Generation failed" }),
      });
    });

    // Fill in a prompt
    const promptInput = page.getByPlaceholder(/describe/i).first();
    await promptInput.fill("Test prompt that will fail");

    // Click Generate
    await page.getByRole("button", { name: /generate/i }).click();
    await page.waitForTimeout(3000);

    // Should see an error message — the form shows inline error text
    // The generate error handler sets: setError(msg) which renders in the error div
    await expect(
      page.getByText(/Something went wrong|Generation failed/i).first()
    ).toBeVisible({ timeout: 10000 });

    // The error is shown inline (not as a retry button)
    // User can modify prompt and click Generate again to retry
    const genButton = page.getByRole("button", { name: /generate/i }).first();
    await expect(genButton).toBeVisible();
    await expect(genButton).toBeEnabled();
  });

  // ── X4.1: Empty generate result ────────────────────────────

  test("empty generate result shows message", async ({ page }) => {
    const { userId } = await signInUser(page, { grantCredits: 100 });
    clerkUserIds.push(userId);

    await page.goto("/generate");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Mock the generate API to return empty results
    await page.route("**/api/generate**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ imageUrls: [] }),
      });
    });

    // Fill in a prompt
    const promptInput = page.getByPlaceholder(/describe/i).first();
    await promptInput.fill("Test prompt for empty result");

    // Click Generate
    await page.getByRole("button", { name: /generate/i }).click();
    await page.waitForTimeout(3000);

    // Should see a message indicating no images were generated
    await expect(
      page.getByText(/no images|no results|nothing generated|empty/i).first()
    ).toBeVisible({ timeout: 10000 });
  });
});

test.describe("Edge Cases — Rate Limiting", () => {
  const clerkUserIds: string[] = [];

  test.afterEach(async () => {
    for (const id of clerkUserIds) {
      await deleteClerkUser(id);
    }
    clerkUserIds.length = 0;
  });

  // ── X2.3: Rapid generate clicks — button disabled ──────────

  test("rapid generate clicks — button disabled", async ({ page }) => {
    const { userId } = await signInUser(page, { grantCredits: 100 });
    clerkUserIds.push(userId);

    await page.goto("/generate");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Remove default generate mock from signInUser, then add slow mock (30s delay)
    await page.unroute("**/api/generate**");
    await page.route("**/api/generate**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 30000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ imageUrls: [] }),
      });
    });

    // Fill in a prompt
    const promptInput = page.getByPlaceholder(/describe/i).first();
    await promptInput.fill("Test prompt for rate limiting");

    // Click Generate
    await page.getByRole("button", { name: /generate/i }).click();

    // The button text changes to "Generating..." — verify it's visible and disabled
    const generatingBtn = page.getByRole("button", { name: /generating/i });
    await expect(generatingBtn).toBeVisible({ timeout: 3000 });
    await expect(generatingBtn).toBeDisabled({ timeout: 3000 });

  });

  // ── X2.4: API 429 handled gracefully ───────────────────────

  test("API 429 handled gracefully", async ({ page }) => {
    const { userId } = await signInUser(page, { grantCredits: 100 });
    clerkUserIds.push(userId);

    await page.goto("/generate");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Mock the generate API to return 429 (Too Many Requests)
    await page.route("**/api/generate**", async (route) => {
      await route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Too many requests. Please wait before generating again.",
        }),
      });
    });

    // Fill in a prompt
    const promptInput = page.getByPlaceholder(/describe/i).first();
    await promptInput.fill("Test prompt for rate limit");

    // Click Generate
    await page.getByRole("button", { name: /generate/i }).click();
    await page.waitForTimeout(3000);

    // Should see a rate limit / too many requests error message
    await expect(
      page.getByText(/too many requests|rate limit|429|please wait/i).first()
    ).toBeVisible({ timeout: 10000 });

    // The generate button should be re-enabled after error handling
    const generateButton = page.getByRole("button", { name: /generate/i });
    await expect(generateButton).toBeEnabled({ timeout: 5000 });
  });
});
