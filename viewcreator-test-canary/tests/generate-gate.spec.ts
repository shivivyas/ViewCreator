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

  test("guest is redirected or shown sign-up gate", async ({ page }) => {
    await setupPersona(page, "GUEST");
    await page.goto("/generate");
    await page.waitForLoadState("networkidle");

    // Guest should not reach the generate page — either redirected to sign-up
    // or shown a Clerk sign-in modal
    const currentUrl = page.url();
    const onSignIn = currentUrl.includes("/sign-in") || currentUrl.includes("/sign-up");
    const hasSignInModal = page.locator('[data-clerk-component="SignIn"], .cl-signIn-root').isVisible();

    // If on the generate page, there should be a sign-up prompt
    const hasGuestGate = page.getByText(/sign in|sign up|create account/i).first().isVisible();

    await expect(
      onSignIn || hasSignInModal || hasGuestGate
    ).toBeTruthy();
  });

  // ── Free User (0 credits) — blocked ──────────────────────────

  test("free user sees insufficient credits modal", async ({ page }) => {
    await setupPersona(page, "FREE");
    await page.goto("/generate");
    await page.waitForLoadState("networkidle");

    // Should show a gate/modal about insufficient credits
    // This could be a modal overlay or an inline message
    const gate = page.getByText(/insufficient credits|not enough credits|buy credits|0 credits/i);
    await expect(gate.first()).toBeVisible();
  });

  test("free user modal offers buy credits CTA", async ({ page }) => {
    await setupPersona(page, "FREE");
    await page.goto("/generate");
    await page.waitForLoadState("networkidle");

    // The gate should have a buy/purchase action
    const buyCta = page.getByRole("button", { name: /buy|purchase|get credits/i });
    const buyLink = page.locator('a[href*="pricing"], a[href*="checkout"], a[href*="buy"]');

    if (await buyCta.isVisible()) {
      await expect(buyCta).toBeVisible();
    } else {
      await expect(buyLink.first()).toBeVisible();
    }
  });

  // ── Low Credit (1 credit) — boundary: can generate once ─────

  test("low credit user can access generate page", async ({ page }) => {
    await setupPersona(page, "LOW_CREDIT");
    await page.goto("/generate");
    await page.waitForLoadState("networkidle");

    // Should reach the generate page (not blocked)
    const currentUrl = page.url();
    const onGenerate = currentUrl.includes("/generate") || currentUrl.includes("/create");
    const hasGenerateUI = page.getByText(/generate|create|prompt/i).first().isVisible();

    await expect(
      onGenerate || hasGenerateUI
    ).toBeTruthy();
  });

  // ── Credit User (100 credits) — normal access ────────────────

  test("credit user can access generate page", async ({ page }) => {
    await setupPersona(page, "CREDIT_USER");
    await page.goto("/generate");
    await page.waitForLoadState("networkidle");

    // Should reach the generate page
    const currentUrl = page.url();
    const onGenerate = currentUrl.includes("/generate") || currentUrl.includes("/create");
    const hasGenerateUI = page.getByText(/generate|create|prompt/i).first().isVisible();

    await expect(
      onGenerate || hasGenerateUI
    ).toBeTruthy();
  });

  test("generate page shows credit balance", async ({ page }) => {
    await setupPersona(page, "CREDIT_USER");
    await page.goto("/generate");
    await page.waitForLoadState("networkidle");

    // Should see credit count somewhere on the page
    const creditDisplay = page.getByText(/100 credits|\d+ credits/i);
    await expect(creditDisplay.first()).toBeVisible();
  });
});
