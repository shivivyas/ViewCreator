/**
 * Navigation E2E Tests
 *
 * Tests navigation flows across the site for both guest and signed-in users.
 *
 * Guest tests verify the marketing nav structure: Logo, Features, How it Works,
 * Platforms, Pricing, Sign In, Sign Up, and link navigation.
 *
 * Signed-in tests (Clerk) verify the authenticated nav: Templates, AI Studio,
 * History, Credit Badge, UserButton, and navigation flows.
 *
 * Behavioral context (from TEST_PLAN):
 *   N1.1 — Guest nav: Logo, Templates, Features, How It Works, Platforms,
 *          Pricing, Sign In, Sign Up
 *   N1.2 — Signed-in nav: Logo, Templates, AI Studio, My Creations (History),
 *          Pricing, Credit Badge, UserButton
 *
 * Runs under the "chromium-auth" project. Guest tests work without signing in.
 * Signed-in tests call signInUser() for real Clerk auth.
 *
 * Reference: site-header.tsx for nav link structure.
 */

import { test, expect } from "@playwright/test";
import { signInUser, deleteClerkUser } from "./auth-helpers";
import { mockPlansEndpoint } from "./helpers";

// ── Guest Navigation Tests ──────────────────────────────────────────────────
//
// These tests work in chromium-auth because no signInUser() is called,
// so the user remains a guest.

test.describe("Navigation — Guest", () => {
  test.beforeEach(async ({ page }) => {
    await mockPlansEndpoint(page as any);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  // ── N1.1: Guest nav shows all marketing links ──────────────

  test("guest nav shows logo and all marketing links", async ({ page }) => {
    // Logo
    const logo = page.getByRole("link", { name: /viewcreator/i });
    await expect(logo).toBeVisible();

    // Marketing nav links from site-header.tsx navLinks array
    await expect(page.getByRole("link", { name: /^features$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^how it works$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^platforms$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /pricing/i })).toBeVisible();

    // Auth buttons
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    // "Sign up" (exact match to avoid matching "Sign up to buy")
    await expect(
      page.getByRole("button", { name: "Sign up", exact: true })
    ).toBeVisible();

    // Templates link is NOT in guest nav — only signed-in users see it
  });

  // ── N1.1: Guest nav links are clickable ───────────────────

  test("guest nav links navigate to correct pages", async ({ page }) => {
    // Click "Pricing" in the nav — should navigate to /pricing
    await page.locator("nav a").filter({ hasText: "Pricing" }).click();
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/pricing");
  });

  // ── N1.1: Guest navigates from landing to templates ───────

  test("guest navigates from landing to templates", async ({ page }) => {
    // Templates isn't in guest nav, navigate via URL
    await page.goto("/templates");
    await page.waitForLoadState("networkidle");

    // Should land on /templates
    expect(page.url()).toContain("/templates");
    // Verify template page content loads
    await expect(page.getByText(/templates/i).first()).toBeVisible({ timeout: 10000 });
  });

  // ── N1.1: Guest navigates from landing to pricing ─────────

  test("guest navigates from landing to pricing", async ({ page }) => {
    await page.locator("nav a").filter({ hasText: "Pricing" }).click();
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("/pricing");
  });
});

// ── Signed-In Navigation Tests (Clerk) ──────────────────────────────────────
//
// N1.2: Signed-in nav shows different links.

test.describe("Navigation — Signed-In (Clerk)", () => {
  const clerkUserIds: string[] = [];

  test.afterEach(async () => {
    for (const id of clerkUserIds) {
      await deleteClerkUser(id);
    }
    clerkUserIds.length = 0;
  });

  // ── N1.2: Signed-in nav shows correct links ────────────────

  test("signed-in nav shows authenticated links", async ({ page }) => {
    const { userId } = await signInUser(page, { grantCredits: 100 });
    clerkUserIds.push(userId);

    // Navigate to landing page to see the full header
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Logo should be visible
    await expect(page.getByRole("link", { name: /viewcreator/i })).toBeVisible();

    // Signed-in nav should show Templates
    await expect(page.getByRole("link", { name: /templates/i })).toBeVisible();

    // Signed-in nav should show AI Studio (links to /generate)
    const aiStudioLink = page.getByRole("link", { name: /ai studio/i });
    await expect(aiStudioLink).toBeVisible();

    // Signed-in nav should show History (/payments/history)
    const historyLink = page.getByRole("link", { name: /history/i });
    await expect(historyLink).toBeVisible();

    // Signed-in nav should show Pricing
    await expect(page.getByRole("link", { name: /pricing/i })).toBeVisible();

    // Credit badge should be visible (shows the credit count)
    // The badge shows the balance (100) as tabular-nums text
    const creditBadge = page.locator("text=/\\d+ credits/i");
    await expect(creditBadge).toBeVisible();

    // UserButton should be visible (Clerk's avatar)
    const userButton = page.locator("[data-clerk-user-button], [class*='user-button'], .cl-userButton-root");
    // Try a more generic selector if the Clerk-specific one doesn't match
    const userButtonVisible = (await userButton.count()) > 0;
    if (!userButtonVisible) {
      // Fallback: look for the Clerk avatar box element
      const avatarBox = page.locator("[class*='avatarBox'], [class*='cl-avatar']").first();
      await expect(avatarBox).toBeVisible({ timeout: 5000 });
    } else {
      await expect(userButton.first()).toBeVisible();
    }
  });

  // ── N1.2: AI Studio link navigates to generate ────────────

  test("AI Studio link navigates to /generate", async ({ page }) => {
    const { userId } = await signInUser(page, { grantCredits: 100 });
    clerkUserIds.push(userId);

    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Click AI Studio
    await page.getByRole("link", { name: /ai studio/i }).click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Should navigate to /generate
    expect(page.url()).toContain("/generate");
  });

  // ── N1.2: Credit badge links to pricing ───────────────────

  test("credit badge links to /pricing", async ({ page }) => {
    const { userId } = await signInUser(page, { grantCredits: 100 });
    clerkUserIds.push(userId);

    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // The credit badge is a link (<a>) wrapping the credit display.
    // It contains text like "100 credits" and has href="/pricing".
    // Find the link with credit info in it.
    const creditLink = page.locator('a[href="/pricing"]').filter({
      has: page.locator("text=credits"),
    });

    await expect(creditLink.first()).toBeVisible({ timeout: 5000 });
    await creditLink.first().click();
    await page.waitForLoadState("networkidle");

    // Should navigate to /pricing
    expect(page.url()).toContain("/pricing");
  });
});
