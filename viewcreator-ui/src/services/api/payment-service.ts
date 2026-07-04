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
 * Create a Dodo Payments checkout session server-side.
 * Returns checkout URL — user is redirected to Dodo-hosted checkout.
 */
export async function createCheckoutSession(
  planId: string,
  token: string
): Promise<{ checkout_url: string }> {
  return request<{ checkout_url: string }>('/api/payments/create-checkout', {
    method: 'POST',
    body: { plan_id: planId },
    token,
  });
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
