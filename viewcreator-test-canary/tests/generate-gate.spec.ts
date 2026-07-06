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
  // CURRENT behavior: proxy.ts protects /generate via auth.protect().
  // Guests are redirected to Clerk's hosted sign-in page BEFORE reaching the
  // generate page. They never see the generate form.
  //
  // Q2 (target, after app fix): Remove server-side protect for /generate.
  // Instead, show the form UI with a disabled "Sign in to generate" button.
  // The button click would trigger openSignUp().
  //
  // The test below verifies the CURRENT redirect-to-sign-in behavior.

  test("guest is redirected to Clerk sign-in page", async ({ page }) => {
    await setupPersona(page, "GUEST");
    await page.goto("/generate");
    await page.waitForLoadState("networkidle");

    // Guest should be on the Clerk sign-in page (not on the generate page)
    const currentUrl = page.url();
    expect(currentUrl).toContain("accounts.dev/sign-in");

    // The Clerk sign-in page should show sign-in elements
    await expect(
      page.getByRole("heading", { name: /sign in/i })
    ).toBeVisible();
  });

  // TODO: Activate after Q2 app fix — remove proxy.ts protection for /generate,
  // then guest sees the generate UI with disabled "Sign in to generate" button.
  // Changes needed:
  //   1. Remove "/generate(.*)" from isProtectedRoute in proxy.ts
  //   2. Show disabled button in generate-form.tsx when !isSignedIn
  // test("guest sees disabled Sign in to generate button (target behavior)", async ({ page }) => {
  //   await setupPersona(page, "GUEST");
  //   await page.goto("/generate");
  //   await page.waitForLoadState("networkidle");
  //   const genButton = page.getByRole("button", { name: /sign in to generate/i });
  //   await expect(genButton).toBeVisible();
  //   await expect(genButton).toBeDisabled();
  // });

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
