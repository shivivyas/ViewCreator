/**
 * Admin API E2E Tests
 *
 * Tests the admin payment status endpoint.
 * Verifies system health reporting and authentication.
 */

import { test, expect } from "@playwright/test";

const API_BASE = "http://localhost:3001";
const ADMIN_KEY = "dev-admin-key";

test.describe("Admin API — Payment Status", () => {
  test("returns healthy status with admin key", async ({ request }) => {
    const response = await request.get(
      `${API_BASE}/api/admin/payments/status`,
      {
        headers: { "x-admin-key": ADMIN_KEY },
      }
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.healthy).toBe(true);
    expect(body.database.connected).toBe(true);
    expect(body.database.plan_count).toBeGreaterThanOrEqual(1);
    expect(body.dodo.configured).toBe(true);
    expect(body.webhooks.configured).toBe(true);
    expect(body.timestamp).toBeTruthy();
  });

  test("returns 401 without admin key", async ({ request }) => {
    const response = await request.get(
      `${API_BASE}/api/admin/payments/status`
    );

    expect(response.status()).toBe(401);
  });

  test("returns 401 with invalid admin key", async ({ request }) => {
    const response = await request.get(
      `${API_BASE}/api/admin/payments/status`,
      {
        headers: { "x-admin-key": "wrong-key" },
      }
    );

    expect(response.status()).toBe(401);
  });

  test("webhook events endpoint returns paginated results", async ({
    request,
  }) => {
    const response = await request.get(
      `${API_BASE}/api/admin/payments/webhook-events?limit=5`,
      {
        headers: { "x-admin-key": ADMIN_KEY },
      }
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.events).toBeDefined();
    expect(typeof body.count).toBe("number");
  });
});

test.describe("Public API — Plans", () => {
  test("plans endpoint returns subscription plans", async ({ request }) => {
    const response = await request.get(
      `${API_BASE}/api/payments/plans`
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.creditPacks).toBeDefined();
    expect(body.subscriptions).toBeDefined();
    // Credit-only model: subscriptions may be empty array
    expect(Array.isArray(body.subscriptions)).toBe(true);
  });
});

test.describe("Public API — Health", () => {
  test("health endpoint returns ok", async ({ request }) => {
    const response = await request.get(`${API_BASE}/health`);

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("healthy");
  });
});
