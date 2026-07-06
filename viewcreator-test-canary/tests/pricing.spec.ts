/**
 * Pricing Page E2E Tests
 *
 * Tests the credit-only pricing page across all user personas.
 * Verifies credit pack display, CTA buttons, and checkout flow.
 *
 * Behavioral decisions (from Lavish spec):
 *   Q1  — "Sign up to buy" opens Clerk modal + navigates to /sign-up
 *   Q5  — Dodo checkout opens in same tab
 *   Q11 — Signed-in users see "Buy more credits" + current balance (tested in clerk-auth)
 */

import { test, expect } from "@playwright/test";
import { setupPersona } from "./helpers";

test.describe("Pricing Page — Contract Tests (mock API)", () => {
  test.beforeEach(async ({ page }) => {
    await setupPersona(page, "GUEST");
    await page.goto("/pricing");
    await page.waitForLoadState("networkidle");
  });

  // ── All Personas ────────────────────────────────────────────

  test("renders the pricing page heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Pay once. Create forever." })
    ).toBeVisible();
  });

  test("renders the credit plan card", async ({ page }) => {
    // "100 Credits" is in a <div>, not a heading — use .first() for strict mode
    await expect(page.getByText("100 Credits").first()).toBeVisible();
    // "$9" appears in the card — use first match
    await expect(page.getByText("$9").first()).toBeVisible();
  });

  test("shows the credit feature list", async ({ page }) => {
    await expect(
      page.getByText("Generate up to 100 images or 20 videos")
    ).toBeVisible();
    await expect(page.getByText("All aspect ratios & sizes")).toBeVisible();
    await expect(page.getByText("Never expires")).toBeVisible();
  });

  test("renders the FAQ section", async ({ page }) => {
    await expect(
      page.getByText("Frequently asked questions")
    ).toBeVisible();
    await expect(
      page.getByText("How do credits work?")
    ).toBeVisible();
    await expect(
      page.getByText("What if I need more credits?")
    ).toBeVisible();
  });

  test("renders the bottom CTA section", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Ready to create?" })
    ).toBeVisible();
  });

  // ── Guest Persona ────────────────────────────────────────────
  // Q1: "Sign up to buy" opens Clerk sign-up modal + navigates to /sign-up.
  // The button is wrapped in Clerk's <SignUpButton mode="modal">. 
  // Click behavior requires Clerk auth context — tested in clerk-auth.spec.ts.

  test("guest sees Sign up to buy button", async ({ page }) => {
    const buyButton = page.getByRole("button", { name: /sign up to buy/i });
    await expect(buyButton).toBeVisible();
  });

  test("guest sees Get started CTA", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Get started" })).toBeVisible();
  });

  // ── Free User Persona (0 credits) ───────────────────────────

  test("free user sees pricing page with mocked API", async ({ page }) => {
    await setupPersona(page, "FREE");
    await page.goto("/pricing");
    await page.waitForLoadState("networkidle");

    // Page loads without error for signed-in user with 0 credits
    await expect(page.getByText("100 Credits").first()).toBeVisible();
  });

  // ── Credit User Persona (has credits) ───────────────────────

  test("credit user sees pricing page with mocked API", async ({ page }) => {
    await setupPersona(page, "CREDIT_USER");
    await page.goto("/pricing");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "Pay once. Create forever." })
    ).toBeVisible();
  });
});
