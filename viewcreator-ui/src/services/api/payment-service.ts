import { request } from '../base/api-client';
import type { SubscriptionPlan, UserPaymentStatus } from '@/types';

export interface PlansResponse {
  creditPacks: SubscriptionPlan[];
  subscriptions: SubscriptionPlan[];
}

/**
 * Fetch all active pricing plans (public — no auth required)
 */
export async function getPlans(): Promise<PlansResponse> {
  return request<PlansResponse>('/api/payments/plans');
}

/**
 * Fetch authenticated user's credit balance + subscription status
 */
export async function getBalance(token: string): Promise<UserPaymentStatus> {
  return request<UserPaymentStatus>('/api/payments/balance', { token });
}

/**
 * Create a Dodo Payments checkout session for a given plan
 * Redirects user to Dodo-hosted checkout page.
 */
export async function createCheckout(
  planId: string,
  customerEmail: string,
  customerName: string,
  metadata?: Record<string, string>
): Promise<{ checkout_url: string }> {
  const params = new URLSearchParams({
    productId: planId,
    email: customerEmail,
    fullName: customerName,
  });

  if (metadata) {
    Object.entries(metadata).forEach(([key, value]) => {
      params.set(`metadata_${key}`, value);
    });
  }

  const res = await fetch(`/api/dodo/checkout?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Checkout failed' }));
    throw new Error(err.error || 'Failed to create checkout session');
  }
  return res.json();
}

/**
 * Create a Dodo Payments customer portal session
 */
export async function createCustomerPortal(
  customerId: string,
  sendEmail: boolean = false
): Promise<{ url: string }> {
  const params = new URLSearchParams({
    customer_id: customerId,
    send_email: String(sendEmail),
  });

  const res = await fetch(`/api/dodo/customer-portal?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Portal failed' }));
    throw new Error(err.error || 'Failed to create portal session');
  }
  return res.json();
}
