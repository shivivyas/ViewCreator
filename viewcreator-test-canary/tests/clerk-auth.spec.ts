/**
 * Clerk-Authenticated Persona Tests
 *
 * These tests use the Clerk Backend API to create test users and sessions,
 * then inject the session cookies into the browser context. This bypasses
 * the UI sign-up flow (which doesn't work in headless Playwright because
 * Clerk's modal requires trusted user events).
 *
 * Unlike the mock-based "contract tests" in other spec files,
 * these tests run with REAL Clerk auth state — useAuth()/useUser()
 * return real signed-in data.
 *
 * Prerequisites:
 *   - CLERK_SECRET_KEY set (available from UI's .env.local via global setup)
 *   - Email + Password auth enabled in Clerk Dashboard
 *   - Clerk Frontend API URL (from publishable key)
 */

import { test, expect } from "@playwright/test";

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || "";
const CLERK_FAPI = "shining-boxer-67.clerk.accounts.dev";

/**
 * Create a test user via Clerk Backend API and inject session cookies.
 * Returns nothing — auth state is stored in the browser context cookies.
 */
async function signInAsTestUser(page: any) {
  // 1. Create a test user via Clerk Backend API
  const email = `testuser+clerk_test_${Date.now()}@example.com`;
  const password = "ViewCreatorTest123!";

  const createRes = await fetch(
    `https://api.clerk.com/v1/users`,
    {
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
    }
  );

  if (!createRes.ok) {
    const errText = await createRes.text();
    console.error("Clerk user creation failed:", createRes.status, errText);
    throw new Error(`Failed to create Clerk user: ${createRes.status}`);
  }

  const user = await createRes.json();
  const userId = user.id;

  // 2. Create a session for this user
  const sessionRes = await fetch(
    `https://api.clerk.com/v1/sessions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLERK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_id: userId }),
    }
  );

  if (!sessionRes.ok) {
    const errText = await sessionRes.text();
    console.error("Clerk session creation failed:", sessionRes.status, errText);
    throw new Error(`Failed to create Clerk session: ${sessionRes.status}`);
  }

  const session = await sessionRes.json();
  const sessionId = session.id;

  // 3. Get the session token
  const tokenRes = await fetch(
    `https://api.clerk.com/v1/sessions/${sessionId}/tokens`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CLERK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    console.error("Clerk token creation failed:", tokenRes.status, errText);
    throw new Error(`Failed to create Clerk token: ${tokenRes.status}`);
  }

  const tokenData = await tokenRes.json();
  const jwt = tokenData.jwt;

  // 4. Set Clerk session cookies in the browser context
  await page.context().addCookies([
    { name: "__session", value: jwt, domain: "localhost", path: "/" },
    { name: "__clerk_db_jwt", value: jwt, domain: "localhost", path: "/" },
    { name: "__client_uat", value: "1", domain: "localhost", path: "/" },
  ]);
}

test.describe("Clerk-Authenticated — Fresh User (0 credits)", () => {
  test("sees pricing page after sign-in", async ({ page }) => {
    await signInAsTestUser(page);

    await page.goto("/pricing");
    await page.waitForLoadState("networkidle");

    // Should see the pricing page heading
    await expect(
      page.getByRole("heading", { name: "Pay once. Create forever." })
    ).toBeVisible();
  });

  test("page loads successfully after sign-in", async ({ page }) => {
    await signInAsTestUser(page);

    await page.goto("/pricing");
    await page.waitForLoadState("networkidle");

    // Page loads without redirecting to sign-in
    const currentUrl = page.url();
    expect(currentUrl).toContain("/pricing");
    await expect(
      page.getByRole("heading", { name: "Pay once. Create forever." })
    ).toBeVisible();
  });
});

test.describe("Clerk-Authenticated — Generate Page Gate", () => {
  test("signed-in user can access generate page", async ({ page }) => {
    await signInAsTestUser(page);

    await page.goto("/generate");
    await page.waitForLoadState("networkidle");

    // Signed-in users can reach the generate page (not redirected to sign-in)
    const currentUrl = page.url();
    expect(currentUrl).not.toContain("/sign-in");
    expect(currentUrl).not.toContain("/sign-up");
  });
});
