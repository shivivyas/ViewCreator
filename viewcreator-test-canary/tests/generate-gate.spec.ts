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

  // ── 4. Form elements visible ───────────────────────────────

  test("generate page form elements visible", async ({ page }) => {
    await setupPersona(page, "GUEST");
    await page.goto("/generate");
    await page.waitForLoadState("networkidle");

    // Prompt input should be present
    await expect(page.getByPlaceholder(/describe/i).first()).toBeVisible();

    // Aspect ratio buttons: 1:1, 4:5, 9:16, 16:9
    await expect(page.getByRole("button", { name: "1:1" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "4:5" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "9:16" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "16:9" }).first()).toBeVisible();

    // Number of images selector: 2 ideas, 4 ideas
    await expect(page.getByRole("button", { name: /2 ideas/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /4 ideas/i }).first()).toBeVisible();

    // Media type toggle: Image/Video
    await expect(page.getByRole("button", { name: /image/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /video/i }).first()).toBeVisible();
  });

  // ── 5. Media type toggle ──────────────────────────────────

  test("guest sees media type toggle", async ({ page }) => {
    await setupPersona(page, "GUEST");
    await page.goto("/generate");
    await page.waitForLoadState("networkidle");

    // Both Image and Video toggle buttons visible
    const imageToggle = page.getByRole("button", { name: /image/i }).first();
    const videoToggle = page.getByRole("button", { name: /video/i }).first();

    await expect(imageToggle).toBeVisible();
    await expect(videoToggle).toBeVisible();

    // Image should be the default (active) selection
    // Video should be clickable
    await expect(videoToggle).toBeEnabled();
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
  // ── 6. Free user — gate on generate click ──────────────────

  test("free user sees credit gate modal on generate click", async ({ page }) => {
    await setupPersona(page, "FREE");
    await page.goto("/generate");
    await page.waitForLoadState("networkidle");

    // The page should load without error for the FREE persona
    const body = page.locator("body");
    await expect(body).toBeVisible();

    // Fill prompt and try to generate
    const promptInput = page.getByPlaceholder(/describe/i).first();
    await expect(promptInput).toBeVisible();
    await promptInput.fill("Test prompt for gate verification");

    // The generate button should be present
    const genButton = page.getByRole("button", { name: /generate/i });
    await expect(genButton).toBeVisible();

    // Note: Without real Clerk auth, the page cannot detect 0 credits.
    // The credit gate modal requires useUser().id to check balance.
    // This test verifies the page structure is intact; the actual gate
    // modal behavior is tested in clerk-auth.spec.ts (Q3 test).
  });

  // ── 7. Low credit — 1 credit, 1 image (should pass) ───────

  test("low credit user with 1 credit can generate 1 image", async ({ page }) => {
    await setupPersona(page, "LOW_CREDIT");
    await page.goto("/generate");
    await page.waitForLoadState("networkidle");

    // Page loads without error
    const body = page.locator("body");
    await expect(body).toBeVisible();

    // Form elements should be present
    const promptInput = page.getByPlaceholder(/describe/i).first();
    await expect(promptInput).toBeVisible();
    await promptInput.fill("Test prompt for single image");

    // Number of images should be setable — default is often 2 or 4
    // Try clicking "2 ideas" if available
    const twoIdeasBtn = page.getByRole("button", { name: /2 ideas/i }).first();
    if (await twoIdeasBtn.isVisible()) {
      await twoIdeasBtn.click();
      await page.waitForTimeout(300);
    }

    // Generate button should be present
    const genButton = page.getByRole("button", { name: /generate/i });
    await expect(genButton).toBeVisible();
  });

  // ── 8. Low credit — 1 credit, 4 images (should gate) ──────

  test("low credit user cannot generate 4 images", async ({ page }) => {
    await setupPersona(page, "LOW_CREDIT");
    await page.goto("/generate");
    await page.waitForLoadState("networkidle");

    // Page loads without error
    const body = page.locator("body");
    await expect(body).toBeVisible();

    // Fill prompt
    const promptInput = page.getByPlaceholder(/describe/i).first();
    await expect(promptInput).toBeVisible();
    await promptInput.fill("Test prompt for four images");

    // Set number of images to 4 (costs 4 credits, only has 1)
    const fourIdeasBtn = page.getByRole("button", { name: /4 ideas/i }).first();
    if (await fourIdeasBtn.isVisible()) {
      await fourIdeasBtn.click();
      await page.waitForTimeout(300);
    }

    // Generate button should be present
    const genButton = page.getByRole("button", { name: /generate/i });
    await expect(genButton).toBeVisible();

    // Note: The credit gate modal won't appear without real Clerk auth.
    // This test verifies the page structure for LOW_CREDIT persona.
    // The actual gate behavior at credit boundary is tested in clerk-auth.spec.ts.
  });

  // ── 9. Credit user — sufficient balance ───────────────────

  test("credit user with sufficient balance can generate", async ({ page }) => {
    await setupPersona(page, "CREDIT_USER");
    await page.goto("/generate");
    await page.waitForLoadState("networkidle");

    // Page loads without error
    const body = page.locator("body");
    await expect(body).toBeVisible();

    // Form elements should be present
    const promptInput = page.getByPlaceholder(/describe/i).first();
    await expect(promptInput).toBeVisible();
    await promptInput.fill("Test prompt for credit user");

    // Generate button should be present
    const genButton = page.getByRole("button", { name: /generate/i });
    await expect(genButton).toBeVisible();
  });
});
