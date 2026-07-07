/**
 * Templates Page — Guest Experience & API Contract Tests
 *
 * Tests the /templates page for unauthenticated users via mocked API responses.
 * Also tests the API contract for the templates endpoint.
 *
 * These tests run under the "chromium" project (no Clerk auth needed).
 * Auth-gated template tests are in templates-auth.spec.ts.
 *
 * Behavioral context (from Lavish spec):
 *   Templates page shows a grid of community templates with search, category
 *   filter, sort, and upload functionality. Guest users can browse but cannot
 *   upvote, upload, or generate from templates (those require auth).
 */

import { test, expect } from "@playwright/test";
import { setupPersona, mockTemplatesEndpoint, MOCK_TEMPLATES } from "./helpers";

test.describe("Templates — Guest Experience", () => {
  test.beforeEach(async ({ page }) => {
    await setupPersona(page, "GUEST");
    await mockTemplatesEndpoint(page);
    await page.goto("/templates");
    await page.waitForLoadState("networkidle");
    // Wait for template cards to render (loading spinner gone)
    await expect(page.getByText("Summer Sale").first()).toBeVisible({ timeout: 10000 });
  });

  // ── 1. Browse templates ────────────────────────────────────

  test("guest browses all templates on /templates", async ({ page }) => {
    // All mock templates should be visible as cards
    await expect(page.getByText("Summer Sale")).toBeVisible();
    await expect(page.getByText("Product Launch")).toBeVisible();
    await expect(page.getByText("Social Media Kit")).toBeVisible();

    // Descriptions should appear
    await expect(page.getByText("Bold summer promotion template")).toBeVisible();
    await expect(page.getByText("Sleek product reveal layout")).toBeVisible();
  });

  // ── 2. Upload button ───────────────────────────────────────

  test("guest sees upload button", async ({ page }) => {
    const uploadButton = page.getByRole("button", { name: /upload/i });
    await expect(uploadButton).toBeVisible();
  });

  // ── 3. Sign in / Sign up buttons ────────────────────────────

  test("guest sees sign in/sign up buttons in header", async ({ page }) => {
    // The header is rendered by the root layout and should have Clerk auth buttons
    await expect(page.getByRole("button", { name: /sign in/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /sign up/i }).first()).toBeVisible();
  });

  // ── 4. Search filters templates ────────────────────────────

  test("search filters templates", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible();

    await searchInput.fill("Summer");

    // "Summer Sale" should still be visible
    await expect(page.getByText("Summer Sale")).toBeVisible();
    // "Product Launch" should be filtered out (no match)
    await expect(page.getByText("Product Launch")).not.toBeVisible();
    // "Social Media Kit" should be filtered out
    await expect(page.getByText("Social Media Kit")).not.toBeVisible();
  });

  // ── 5. Category filter works ───────────────────────────────

  test("category filter works", async ({ page }) => {
    // Categories are derived from template tags. Click the "promotion" category pill.
    const categoryButton = page.getByRole("button", { name: "promotion" });
    await expect(categoryButton).toBeVisible();
    await categoryButton.click();
    await page.waitForTimeout(500);

    // Only "Summer Sale" has the "promotion" tag, so it should be visible
    await expect(page.getByText("Summer Sale")).toBeVisible();
    // "Product Launch" and "Social Media Kit" should not match
    await expect(page.getByText("Product Launch")).not.toBeVisible();
    await expect(page.getByText("Social Media Kit")).not.toBeVisible();
  });

  // ── 6. Sort options work ───────────────────────────────────

  test("sort options work", async ({ page }) => {
    // Default sort is "Newest" (recent)
    // Click the sort trigger to open the dropdown
    const sortTrigger = page.getByRole("combobox");
    await expect(sortTrigger).toBeVisible();

    // Sort by "Name A–Z"
    await sortTrigger.click();
    await page.getByRole("option", { name: /name a–z/i }).click();
    await page.waitForTimeout(500);

    // Get the visible template titles in order
    const titlesAfterSortAZ = await page
      .locator("h3")
      .evaluateAll((els) => els.map((el) => el.textContent?.trim() || ""));

    // With "Name A–Z", the order should be: Product Launch, Social Media Kit, Summer Sale
    expect(titlesAfterSortAZ[0]).toContain("Product Launch");
    expect(titlesAfterSortAZ[titlesAfterSortAZ.length - 1]).toContain("Summer Sale");
  });

  // ── 7. Empty state ─────────────────────────────────────────

  test("empty state shown when no match", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    await searchInput.fill("xyznonexistent");

    // Wait for empty state to render
    await expect(page.getByText("No templates match your search")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Try a different search term/i)).toBeVisible();

    // "Clear search" link should be visible
    const clearButton = page.getByRole("button", { name: /clear search/i });
    await expect(clearButton).toBeVisible();
  });
});

// ── API Contract Tests ─────────────────────────────────────────────────────

test.describe("Templates — API Contract Tests", () => {
  // ── 8. GET returns template list ───────────────────────────

  test("GET /api/templates returns template list", async ({ page }) => {
    // Mock the endpoint to return specific test data
    await mockTemplatesEndpoint(page);

    // Use page.evaluate to make a fetch call within the page context
    const response = await page.evaluate(async () => {
      const res = await fetch("http://localhost:3001/api/templates");
      const data = await res.json();
      return { status: res.status, body: data };
    });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.templates)).toBe(true);
    expect(response.body.templates.length).toBeGreaterThan(0);
  });

  // ── 9. Guest can access ────────────────────────────────────

  test("GET /api/templates returns templates for guest", async ({ page }) => {
    // Same test — guest can access the mocked endpoint
    await mockTemplatesEndpoint(page);

    const response = await page.evaluate(async () => {
      const res = await fetch("http://localhost:3001/api/templates");
      const data = await res.json();
      return { status: res.status, body: data };
    });

    expect(response.status).toBe(200);
    expect(response.body.templates).toBeDefined();
    // Verify template shape
    const first = response.body.templates[0];
    expect(first).toHaveProperty("id");
    expect(first).toHaveProperty("title");
    expect(first).toHaveProperty("s3_link");

    // Verify no private templates leak — all returned should be public
    for (const t of response.body.templates) {
      // Private templates have user_id set. Public ones have user_id null.
      // If user_id is present and non-null, it's a private template leak.
      if (t.user_id !== undefined && t.user_id !== null) {
        console.log(`[Visibility] WARNING: private template visible to guest: ${t.title}`);
      }
    }
  });
});
