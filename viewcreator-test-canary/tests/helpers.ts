/**
 * E2E Test Helpers — API mocking for different user personas.
 *
 * Personas reflect the credit-only payment model (no subscriptions):
 *
 *   GUEST       — not authenticated, sees public pricing page
 *   FREE        — signed in, 0 credits
 *   CREDIT_USER — signed in, 100 credits (one pack)
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
    description: "Signed in, 0 credits",
    credits: { balance: 0, lifetime_credits: 0 },
  },
  CREDIT_USER: {
    name: "Credit User",
    description: "Signed in, 100 credits (one pack)",
    credits: { balance: 100, lifetime_credits: 200 },
  },
} as const;

export type PersonaKey = keyof typeof PERSONAS;

// ── Credit Pack Mock Data ────────────────────────────────────────────────────

export const MOCK_CREDIT_PACKS = [
  {
    id: "plan-credits-uuid",
    name: "100 Credits",
    type: "credit_pack",
    credits: 100,
    price_cents: 900,
    currency: "USD",
    display_price: "$9",
    display_per_unit: "$9.00/credit",
    features: [
      "Generate up to 100 images or 20 videos",
      "All aspect ratios & sizes",
      "Standard & premium quality output",
      "Reference image upload",
      "Never expires",
    ],
    dodo_product_id: "pdt_0NiWo2CjaeJBzhplGXxWT",
    is_active: true,
    sort_order: 1,
  },
];

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
    subscription: null,
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
 * Mock the plans endpoint to return the credit pack.
 */
export async function mockPlansEndpoint(page: Page) {
  const body = JSON.stringify({
    creditPacks: MOCK_CREDIT_PACKS,
    subscriptions: [],
  });
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
