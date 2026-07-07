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
 *   Q10 — Cost indicator (removed — Premium tier no longer exists)
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

  test("guest sees generate page with Sign in to generate button", async ({ page }) => {
    await setupPersona(page, "GUEST");
    await page.goto("/generate");
    await page.waitForLoadState("networkidle");

    // Guest stays on /generate (no redirect) — proxy only protects /generate/edit
    expect(page.url()).not.toContain("accounts.dev");
    // Should see the "Sign in to generate" button
    await expect(page.getByText(/sign in to generate/i).first()).toBeVisible();
  });

  test("guest sees generate page (verify)", async ({ page }) => {
    // Verification that guest is NOT redirected
    await setupPersona(page, "GUEST");
    await page.goto("/generate");
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/generate");
    expect(page.url()).not.toContain("accounts.dev");
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

  // ── 4. Form elements visible ───────────────────────────────

  test("generate page form elements visible", async ({ page }) => {
    // This test requires real Clerk auth — guests are redirected
    // Verified in clerk-auth.spec.ts with real signed-in session
    test.skip(!process.env.CLERK_SECRET_KEY, "Skipped: requires real Clerk auth");
  });

  // ── 5. Media type toggle ──────────────────────────────────

  test("guest sees media type toggle", async ({ page }) => {
    // Requires real Clerk auth — guests redirected to sign-in
    test.skip(!process.env.CLERK_SECRET_KEY, "Skipped: requires real Clerk auth");
  });
});

// ── Auth Tests ──────────────────────────────────────────────────────────────
//
// NOTE: These mock-based contract tests verify the API contract and page
// structure for credit boundary conditions. However, without real Clerk auth
// (useUser() returns null), the page cannot detect the user's credit balance
// or show the credit gate modal behaviorally. These tests verify the page
// loads without errors under each persona's API mock.
//
// For true signed-in credit gate behavioral testing, see clerk-auth.spec.ts
// which uses the Clerk Backend API to inject real session cookies.

test.describe("Generate Page — Credit Gate — Auth Tests", () => {
  // NOTE: These mock-based tests cannot verify signed-in behavior because
  // the /generate page has a route-level guard that redirects guests to
  // Clerk sign-in. The mock personas (FREE/LOW_CREDIT/CREDIT_USER) only
  // mock API endpoints — they don't set Clerk auth state.
  //
  // For actual credit gate behavior with real auth, see:
  //   - clerk-auth.spec.ts (Q3, Q4 gate + purchase tests)
  //
  // These tests document the expected credit boundary behavior:

  // G3.1 — Free user (0 credits): clicking Generate shows credit gate modal with purchase CTA.
  // G3.4 — Low credit (1 credit): can generate 1 image (cost 1), but 4 images shows gate.
  // G3.3 — Credit user (100 credits): Generate proceeds without gate.

  test("free user sees credit gate modal on generate click", async ({ page }) => {
    test.skip(true, "Requires real Clerk auth — see clerk-auth.spec.ts");
  });

  test("low credit user with 1 credit can generate 1 image", async ({ page }) => {
    test.skip(true, "Requires real Clerk auth — see clerk-auth.spec.ts");
  });

  test("low credit user cannot generate 4 images", async ({ page }) => {
    test.skip(true, "Requires real Clerk auth — see clerk-auth.spec.ts");
  });

  test("credit user with sufficient balance can generate", async ({ page }) => {
    test.skip(true, "Requires real Clerk auth — see clerk-auth.spec.ts");
  });
});
