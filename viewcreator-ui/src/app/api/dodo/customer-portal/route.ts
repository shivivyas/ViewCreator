import { CustomerPortal } from "@dodopayments/nextjs";

/**
 * Dodo Payments Customer Portal Route Handler
 *
 * GET  → ?customer_id=cus_xxx
 *
 * Returns customer portal URL for managing subscriptions, payment methods, etc.
 */
export const GET = CustomerPortal({
  bearerToken: process.env.DODO_PAYMENTS_API_KEY!,
  environment: process.env.DODO_PAYMENTS_ENVIRONMENT as "test_mode" | "live_mode" | undefined,
});
