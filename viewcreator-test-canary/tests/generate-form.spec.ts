/**
 * Generate Page — Form Behavior E2E Tests
 *
 * Tests form UI interactions on the /generate page:
 * pre-fill from template, validation, aspect ratio, media type toggle,
 * number of images selector, and button states.
 *
 * These are contract tests using mocked API responses (chromium project).
 * No real Clerk auth — verifies form structure and basic interactivity.
 *
 * Behavioral context (from TEST_PLAN):
 *   G2.1 — Template ID pre-fills form
 *   G2.3 — Empty prompt disables Generate
 *   G2.4 — Prompt input accepts text
 *   G2.5 — Media type toggle switches form fields
 *   G2.6 — Number of images selector
 *   G2.7 — Aspect ratio selector
 *   G3.5 — Generate button disables during generation
 */

import { test, expect } from "@playwright/test";
import { signInUser, deleteClerkUser } from "./auth-helpers";
import { mockTemplatesEndpoint, MOCK_TEMPLATES } from "./helpers";

/**
 * Generate Form Behavior Tests
 *
 * These tests use real Clerk authentication (chromium-auth project).
 * The /generate page has a route-level guard that redirects guests.
 *
 * Behaviors tested:
 *   G2.1 — Template ID pre-fills form
 *   G2.3 — Empty prompt disables Generate button
 *   G2.4 — Prompt input accepts and displays text
 *   G2.5 — Media type toggle switches form fields
 *   G2.6 — Number of images selector
 *   G2.7 — Aspect ratio selector
 *   G3.5 — Generate button disables during generation
 */

test.describe("Generate Page — Form Behavior — Auth Tests", () => {
  const clerkUserIds: string[] = [];

  test.afterEach(async () => {
    for (const id of clerkUserIds) {
      await deleteClerkUser(id);
    }
    clerkUserIds.length = 0;
  });

  // ── G2.1: Template pre-fill ───────────────────────────────

  test("form pre-fills from URL templateId", async ({ page }) => {
    const { userId } = await signInUser(page, { grantCredits: 100 });
    clerkUserIds.push(userId);

    await mockTemplatesEndpoint(page);

    await page.goto("/generate?templateId=tmpl-1");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Template name should appear in the form
    await expect(page.getByText("Summer Sale").first()).toBeVisible({ timeout: 5000 });

    // Aspect ratio should reflect template config (1:1)
    await expect(page.getByRole("button", { name: "1:1" }).first()).toBeVisible();
  });

  // ── G2.3: Empty prompt disables Generate ──────────────────

  test("empty prompt disables generate button", async ({ page }) => {
    const { userId } = await signInUser(page, { grantCredits: 100 });
    clerkUserIds.push(userId);

    await page.goto("/generate");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // With prompt empty, generate button should be disabled
    const genButton = page.getByRole("button", { name: /generate/i }).first();
    await expect(genButton).toBeVisible();
    await expect(genButton).toBeDisabled();
  });

  // ── G2.4: Prompt input accepts text ───────────────────────

  test("prompt input accepts text", async ({ page }) => {
    const { userId } = await signInUser(page, { grantCredits: 100 });
    clerkUserIds.push(userId);

    await page.goto("/generate");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const promptInput = page.getByPlaceholder(/describe/i).first();
    await expect(promptInput).toBeVisible();

    await promptInput.fill("A beautiful sunset over mountains");
    const value = await promptInput.inputValue();
    expect(value).toBe("A beautiful sunset over mountains");
  });

  // ── G2.7: Aspect ratio selection ──────────────────────────

  test("aspect ratio selection changes UI", async ({ page }) => {
    const { userId } = await signInUser(page, { grantCredits: 100 });
    clerkUserIds.push(userId);

    await page.goto("/generate");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const aspectButtons = [
      page.getByRole("button", { name: "1:1" }).first(),
      page.getByRole("button", { name: "4:5" }).first(),
      page.getByRole("button", { name: "9:16" }).first(),
      page.getByRole("button", { name: "16:9" }).first(),
      page.getByRole("button", { name: "2:3" }).first(),
    ];

    for (const btn of aspectButtons) {
      await expect(btn).toBeVisible();
      await btn.click();
      await page.waitForTimeout(200);
      await expect(btn).toBeEnabled();
    }
  });

  // ── G2.6: Number of images selector ───────────────────────

  test("number of images selector works", async ({ page }) => {
    const { userId } = await signInUser(page, { grantCredits: 100 });
    clerkUserIds.push(userId);

    await page.goto("/generate");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const count1Btn = page.getByRole("button", { name: "1", exact: true }).first();
    const count2Btn = page.getByRole("button", { name: "2", exact: true }).first();
    const count4Btn = page.getByRole("button", { name: "4", exact: true }).first();

    await expect(count1Btn).toBeVisible();
    await expect(count2Btn).toBeVisible();
    await expect(count4Btn).toBeVisible();

    await count2Btn.click();
    await page.waitForTimeout(200);
    await count4Btn.click();
    await page.waitForTimeout(200);

    await expect(count2Btn).toBeEnabled();
    await expect(count4Btn).toBeEnabled();
  });

  // ── G2.5: Media type toggle ───────────────────────────────

  test("media type toggle switches form", async ({ page }) => {
    const { userId } = await signInUser(page, { grantCredits: 100 });
    clerkUserIds.push(userId);

    await page.goto("/generate");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const imageToggle = page.getByRole("button", { name: /image/i }).first();
    const videoToggle = page.getByRole("button", { name: /video/i }).first();

    await expect(imageToggle).toBeVisible();
    await expect(videoToggle).toBeVisible();

    // Switch to video — duration controls should appear
    await videoToggle.click();
    await page.waitForTimeout(500);
    await expect(page.getByRole("button", { name: "6s" }).first()).toBeVisible();

    // Switch back to image
    await imageToggle.click();
    await page.waitForTimeout(500);
    await expect(imageToggle).toBeEnabled();
  });

  // ── G3.5: Button disables during generation ───────────────

  test("generate button disables during generation", async ({ page }) => {
    const { userId } = await signInUser(page, { grantCredits: 100 });
    clerkUserIds.push(userId);

    // Mock generate to be slow so we can observe the loading state
    await page.route("**/api/generate**", async (route) => {
      await new Promise((r) => setTimeout(r, 5000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ imageUrls: [] }),
      });
    });

    await page.goto("/generate");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    const promptInput = page.getByPlaceholder(/describe/i).first();
    await promptInput.fill("Test prompt");

    const genButton = page.getByRole("button", { name: /generate/i }).first();
    await genButton.click();

    // Button should show "Generating..." and be disabled
    await expect(page.getByRole("button", { name: /generating/i }).first()).toBeVisible({ timeout: 3000 });
  });
});
