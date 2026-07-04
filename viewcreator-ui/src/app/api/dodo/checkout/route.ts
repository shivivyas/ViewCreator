import { Checkout } from "@dodopayments/nextjs";

/**
 * Dodo Payments Checkout Route Handler
 *
 * GET  → Static checkout: ?productId=pdt_xxx&email=user@example.com
 * POST → Checkout session with full cart control
 *
 * Both return { checkout_url: "https://checkout.dodopayments.com/..." }
 */
export const GET = Checkout({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY!,
  returnUrl: process.env.DODO_PAYMENTS_RETURN_URL,
  environment: process.env.DODO_PAYMENTS_ENVIRONMENT as "test_mode" | "live_mode" | undefined,
  type: "static",
});

export const POST = Checkout({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY!,
  returnUrl: process.env.DODO_PAYMENTS_RETURN_URL,
  environment: process.env.DODO_PAYMENTS_ENVIRONMENT as "test_mode" | "live_mode" | undefined,
  type: "session",
});
