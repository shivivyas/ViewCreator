/**
 * E2E Test Helpers — API mocking for different user personas.
 *
 * Each persona represents a different payment state:
 *
 *   GUEST       — not authenticated, sees public pricing page
 *   FREE        — signed in, 0 credits, no subscription
 *   CREDIT_USER — signed in, 420 credits, no subscription
 *   SUBSCRIBER  — signed in, active Monthly subscription, 70 credits
 *   PAST_DUE    — signed in, subscription payment failed
 */

import { Page, Route } from "@playwright/test";

// ── Persona Data ────────────────────────────────────────────────────────────

export const PERSONAS = {
  GUEST: {
    name: "Guest",
    description: "Not signed in — sees public pricing page",
  },
  FREE: {
    name: "Free User",
    description: "Signed in, 0 credits, no subscription",
    credits: { balance: 0, lifetime_credits: 0 },
    subscription: null,
  },
  CREDIT_USER: {
    name: "Credit User",
    description: "Signed in, 420 credits, no subscription",
    credits: { balance: 420, lifetime_credits: 1000 },
    subscription: null,
  },
  SUBSCRIBER: {
    name: "Subscriber",
    description: "Active Monthly subscription, 70 credits remaining",
    credits: { balance: 70, lifetime_credits: 70 },
    subscription: {
      id: "sub-uuid-1",
      plan_id: "plan-monthly-uuid",
      plan_name: "Monthly",
      status: "active" as const,
      current_period_start: "2026-07-04T00:00:00Z",
      current_period_end: "2026-07-11T00:00:00Z",
      canceled_at: null,
      dodo_customer_id: "cus_test123",
    },
  },
  PAST_DUE: {
    name: "Past Due Subscriber",
    description: "Subscription payment failed",
    credits: { balance: 70, lifetime_credits: 70 },
    subscription: {
      id: "sub-uuid-2",
      plan_id: "plan-monthly-uuid",
      plan_name: "Monthly",
      status: "past_due" as const,
      current_period_start: "2026-06-27T00:00:00Z",
      current_period_end: "2026-07-04T00:00:00Z",
      canceled_at: null,
      dodo_customer_id: "cus_test456",
    },
  },
} as const;

export type PersonaKey = keyof typeof PERSONAS;

// ── Plan Mock Data ──────────────────────────────────────────────────────────

export const MOCK_PLANS = {
  creditPacks: [],
  subscriptions: [
    {
      id: "plan-monthly-uuid",
      name: "Monthly",
      type: "subscription",
      credits: 0,
      price_cents: 2900,
      currency: "USD",
      interval: "month",
      display_price: "$29",
      display_per_unit: undefined,
      features: [
        "Unlimited image & video generation",
        "All aspect ratios & sizes",
        "Premium quality output",
        "Reference image upload (up to 10)",
        "Priority generation queue",
        "All templates unlocked",
        "Early access to new features",
      ],
      dodo_product_id: "pdt_test123",
      is_active: true,
      sort_order: 4,
    },
  ],
};

// ── Mock Setup ──────────────────────────────────────────────────────────────

/**
 * Mock the balance endpoint for a specific persona.
 * Call this BEFORE navigating to a page.
 */
export async function mockBalanceForPersona(
  page: Page,
  personaKey: Exclude<PersonaKey, "GUEST">
) {
  const persona = PERSONAS[personaKey] as any;
  const body = JSON.stringify({
    credits: persona.credits,
    subscription: persona.subscription,
  });

  await page.route("**/api/payments/balance", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body,
    });
  });
}

/**
 * Mock the plans endpoint to return the Monthly subscription.
 */
export async function mockPlansEndpoint(page: Page) {
  const body = JSON.stringify(MOCK_PLANS);
  await page.route("**/api/payments/plans", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body,
    });
  });
}

/**
 * Full setup for any persona — mocks both plans and balance API.
 */
export async function setupPersona(
  page: Page,
  personaKey: PersonaKey
) {
  await mockPlansEndpoint(page);
  if (personaKey !== "GUEST") {
    await mockBalanceForPersona(page, personaKey);
  }
}
