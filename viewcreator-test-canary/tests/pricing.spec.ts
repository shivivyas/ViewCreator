/**
 * Pricing Page E2E Tests
 *
 * Tests the pricing page across all user personas.
 * Verifies correct plan display, CTA buttons, and checkout flow.
 */

import { test, expect } from "@playwright/test";
import { setupPersona } from "./helpers";

test.describe("Pricing Page", () => {
  test.beforeEach(async ({ page }) => {
    await setupPersona(page, "GUEST");
    await page.goto("/pricing");
    await page.waitForLoadState("networkidle");
  });

  // ── All Personas ────────────────────────────────────────────

  test("renders the pricing page title", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "One plan. Everything you need." })
    ).toBeVisible();
  });

  test("renders the Monthly plan card", async ({ page }) => {
    await expect(page.getByText("Monthly")).toBeVisible();
    await expect(page.getByText("$29")).toBeVisible();
    await expect(page.getByText("/month")).toBeVisible();
  });

  test('shows "Best Value" badge on the plan card', async ({ page }) => {
    await expect(page.getByText("Best Value")).toBeVisible();
  });

  test("shows the feature list", async ({ page }) => {
    await expect(
      page.getByText("Unlimited image & video generation")
    ).toBeVisible();
    await expect(page.getByText("All aspect ratios & sizes")).toBeVisible();
    await expect(page.getByText("Premium quality output")).toBeVisible();
  });

  test("renders the FAQ section", async ({ page }) => {
    await expect(
      page.getByText("Frequently asked questions")
    ).toBeVisible();
    await expect(
      page.getByText("What's included in the subscription?")
    ).toBeVisible();
    await expect(page.getByText("Can I cancel anytime?")).toBeVisible();
  });

  test("renders the bottom CTA section", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Ready to create?" })
    ).toBeVisible();
  });

  // ── Guest Persona ────────────────────────────────────────────

  test("guest sees Subscribe button linking to sign-up", async ({ page }) => {
    const subscribeButton = page.getByRole("button", {
      name: "Subscribe Monthly",
    });
    await expect(subscribeButton).toBeVisible();

    // Check the parent link points to /sign-up
    const link = page.locator('a[href="/sign-up"]').filter({
      has: page.getByRole("button", { name: "Subscribe Monthly" }),
    });
    await expect(link).toBeVisible();
  });

  test("guest sees Get started CTA linking to sign-up", async ({ page }) => {
    await expect(page.getByText("Get started")).toBeVisible();
    await expect(page.locator('a[href="/sign-up"]')).toHaveCount(2);
  });

  // ── Free User Persona ────────────────────────────────────────

  test("free user sees Subscribe Monthly as a real button (not sign-up link)", async ({
    page,
  }) => {
    await setupPersona(page, "FREE");
    await page.reload();
    await page.waitForLoadState("networkidle");

    const subscribeButton = page.getByRole("button", {
      name: "Subscribe Monthly",
    });
    await expect(subscribeButton).toBeVisible();

    // Should not be wrapped in a sign-up link
    const signUpLinks = page.locator('a[href="/sign-up"]');
    await expect(signUpLinks).toHaveCount(0);
  });

  // ── Subscriber Persona ───────────────────────────────────────

  test("subscriber still sees the Monthly plan card", async ({ page }) => {
    await setupPersona(page, "SUBSCRIBER");
    await page.reload();
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Monthly")).toBeVisible();
    await expect(page.getByText("$29")).toBeVisible();
  });
});
