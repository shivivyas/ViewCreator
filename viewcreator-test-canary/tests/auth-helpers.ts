/**
 * Shared Auth Helpers — Clerk-authenticated test user lifecycle.
 *
 * These helpers create Clerk users via the Backend API, sign them in
 * through the Clerk UI using @clerk/testing, grant credits, and clean up.
 *
 * Usage:
 *   import { signInUser, deleteClerkUser } from "./auth-helpers";
 *
 *   test.describe("My Test", () => {
 *     const clerkUserIds: string[] = [];
 *     test.afterEach(async () => {
 *       for (const id of clerkUserIds) await deleteClerkUser(id);
 *     });
 *
 *     test("my test", async ({ page }) => {
 *       const { userId } = await signInUser(page, { grantCredits: 100 });
 *       clerkUserIds.push(userId);
 *       // ... test logic
 *     });
 *   });
 */

import { setupClerkTestingToken, clerk } from "@clerk/testing/playwright";
import { mockPlansEndpoint, mockBalanceForPersona } from "./helpers";

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || "";
const API_BASE = "http://localhost:3001";
const ADMIN_KEY = "dev-admin-key";

/**
 * Delete a Clerk user by ID. Call in afterEach to prevent hitting the
 * 100-user dev instance quota.
 */
export async function deleteClerkUser(userId: string) {
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

/**
 * Sign in a test user through the Clerk UI, then optionally grant credits
 * and set up API mocks.
 *
 * Uses @clerk/testing's clerk.signIn() which properly handles the Clerk
 * client-side SDK hydration — unlike raw cookie injection which often
 * leaves useUser() returning null on first render.
 *
 * Flow:
 *   1. Create user via Clerk Backend API
 *   2. Navigate to pricing page (Clerk loads in background)
 *   3. Sign in via Clerk UI using password strategy
 *   4. Wait for Clerk to fully hydrate (useUser().isSignedIn = true)
 *   5. Optionally grant credits via admin API
 *   6. Set up API mocks for balance + plans
 *   7. Navigate to /pricing (clean slate)
 */
export async function signInUser(
  page: any,
  opts?: { grantCredits?: number; redirectUrl?: string }
): Promise<{ userId: string; email: string }> {
  const email = `testuser+clerk_test_${Date.now()}@example.com`;
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

  // 2. Enable Clerk testing mode (bypasses bot detection on Clerk's FAPI)
  await setupClerkTestingToken({ page });

  // 3. Navigate to the redirect URL or a default page so Clerk loads
  const startUrl = opts?.redirectUrl || "/pricing";
  await page.goto(startUrl);
  await page.waitForLoadState("networkidle");

  // 4. Sign in through Clerk UI via email-based ticket
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
          description: "test seed",
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

  const hasRealCredits =
    opts?.grantCredits && opts.grantCredits > 0;
  if (!hasRealCredits) {
    await mockBalanceForPersona(page as any, "FREE");
  }

  // Block actual generate API calls by default (override per test as needed)
  await page.route("**/api/generate**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ generated: false, mock: true }),
    });
  });

  // 8. Navigate to a clean page so components fetch fresh data
  await page.goto("/pricing");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);

  return { userId, email };
}
