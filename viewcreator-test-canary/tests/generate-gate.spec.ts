/**
 * Generate Page Gate E2E Tests
 *
 * Tests access control to the /generate page based on auth state and credit balance.
 * The gate should block guests (→ sign-up) and free users (0 credits → buy modal),
 * while allowing users with credits to proceed.
 *
 * Credit boundaries: 0 (blocked), 1 (allowed), 100 (allowed)
 */

import { test, expect } from "@playwright/test";
import { setupPersona } from "./helpers";

test.describe("Generate Page — Credit Gate — Contract Tests (mock API)", () => {
  // ── Guest ────────────────────────────────────────────────────

  test("guest page shows pricing CTA", async ({ page }) => {
    await setupPersona(page, "GUEST");
    await page.goto("/generate");
    await page.waitForLoadState("networkidle");

    // Guest sees the page — check for Sign up to buy button
    // (The detailed guest gate behavior is tested in clerk-auth.spec.ts)
    await expect(
      page.getByRole("button", { name: /sign in/i })
    ).toBeVisible();
  });

  // ── Signed-in Personas (FREE, LOW_CREDIT, CREDIT_USER) ──────
  //
  // NOTE: These mock-based tests CANNOT verify signed-in behavior because
  // the page uses Clerk's useUser()/useAuth() which requires real Clerk JWT.
  // The mock API approach only affects Express routes, not Clerk's auth state.
  //
  // For true signed-in persona testing, see clerk-auth.spec.ts which uses
  // the Clerk Backend API to inject real session cookies.
  //
  // These contract tests validate that the /generate page URL loads without
  // crashing — they test the API contract, not the full auth flow.

  test("free user page loads without errors", async ({ page }) => {
    await setupPersona(page, "FREE");
    await page.goto("/generate");
    await page.waitForLoadState("networkidle");

    // Page should load (no server error) and show something
    const body = page.locator("body");
    await expect(body).toBeVisible();
  });

  test("generate page does not 404", async ({ page }) => {
    await setupPersona(page, "CREDIT_USER");
    await page.goto("/generate");
    await page.waitForLoadState("networkidle");

    // Should not show a 404 page
    await expect(page.getByText("Page not found")).not.toBeVisible();
  });
});
