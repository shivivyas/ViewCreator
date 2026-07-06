/**
 * Generate Page Gate E2E Tests
 *
 * Tests access control to the /generate page based on auth state and credit balance.
 * The gate should block guests (→ sign-up) and free users (0 credits → buy modal),
 * while allowing users with credits to proceed.
 *
 * Behavioral decisions (from Lavish spec):
 *   Q2  — Guest sees full form UI but Generate button is disabled "Sign in to generate"
 *          (CURRENT: button is identical, clicking it opens Clerk sign-up modal)
 *   Q3  — 0-credit users see the form, gate triggers on Generate click
 *   Q8  — Exhaustion: modal appears instantly when balance hits 0
 *   Q10 — Cost indicator shown next to Premium toggle ("2 credits")
 *
 * Credit boundaries: 0 (blocked), 1 (allowed), 100 (allowed)
 */

import { test, expect } from "@playwright/test";
import { setupPersona } from "./helpers";

test.describe("Generate Page — Credit Gate — Contract Tests (mock API)", () => {
  // ── Guest ────────────────────────────────────────────────────
  //
  // Q2: Guest sees the generate form UI with a disabled "Sign in to generate"
  // button. The button uses aria-disabled for visual state while remaining
  // clickable so handleGenerate can call openSignUp().
  // proxy.ts no longer protects /generate (only /generate/edit).
  // Clerk's openSignUp() is the secondary defense in handleGenerate.

  test("guest sees disabled Sign in to generate button", async ({ page }) => {
    await setupPersona(page, "GUEST");
    await page.goto("/generate");
    await page.waitForLoadState("networkidle");

    // Guest should reach the generate page (not redirected to Clerk sign-in)
    const currentUrl = page.url();
    expect(currentUrl).toContain("/generate");
    expect(currentUrl).not.toContain("accounts.dev");

    // The button should say "Sign in to generate" and be aria-disabled
    const genButton = page.getByRole("button", { name: /sign in to generate/i });
    await expect(genButton).toBeVisible();
    // aria-disabled="true" makes Playwright's toBeDisabled() return true
    await expect(genButton).toBeDisabled();
  });

  test("guest can still see the generate form UI", async ({ page }) => {
    await setupPersona(page, "GUEST");
    await page.goto("/generate");
    await page.waitForLoadState("networkidle");

    // Guest should see the full form — prompt input, options, etc.
    await expect(page.getByPlaceholder(/describe/i).first()).toBeVisible();
    // And the "Sign in to generate" button
    await expect(
      page.getByRole("button", { name: /sign in to generate/i })
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
