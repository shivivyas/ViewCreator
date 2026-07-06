/**
 * Pricing Page — Signed-In Tests (Clerk)
 *
 * Extends pricing.spec.ts with Clerk-authenticated test scenarios.
 * Tests signed-in user behaviors on the pricing page:
 *   - "Buy more credits" button (not "Sign up to buy")
 *   - Current balance display
 *
 * Behavioral decisions (from Lavish spec):
 *   P1.4 — Signed-in user sees "Buy more credits" on credit cards
 *   P1.5 — Signed-in user sees current balance on pricing page
 *
 * Runs under the "chromium-auth" project with real Clerk auth.
 */

import { test, expect } from "@playwright/test";
import { setupClerkTestingToken, clerk } from "@clerk/testing/playwright";
import { mockPlansEndpoint, mockBalanceForPersona } from "./helpers";

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || "";
const API_BASE = "http://localhost:3001";
const ADMIN_KEY = "dev-admin-key";

// ── Cleanup ─────────────────────────────────────────────────────────────────

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

async function signInUser(
  page: any,
  opts?: { grantCredits?: number }
): Promise<{ userId: string; email: string }> {
  const email = `testuser+pricing_${Date.now()}@example.com`;
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
          description: "pricing test seed",
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

  // 8. Navigate to pricing page so components fetch fresh data
  await page.goto("/pricing");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  return { userId, email };
}

// ── Tests ───────────────────────────────────────────────────────────────────

test.describe("Pricing Page — Signed-In (Clerk)", () => {
  const clerkUserIds: string[] = [];

  test.afterEach(async () => {
    for (const id of clerkUserIds) {
      await deleteClerkUser(id);
    }
    clerkUserIds.length = 0;
  });

  // ── P1.4: "Buy more credits" on plan cards ─────────────────

  test("signed-in user sees 'Buy more credits' on plan cards", async ({ page }) => {
    const { userId } = await signInUser(page);
    clerkUserIds.push(userId);

    // Should be on /pricing as signed-in user
    // The buy button should not say "Sign up" — it should be purchase-related
    const buyButton = page.getByRole("button", { name: /buy|credits|purchase/i }).first();
    await expect(buyButton).toBeVisible({ timeout: 10000 });

    const text = await buyButton.textContent();
    // Assert the button text does NOT contain "Sign up"
    expect(text?.toLowerCase()).not.toContain("sign up");
    // Assert the button text contains something purchase-related
    expect(text?.toLowerCase()).toMatch(/buy|credits|purchase|more/i);
  });

  // ── P1.5: Current balance on pricing page ──────────────────

  test("signed-in user sees current balance on pricing page", async ({ page }) => {
    const { userId } = await signInUser(page, { grantCredits: 100 });
    clerkUserIds.push(userId);

    // The pricing page should show the user's credit balance
    // This could be in a credit badge in the header or a balance display on the page
    // Look for credit-related text showing the balance
    const creditDisplay = page.getByText(/100.*credits?|credits?:?\s*100/i).first();
    await expect(creditDisplay).toBeVisible({ timeout: 10000 });
  });

  // ── P1.5 variant: 0-credit user sees balance ───────────────

  test("signed-in user with 0 credits sees balance display", async ({ page }) => {
    const { userId } = await signInUser(page);
    clerkUserIds.push(userId);

    // 0-credit user should see their balance or a "Buy" CTA
    // The credit badge in the header should show 0 credits
    const headerRegion = page.locator("header, nav, [role='banner']");
    const creditText = headerRegion.getByText(/0.*credits?|credits?:?\s*0/i);
    // May show "0 credits — Buy" or similar
    await expect(creditText.first()).toBeVisible({ timeout: 10000 });
  });
});
