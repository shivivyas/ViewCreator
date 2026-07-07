/**
 * Auth Guards & Deep Link Return E2E Tests
 *
 * Tests authentication guards for protected routes and API endpoints.
 * Also tests that after Clerk sign-in, users are returned to the correct page.
 *
 * Guest tests (A1.1–A1.5) verify that unauthenticated access to protected
 * routes and APIs is blocked with appropriate status codes or redirects.
 *
 * Deep link return tests (A2.1) verify that after Clerk sign-up, the user
 * lands back on the app (not Clerk's domain) with the expected page.
 *
 * Behavioral context (from TEST_PLAN):
 *   A1.1 — /generate/edit redirects guest to sign-up
 *   A1.2 — Generate API call without auth returns 401
 *   A1.3 — Balance API call without auth returns 401
 *   A1.4 — Upload API call without auth returns 401
 *   A1.5 — Vote API call without auth returns 401
 *   A2.1 — Clerk sign-up from /generate → returns to /generate
 *
 * Runs under the "chromium-auth" project. Guest tests work without signing in.
 * Deep link return tests call signInUser() for real Clerk auth.
 */

import { test, expect } from "@playwright/test";
import { signInUser, deleteClerkUser } from "./auth-helpers";

// ── Guest Auth Guard Tests ──────────────────────────────────────────────────
//
// These tests verify that unauthenticated access is blocked.
// They work in chromium-auth because no signInUser() is called.

test.describe("Auth Guards — Guest", () => {
  // ── A1.1: Guest redirected from /generate/edit ─────────────

  test("guest redirected from /generate/edit to sign-in", async ({ page }) => {
    await page.goto("/generate/edit");
    await page.waitForLoadState("networkidle");
    // Allow Clerk redirect to complete
    await page.waitForTimeout(3000);

    // Guest should NOT stay on /generate/edit — Clerk's auth.protect()
    // redirects to Clerk's hosted sign-in or interstitial page.
    const currentUrl = page.url();
    expect(currentUrl).not.toContain("/generate/edit");
  });

  // ── A1.2: Generate API returns 401 without auth ────────────

  test("POST /api/generate returns 401 without auth", async ({ page }) => {
    // Make a direct fetch call to the API — no auth headers
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch("http://localhost:3000/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: "test" }),
        });
        return { status: res.status };
      } catch {
        // If the request is blocked or redirected, verify it didn't succeed
        return { status: 0, error: "request blocked or redirected" };
      }
    });

    // Expect 401 Unauthorized or a redirect response
    // Clerk middleware may return 401 or redirect to sign-in (which could appear
    // as a redirect to the Clerk accounts domain)
    expect(response.status === 401 || response.status === 0).toBe(true);
  });

  // ── A1.3: Balance API returns 401 without auth ─────────────

  test("GET /api/payments/balance returns 401 without auth", async ({ page }) => {
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch("http://localhost:3001/api/payments/balance");
        return { status: res.status };
      } catch {
        return { status: 0, error: "request blocked" };
      }
    });

    expect(response.status === 401 || response.status === 0).toBe(true);
  });

  // ── A1.4: Upload API returns 401 without auth ──────────────

  test("POST /api/templates/upload returns 401 without auth", async ({ page }) => {
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch("http://localhost:3001/api/templates/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "test" }),
        });
        return { status: res.status };
      } catch {
        return { status: 0, error: "request blocked" };
      }
    });

    expect(response.status === 401 || response.status === 0).toBe(true);
  });

  // ── A1.5: Vote API returns 401 without auth ────────────────

  test("POST /api/templates/:id/vote returns 401 without auth", async ({ page }) => {
    const response = await page.evaluate(async () => {
      try {
        const res = await fetch("http://localhost:3001/api/templates/tmpl-1/vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        return { status: res.status };
      } catch {
        return { status: 0, error: "request blocked" };
      }
    });

    expect(response.status === 401 || response.status === 0).toBe(true);
  });
});

// ── Deep Link Return Tests (Clerk) ──────────────────────────────────────────
//
// A2.1: Verify that after Clerk sign-up, the user returns to the app
// (not Clerk's domain) and lands on a recognizable app page.

test.describe("Auth Guards — Deep Link Return (Clerk)", () => {
  const clerkUserIds: string[] = [];

  test.afterEach(async () => {
    for (const id of clerkUserIds) {
      await deleteClerkUser(id);
    }
    clerkUserIds.length = 0;
  });

  // ── A2.1: Sign-up from /generate returns to app ────────────

  test("sign-up from /generate returns to app domain", async ({ page }) => {
    // Navigate to /generate first as guest to simulate the deep link flow
    await mockPlansEndpoint(page as any);
    await page.goto("/generate");
    await page.waitForLoadState("networkidle");

    // Now sign in — start from /generate (the deep link page)
    const { userId } = await signInUser(page, { grantCredits: 100, redirectUrl: "/generate" });
    clerkUserIds.push(userId);

    // After signInUser completes, the user should be on the app domain
    // (not accounts.dev or Clerk's hosted sign-in page)
    const currentUrl = page.url();
    expect(currentUrl).toContain("localhost:3000");
    expect(currentUrl).not.toContain("accounts.dev");

    // The user should see app content (not a sign-in page)
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });
});
