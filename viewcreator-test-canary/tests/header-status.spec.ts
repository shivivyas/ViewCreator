/**
 * Credit Balance Header E2E Tests
 *
 * Tests the credit balance badge in the site header across all user personas.
 * Verifies correct badge content, dropdown behavior, and CTAs.
 *
 * Behavioral decisions (from Lavish spec):
 *   Q16 — Free user header shows "0 credits — Buy" (both balance + CTA)
 *          (CURRENT: shows "[⚡ Buy Credits]" button only)
 *   Q17 — Credit user badge click opens dropdown with balance breakdown + "Buy more"
 *          (CURRENT: badge links to /pricing)
 *
 * NOTE: Signed-in header behaviors require real Clerk auth context.
 * Full signed-in badge tests are in clerk-auth.spec.ts.
 */

import { test, expect } from "@playwright/test";
import { setupPersona } from "./helpers";

test.describe("Header — Credit Balance Badge — Contract Tests (mock API)", () => {
  // ── Guest ────────────────────────────────────────────────────

  test("guest sees sign in and sign up buttons", async ({ page }) => {
    await setupPersona(page, "GUEST");
    await page.goto("/pricing");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    // "Sign up" is the auth button, "Sign up to buy" is the pricing CTA - use exact match
    await expect(
      page.getByRole("button", { name: "Sign up", exact: true })
    ).toBeVisible();
  });

  test("guest does not see credit badge", async ({ page }) => {
    await setupPersona(page, "GUEST");
    await page.goto("/pricing");
    await page.waitForLoadState("networkidle");

    // Credit badge would show in header/banner area, not in pricing card text
    const headerRegion = page.locator("header, nav, [role='banner']");
    const creditInHeader = headerRegion.locator("text=/\\d+ credits/i");
    await expect(creditInHeader).toHaveCount(0);
  });

  // ── Free User (0 credits) ────────────────────────────────────
  //
  // Q16 (target): Header shows "0 credits — Buy" with link to /pricing.
  // Q16 (current): Header shows "[⚡ Buy Credits]" button.
  // Full Q16 test with real Clerk auth is in clerk-auth.spec.ts.
  //
  // These mock-based tests verify the page renders without crashing.

  test("free user sees navigation links", async ({ page }) => {
    await setupPersona(page, "FREE");
    await page.goto("/pricing");
    await page.waitForLoadState("networkidle");

    // Free user should see standard nav
    await expect(page.getByRole("link", { name: /viewcreator/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("free user sees pricing page content", async ({ page }) => {
    await setupPersona(page, "FREE");
    await page.goto("/pricing");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "Pay once. Create forever." })
    ).toBeVisible();
    await expect(page.getByText("100 Credits").first()).toBeVisible();
  });

  // ── Credit User (has credits) ────────────────────────────────
  //
  // Q17 (target): Clicking badge opens dropdown with balance breakdown + "Buy more".
  // Q17 (current): Badge links to /pricing.
  // Full Q17 test with real Clerk auth is in clerk-auth.spec.ts.

  test("credit user sees pricing page", async ({ page }) => {
    await setupPersona(page, "CREDIT_USER");
    await page.goto("/pricing");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "Pay once. Create forever." })
    ).toBeVisible();
  });
});
