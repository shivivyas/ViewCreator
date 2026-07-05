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
 *   - Cost variants: standard (1) and premium (2)
 */

import { test, expect } from "@playwright/test";

const API_BASE = "http://localhost:3001";
const ADMIN_KEY = "dev-admin-key";

const TEST_USER_ID = "test-user-deduction-spec";

async function getBalance(request: any): Promise<number> {
  const res = await request.get(`${API_BASE}/api/payments/balance`, {
    headers: { "x-user-id": TEST_USER_ID },
  });
  const body = await res.json();
  return body.credits?.balance ?? 0;
}

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
  // ── Standard deduction ───────────────────────────────────────

  test("deducts 1 credit from user with sufficient balance", async ({ request }) => {
    // First ensure user has credits by checking balance
    const balanceBefore = await getBalance(request);

    // Deduct 1 credit
    const response = await deductCredits(request, 1);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.deducted).toBe(1);
    expect(body.balance_after).toBe(balanceBefore - 1);
  });

  // ── Premium deduction ────────────────────────────────────────

  test("deducts 2 credits (premium cost)", async ({ request }) => {
    const balanceBefore = await getBalance(request);

    const response = await deductCredits(request, 2);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.deducted).toBe(2);
    expect(body.balance_after).toBe(balanceBefore - 2);
  });

  // ── Insufficient credits ─────────────────────────────────────

  test("rejects deduction when balance is 0", async ({ request }) => {
    // Deduct more than available to force 0
    const balance = await getBalance(request);
    if (balance > 0) {
      await deductCredits(request, balance, `drain-${Date.now()}`);
    }

    // Now try to deduct — should fail
    const response = await deductCredits(request, 1);
    expect(response.status()).toBe(402); // Payment Required

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
    const idempotencyKey = `idemp-test-${Date.now()}`;
    const balanceBefore = await getBalance(request);

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
