/**
 * E2E Test Helpers — API mocking for different user personas.
 *
 * Personas reflect the credit-only payment model (no subscriptions).
 * Credit boundaries tested: 0 (FREE), 1 (LOW_CREDIT — can generate once),
 * and 100 (CREDIT_USER — normal happy path).
 *
 *   GUEST        — not authenticated, sees public pricing page
 *   FREE         — signed in, 0 credits
 *   LOW_CREDIT   — signed in, 1 credit (boundary: can generate once)
 *   CREDIT_USER  — signed in, 100 credits (one pack)
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
    description: "Signed in, 0 credits — blocked from generating",
    credits: { balance: 0, lifetime_credits: 0 },
  },
  LOW_CREDIT: {
    name: "Low Credit User",
    description: "Signed in, 1 credit — boundary: can generate once then hits 0",
    credits: { balance: 1, lifetime_credits: 100 },
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
    id: "plan-credits-5",
    name: "5 Credits",
    type: "credit_pack",
    credits: 5,
    price_cents: 5,
    currency: "USD",
    display_price: "$0.05",
    display_per_unit: "$0.01/credit",
    features: [
      "Generate up to 5 images or 1 video",
      "All aspect ratios & sizes",
      "Standard quality output",
    ],
    dodo_product_id: "pdt_0NiZQ6jp5QSl7ZLZVlZ77",
    is_active: true,
    sort_order: 0,
  },
  {
    id: "plan-credits-100",
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
      "Standard quality output",
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

// ── Template Mock Data ────────────────────────────────────────────────────────

export interface Template {
  id: string;
  title: string;
  description: string;
  s3_link: string;
  media_type?: string;
  user_id?: string | null;
  created_at?: string;
  upvotes?: number;
  user_upvoted?: boolean;
  config?: {
    category?: string;
    tags?: string[];
    stylePreset?: string;
    aspectRatio?: string;
    recommendedPrompts?: string[];
  };
}

export const MOCK_TEMPLATES: Template[] = [
  {
    id: "tmpl-1",
    title: "Summer Sale",
    description: "Bold summer promotion template",
    media_type: "image",
    s3_link: "https://placehold.co/400x500?text=Summer+Sale",
    upvotes: 12,
    user_upvoted: false,
    user_id: "user-1",
    created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    config: {
      stylePreset: "Modern",
      aspectRatio: "1:1",
      category: "Promotions",
      tags: ["sale", "summer", "promotion"],
      recommendedPrompts: [
        "50% off summer collection",
        "Limited time summer deal",
      ],
    },
  },
  {
    id: "tmpl-2",
    title: "Product Launch",
    description: "Sleek product reveal layout",
    media_type: "image",
    s3_link: "https://placehold.co/400x500?text=Product+Launch",
    upvotes: 8,
    user_upvoted: true,
    user_id: "user-2",
    created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    config: {
      stylePreset: "Minimal",
      aspectRatio: "4:5",
      category: "Product",
      tags: ["product", "launch", "minimal"],
      recommendedPrompts: [
        "New product announcement",
        "Feature highlights",
      ],
    },
  },
  {
    id: "tmpl-3",
    title: "Social Media Kit",
    description: "Versatile social media template pack",
    media_type: "video",
    s3_link: "https://placehold.co/400x500?text=Social+Kit",
    upvotes: 5,
    user_upvoted: false,
    user_id: "user-3",
    created_at: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
    config: {
      stylePreset: "Bold",
      aspectRatio: "1:1",
      category: "Social",
      tags: ["social", "media", "kit"],
      recommendedPrompts: [
        "Instagram story promotion",
        "Facebook cover design",
      ],
    },
  },
];

/**
 * Mock the GET /api/templates endpoint to return template data.
 * Only intercepts GET requests; other methods pass through.
 */
export async function mockTemplatesEndpoint(page: Page, templates?: Template[]) {
  const data = templates || MOCK_TEMPLATES;
  await page.route(/\/api\/templates(\?.*)?$/, async (route: Route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ templates: data }),
      });
    } else {
      await route.continue();
    }
  });
}
