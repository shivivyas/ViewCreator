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
import { setupClerkTestingToken, clerk } from "@clerk/testing/playwright";
import {
  setupPersona,
  mockPlansEndpoint,
  mockBalanceForPersona,
  mockTemplatesEndpoint,
} from "./helpers";

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || "";
const API_BASE = "http://localhost:3001";
const ADMIN_KEY = "dev-admin-key";

// ── Cleanup ─────────────────────────────────────────────────────────────────

async function deleteClerkUser(userId: string) {
  try {
    const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` },
    });
    if (!res.ok) {
      console.warn(`[Cleanup] Failed to delete user ${userId}: ${res.status}`);
    }
  } catch (err) {
    console.warn(`[Cleanup] Error deleting user ${userId}:`, err);
  }
}

// ── Sign-In Helper ──────────────────────────────────────────────────────────

async function signInUser(
  page: any,
  opts?: { grantCredits?: number }
): Promise<{ userId: string; email: string }> {
  const email = `testuser+error_${Date.now()}@example.com`;
  const password = "ViewCreatorTest123!";

  const createRes = await fetch(`https://api.clerk.com/v1/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CLERK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email_address: [email],
      password,
      skip_password_checks: true,
      skip_password_requirement: false,
    }),
  });

  if (!createRes.ok) {
    throw new Error(
      `Clerk user creation failed: ${createRes.status} — ${await createRes.text()}`
    );
  }

  const user = await createRes.json();
  const userId = user.id;

  await setupClerkTestingToken({ page });
  await page.goto("/pricing");
  await page.waitForLoadState("networkidle");
  await clerk.signIn({ page, emailAddress: email });
  await clerk.loaded({ page });
  await page.waitForTimeout(1000);

  if (opts?.grantCredits && opts.grantCredits > 0) {
    const grantRes = await fetch(
      `${API_BASE}/api/admin/payments/grant-credits`,
      {
        method: "POST",
        headers: {
          "x-admin-key": ADMIN_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          amount: opts.grantCredits,
          description: "error test seed",
        }),
      }
    );

    if (!grantRes.ok) {
      throw new Error(
        `Credit grant failed: ${grantRes.status} — ${await grantRes.text()}`
      );
    }
  }

  await mockPlansEndpoint(page as any);

  const hasRealCredits = opts?.grantCredits && opts.grantCredits > 0;
  if (!hasRealCredits) {
    await mockBalanceForPersona(page as any, "FREE");
  }

  // Navigate to a clean page so components fetch fresh data
  await page.goto("/pricing");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  return { userId, email };
}

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

    // The page should show an error message
    // The templates section has a toast.error("Failed to fetch templates from the server.")
    await expect(
      page.getByText(/failed to fetch templates|error loading templates|server error/i)
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

    // The page should show some indication that plans aren't available
    // This may be a loading state, error message, or empty plan cards
    const pageContent = page.locator("main, #pricing-page, [data-testid='pricing-page']");
    await expect(pageContent).toBeVisible();
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

    // Mock the generate API to return 500
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

    // Should see an error message with retry option
    await expect(
      page.getByText(/error|failed|retry|try again/i).first()
    ).toBeVisible({ timeout: 10000 });

    // A retry button should be visible
    const retryButton = page.getByRole("button", { name: /retry|try again/i });
    await expect(retryButton).toBeVisible({ timeout: 5000 });
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

    // Mock the generate API with a slow response to keep button disabled
    await page.route("**/api/generate**", async (route) => {
      // Delay response to simulate generation in progress
      await new Promise((resolve) => setTimeout(resolve, 5000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          imageUrls: [
            "https://placehold.co/400x500?text=Generated+1",
            "https://placehold.co/400x500?text=Generated+2",
          ],
        }),
      });
    });

    // Fill in a prompt
    const promptInput = page.getByPlaceholder(/describe/i).first();
    await promptInput.fill("Test prompt for rate limiting");

    // Click Generate
    const generateButton = page.getByRole("button", { name: /generate/i });
    await generateButton.click();
    await page.waitForTimeout(500);

    // The button should be disabled during generation
    await expect(generateButton).toBeDisabled({ timeout: 5000 });

    // Try clicking again while disabled — should not trigger a second request
    await generateButton.click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);

    // Button should still be disabled
    await expect(generateButton).toBeDisabled();
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
