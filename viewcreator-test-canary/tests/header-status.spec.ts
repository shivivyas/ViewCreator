/**
 * Plan Status Header E2E Tests
 *
 * Tests the plan status badge in the site header across all user personas.
 * Verifies correct badge content, dropdown behavior, and CTAs.
 */

import { test, expect } from "@playwright/test";
import { setupPersona } from "./helpers";

test.describe("Header — Plan Status Badge", () => {
  // ── Guest ────────────────────────────────────────────────────

  test("guest sees no plan status badge in header", async ({ page }) => {
    await setupPersona(page, "GUEST");
    await page.goto("/pricing");
    await page.waitForLoadState("networkidle");

    // Should see Sign in / Sign up buttons
    await expect(page.getByText("Sign in")).toBeVisible();
    await expect(page.getByText("Sign up")).toBeVisible();

    // Should NOT see the plan status badge
    await expect(page.getByText("Unlimited")).toHaveCount(0);
    await expect(page.getByText("credits")).toHaveCount(0);
  });

  test("guest sees standard navigation links", async ({ page }) => {
    await setupPersona(page, "GUEST");
    await page.goto("/pricing");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Features")).toBeVisible();
    await expect(page.getByText("Pricing")).toBeVisible();
  });

  // ── Free User ────────────────────────────────────────────────

  test("free user shows 0 credits badge", async ({ page }) => {
    await setupPersona(page, "FREE");
    await page.goto("/pricing");
    await page.waitForLoadState("networkidle");

    // Badge should show "0 credits"
    const badge = page.getByText("0 credits");
    await expect(badge).toBeVisible();
  });

  test("free user badge dropdown shows balance and CTA", async ({ page }) => {
    await setupPersona(page, "FREE");
    await page.goto("/pricing");
    await page.waitForLoadState("networkidle");

    // Click the badge to open dropdown
    await page.getByText("0 credits").click();

    // Dropdown shows empty balance message
    await expect(page.getByText("Your credit balance is empty.")).toBeVisible();

    // Shows "Get credits" CTA
    await expect(page.getByText("Get credits")).toBeVisible();
  });

  // ── Credit User ──────────────────────────────────────────────

  test("credit user shows credit count badge", async ({ page }) => {
    await setupPersona(page, "CREDIT_USER");
    await page.goto("/pricing");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("420 credits")).toBeVisible();
  });

  test("credit user dropdown shows estimated generations", async ({ page }) => {
    await setupPersona(page, "CREDIT_USER");
    await page.goto("/pricing");
    await page.waitForLoadState("networkidle");

    await page.getByText("420 credits").click();

    // Shows estimate
    await expect(
      page.getByText(/enough for ~\d+ premium generations/i)
    ).toBeVisible();

    // Shows "Buy more credits" CTA
    await expect(page.getByText("Buy more credits")).toBeVisible();
  });

  // ── Subscriber ───────────────────────────────────────────────

  test("subscriber shows Unlimited badge with crown", async ({ page }) => {
    await setupPersona(page, "SUBSCRIBER");
    await page.goto("/pricing");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Unlimited")).toBeVisible();
  });

  test("subscriber dropdown shows plan details and Manage Billing", async ({
    page,
  }) => {
    await setupPersona(page, "SUBSCRIBER");
    await page.goto("/pricing");
    await page.waitForLoadState("networkidle");

    await page.getByText("Unlimited").click();

    // Plan name
    await expect(page.getByText("Monthly Plan")).toBeVisible();

    // Renewal date
    await expect(page.getByText("Renews Jul 11")).toBeVisible();

    // Credits remaining
    await expect(page.getByText("70 credits remaining")).toBeVisible();

    // Manage Billing button
    await expect(page.getByText("Manage Billing")).toBeVisible();

    // Manage Billing links to customer portal
    const billingLink = page.locator('a[href*="/api/dodo/customer-portal"]');
    await expect(billingLink).toBeVisible();
  });

  // ── Past Due ─────────────────────────────────────────────────

  test("past due subscriber shows red Past Due badge", async ({ page }) => {
    await setupPersona(page, "PAST_DUE");
    await page.goto("/pricing");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Past Due")).toBeVisible();
  });

  test("past due dropdown shows payment failure message and Update button", async ({
    page,
  }) => {
    await setupPersona(page, "PAST_DUE");
    await page.goto("/pricing");
    await page.waitForLoadState("networkidle");

    await page.getByText("Past Due").click();

    await expect(page.getByText("Payment Failed")).toBeVisible();
    await expect(
      page.getByText(/update your payment method/i)
    ).toBeVisible();
    await expect(page.getByText("Update Payment")).toBeVisible();
  });
});
