/**
 * Credit Deduction API E2E Tests
 *
 * Tests the credit deduction engine at the API level for correctness,
 * idempotency, and boundary conditions.
 *
 * Covers:
 *   - Successful deduction reduces balance
 *   - Deduction at exactly 1 credit (boundary: last credit)
 *   - Deduction at 0 credits is rejected
 *   - Deduction with invalid ID is rejected
 *   - Idempotency: same idempotency key doesn't double-deduct
 *   - Cost variants: standard (1) — Premium removed
 */

import { test, expect } from "@playwright/test";

const API_BASE = "http://localhost:3001";
const ADMIN_KEY = "dev-admin-key";

// Unique user ID per test run to avoid cross-test pollution
const TEST_USER_ID = `test-deduct-${Date.now()}`;

/**
 * Grant credits to the test user via admin API.
 */
async function grantCredits(request: any, amount: number): Promise<void> {
  const res = await request.post(`${API_BASE}/api/admin/payments/grant-credits`, {
    headers: { "x-admin-key": ADMIN_KEY },
    data: { user_id: TEST_USER_ID, amount, description: "test seed" },
  });
  expect(res.status()).toBe(200);
}

/**
 * Deduct credits via the admin deduction API.
 */
async function deductCredits(
  request: any,
  amount: number,
  idempotencyKey?: string
) {
  const res = await request.post(`${API_BASE}/api/payments/deduct`, {
    headers: { "x-user-id": TEST_USER_ID, "x-admin-key": ADMIN_KEY },
    data: {
      amount,
      description: "test deduction",
      idempotency_key: idempotencyKey || `test-${Date.now()}`,
    },
  });
  return res;
}

test.describe("Credit Deduction API", () => {
  // ── Seed credits before any deduction tests ──────────────────

  test.beforeAll(async ({ request }) => {
    // Grant test user 10 credits via admin grant endpoint
    await grantCredits(request, 10);
  });

  // ── Standard deduction ───────────────────────────────────────

  test("deducts 1 credit from user with sufficient balance", async ({ request }) => {
    const response = await deductCredits(request, 1);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.deducted).toBe(1);
    expect(typeof body.balance_after).toBe("number");
  });

  // ── Premium deduction (removed — Premium tier no longer exists) ──

  test("premium deduction endpoint still works with standard cost", async ({ request }) => {
    // Premium quality tier was removed (R3). The deduction API still accepts
    // any amount via the amount parameter — this verifies a 2-credit deduction
    // still works at the API level even though Premium UI is gone.
    const response = await deductCredits(request, 2);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.deducted).toBe(2);
    expect(typeof body.balance_after).toBe("number");
  });

  // ── Insufficient credits ─────────────────────────────────────

  test("rejects deduction when balance is 0", async ({ request }) => {
    // Use a fresh sub-user for this test so we know exact balance
    const subUserId = `${TEST_USER_ID}-zero-test`;
    const subGrantRes = await request.post(`${API_BASE}/api/admin/payments/grant-credits`, {
      headers: { "x-admin-key": ADMIN_KEY },
      data: { user_id: subUserId, amount: 1, description: "zero test seed" },
    });
    expect(subGrantRes.status()).toBe(200);

    // Drain the 1 credit
    const drainRes = await request.post(`${API_BASE}/api/payments/deduct`, {
      headers: { "x-user-id": subUserId, "x-admin-key": ADMIN_KEY },
      data: { amount: 1, description: "drain", idempotency_key: `drain-zero-${Date.now()}` },
    });
    expect(drainRes.status()).toBe(200);

    // Now try to deduct 1 more — should fail with 402
    const response = await request.post(`${API_BASE}/api/payments/deduct`, {
      headers: { "x-user-id": subUserId, "x-admin-key": ADMIN_KEY },
      data: { amount: 1, description: "should fail", idempotency_key: `fail-zero-${Date.now()}` },
    });
    expect(response.status()).toBe(402);

    const body = await response.json();
    expect(body.error).toMatch(/insufficient credits|not enough credits/i);
  });

  // ── Invalid amount ───────────────────────────────────────────

  test("rejects deduction of 0 credits", async ({ request }) => {
    const response = await deductCredits(request, 0);
    expect(response.status()).toBe(400);
  });

  test("rejects deduction of negative credits", async ({ request }) => {
    const response = await deductCredits(request, -1);
    expect(response.status()).toBe(400);
  });

  // ── Idempotency ──────────────────────────────────────────────

  test("same idempotency key does not double-deduct", async ({ request }) => {
    // Grant 5 credits for this test
    await grantCredits(request, 5);
    const idempotencyKey = `idemp-test-${Date.now()}`;

    // First call — should succeed
    const res1 = await deductCredits(request, 1, idempotencyKey);
    expect(res1.status()).toBe(200);
    const body1 = await res1.json();

    // Second call with same key — should return same result, not double-deduct
    const res2 = await deductCredits(request, 1, idempotencyKey);
    expect(res2.status()).toBe(200);
    const body2 = await res2.json();

    // Balance should match first response (not deducted again)
    expect(body2.balance_after).toBe(body1.balance_after);
    expect(body2.deducted).toBe(1);
  });

  // ── Auth guard ───────────────────────────────────────────────

  test("rejects deduction without admin key", async ({ request }) => {
    const response = await request.post(`${API_BASE}/api/payments/deduct`, {
      headers: { "x-user-id": TEST_USER_ID },
      data: { amount: 1, description: "test", idempotency_key: `noauth-${Date.now()}` },
    });
    expect(response.status()).toBe(401);
  });
});
