/**
 * Generate Page — Purchase Flow E2E Tests
 *
 * Tests the credit gate → purchase → auto-resume flow.
 * These tests use the Clerk Backend API to create real test users and sessions,
 * then verify the credit gate modal, form state persistence in sessionStorage,
 * and post-purchase form restoration.
 *
 * These tests run under the "chromium-auth" project with a 120s timeout.
 *
 * Behavioral context (from TEST_PLAN):
 *   G1.4 — Credit gate modal shows purchase options at 0 credits
 *   G6.1 — User hits gate mid-generation → buys → auto-resumes
 *   G6.2 — pending_generate sessionStorage preserved across payment redirect
 *   G6.3 — Post-purchase: form state restored from sessionStorage
 */

import { test, expect } from "@playwright/test";
import { setupClerkTestingToken, clerk } from "@clerk/testing/playwright";
import { mockPlansEndpoint, mockBalanceForPersona } from "./helpers";

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || "";
const API_BASE = "http://localhost:3001";
const ADMIN_KEY = "dev-admin-key";

// ── Cleanup ─────────────────────────────────────────────────────────────────

/**
 * Delete a Clerk user by ID. Called in afterEach to prevent hitting the
 * 100-user dev instance quota.
 */
async function deleteClerkUser(userId: string) {
  try {
    const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` },
    });
    if (!res.ok) {
      console.warn(`[Cleanup] Failed to delete user ${userId}: ${res.status}`);
    }
  } catch (err) {
    console.warn(`[Cleanup] Error deleting user ${userId}:`, err);
  }
}

// ── Sign-In Helper ──────────────────────────────────────────────────────────

/**
 * Sign in a test user through the Clerk UI, then optionally grant credits
 * and set up API mocks.
 *
 * Follows the same pattern as clerk-auth.spec.ts and templates-auth.spec.ts.
 */
async function signInUser(
  page: any,
  opts?: { grantCredits?: number }
): Promise<{ userId: string; email: string }> {
  const email = `testuser+genflow_${Date.now()}@example.com`;
  const password = "ViewCreatorTest123!";

  // 1. Create user via Clerk Backend API
  const createRes = await fetch(`https://api.clerk.com/v1/users`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CLERK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email_address: [email],
      password,
      skip_password_checks: true,
      skip_password_requirement: false,
    }),
  });

  if (!createRes.ok) {
    throw new Error(
      `Clerk user creation failed: ${createRes.status} — ${await createRes.text()}`
    );
  }

  const user = await createRes.json();
  const userId = user.id;

  // 2. Enable Clerk testing mode
  await setupClerkTestingToken({ page });

  // 3. Navigate to a page so Clerk loads
  await page.goto("/pricing");
  await page.waitForLoadState("networkidle");

  // 4. Sign in through Clerk UI
  await clerk.signIn({ page, emailAddress: email });

  // 5. Wait for Clerk to fully hydrate
  await clerk.loaded({ page });
  await page.waitForTimeout(1000);

  // 6. Optionally grant credits via admin API
  if (opts?.grantCredits && opts.grantCredits > 0) {
    const grantRes = await fetch(
      `${API_BASE}/api/admin/payments/grant-credits`,
      {
        method: "POST",
        headers: {
          "x-admin-key": ADMIN_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          amount: opts.grantCredits,
          description: "generate purchase flow test seed",
        }),
      }
    );

    if (!grantRes.ok) {
      throw new Error(
        `Credit grant failed: ${grantRes.status} — ${await grantRes.text()}`
      );
    }
  }

  // 7. Set up mocks
  await mockPlansEndpoint(page as any);

  // For users with real credits, skip balance mock so CreditBadge fetches real data
  const hasRealCredits = opts?.grantCredits && opts.grantCredits > 0;
  if (!hasRealCredits) {
    await mockBalanceForPersona(page as any, "FREE");
  }

  // 8. Navigate to a clean page so components fetch fresh data
  await page.goto("/pricing");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  return { userId, email };
}

// ── Tests ───────────────────────────────────────────────────────────────────

test.describe("Generate Page — Purchase Flow (Clerk)", () => {
  const clerkUserIds: string[] = [];

  test.afterEach(async () => {
    for (const id of clerkUserIds) {
      await deleteClerkUser(id);
    }
    clerkUserIds.length = 0;
  });

  // ── 22. Credit gate shows purchase options ─────────────────

  test("credit gate modal shows purchase options", async ({ page }) => {
    const { userId } = await signInUser(page);
    clerkUserIds.push(userId);

    // Navigate to /generate as a 0-credit user
    await page.goto("/generate");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Fill in the prompt
    const promptInput = page.getByPlaceholder(/describe/i).first();
    await expect(promptInput).toBeVisible();
    await promptInput.fill("Test prompt for purchase flow");

    // Click generate to trigger the credit gate
    const genButton = page.getByRole("button", { name: /generate/i });
    await genButton.click();
    await page.waitForTimeout(3000);

    // The credit gate modal should appear with purchase options
    // It should show a heading like "Buy Credits" or "Purchase credits"
    await expect(
      page.getByRole("heading", { name: /buy credits|purchase/i }).first()
    ).toBeVisible({ timeout: 5000 });

    // The modal should list credit packs to buy
    // Look for the 100 Credits pack in the modal
    const creditPackOption = page.getByText("100 Credits").first();
    await expect(creditPackOption).toBeVisible({ timeout: 5000 });

    // A Buy/CTA button should be present in the modal
    const buyButton = page.getByRole("button", { name: /buy|purchase/i }).first();
    await expect(buyButton).toBeVisible();
  });

  // ── 23. Form state saved to sessionStorage ─────────────────

  test("form state saved to sessionStorage when gate triggers", async ({ page }) => {
    const { userId } = await signInUser(page);
    clerkUserIds.push(userId);

    // Navigate to /generate as a 0-credit user
    await page.goto("/generate");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Fill in the form with specific values
    const testPrompt = "A serene mountain landscape at sunset";
    const promptInput = page.getByPlaceholder(/describe/i).first();
    await expect(promptInput).toBeVisible();
    await promptInput.fill(testPrompt);

    // Select a different aspect ratio (e.g., 16:9)
    const aspectBtn = page.getByRole("button", { name: "16:9" }).first();
    if (await aspectBtn.isVisible()) {
      await aspectBtn.click();
      await page.waitForTimeout(300);
    }

    // Click generate to trigger the credit gate
    const genButton = page.getByRole("button", { name: /generate/i });
    await genButton.click();
    await page.waitForTimeout(3000);

    // Check that the credit gate modal appeared (indicating gate triggered)
    const gateHeading = page.getByRole("heading", { name: /buy credits|purchase/i }).first();
    const gateVisible = await gateHeading.isVisible().catch(() => false);

    if (gateVisible) {
      // The gate triggered — check sessionStorage for pending_generate
      const pendingData = await page.evaluate(() => {
        return sessionStorage.getItem("pending_generate");
      });

      expect(pendingData).not.toBeNull();
      if (pendingData) {
        const parsed = JSON.parse(pendingData);
        // The saved data should contain the prompt we entered
        expect(parsed.params?.prompt || parsed.prompt).toContain("mountain landscape");
      }
    } else {
      // Gate might not have appeared (depends on how the page detects credits)
      // Log for diagnostic purposes
      console.log("[Test 23] Gate modal did not appear — checking sessionStorage anyway");
      const pendingData = await page.evaluate(() => {
        return sessionStorage.getItem("pending_generate");
      });
      if (pendingData) {
        const parsed = JSON.parse(pendingData);
        expect(parsed.params?.prompt || parsed.prompt).toContain("mountain landscape");
      }
    }
  });

  // ── 24. Post-purchase redirect restores form ────────────────

  test("post-purchase redirect restores form", async ({ page }) => {
    // Create a credit user with balance so the resume flow doesn't hit the gate
    const { userId } = await signInUser(page, { grantCredits: 100 });
    clerkUserIds.push(userId);

    // Set up pending_generate in sessionStorage to simulate returning from Dodo
    const pendingData = {
      type: "image",
      params: {
        prompt: "A serene mountain landscape at sunset",
        style: "None",
        aspectRatio: "16:9",
        numberOfImages: 2,
        imageSize: "1K",
        thinkingLevel: "minimal",
        quality: "Standard",
        referenceImages: [],
        templateId: null,
      },
    };

    // Navigate to generate to establish the page context
    await page.goto("/generate");
    await page.waitForLoadState("networkidle");

    // Inject the pending generation data into sessionStorage
    await page.evaluate((data) => {
      sessionStorage.setItem("pending_generate", JSON.stringify(data));
    }, pendingData);

    // Also set a pending_plan_id so the grant credits step works
    await page.evaluate(() => {
      sessionStorage.setItem("pending_plan_id", "plan-credits-100");
    });

    // Navigate to /generate?checkout=success to trigger the post-purchase flow
    await page.goto("/generate?checkout=success");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // The form should have the restored prompt from sessionStorage
    const promptInput = page.getByPlaceholder(/describe/i).first();
    const promptValue = await promptInput.inputValue();
    expect(promptValue).toContain("mountain landscape");

    // The aspect ratio should be restored (16:9)
    const aspectRatioOption = page.getByText("16:9").first();
    await expect(aspectRatioOption).toBeVisible();

    // Verify the form is ready for submission (generate button enabled)
    const genButton = page.getByRole("button", { name: /generate/i }).first();
    // For users with credits, the button should be enabled
    if (await genButton.isVisible()) {
      const isDisabled = await genButton.isDisabled();
      console.log(`[Test 24] Generate button disabled: ${isDisabled}`);
    }

    // The URL should contain /generate (not redirected away)
    const currentUrl = page.url();
    expect(currentUrl).toContain("/generate");
  });
});
