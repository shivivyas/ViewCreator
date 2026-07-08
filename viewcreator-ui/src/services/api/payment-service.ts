import { request } from '../base/api-client';
import type { SubscriptionPlan, UserPaymentStatus, CreditTransaction } from '@/types';

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
  token: string,
  successUrl?: string
): Promise<{ checkout_url: string }> {
  return request<{ checkout_url: string }>('/api/payments/create-checkout', {
    method: 'POST',
    body: { plan_id: planId, success_url: successUrl },
    token,
  });
}

/**
 * Fetch the authenticated user's credit transaction history.
 */
export async function getTransactions(token: string): Promise<{ transactions: CreditTransaction[] }> {
  return request<{ transactions: CreditTransaction[] }>('/api/payments/transactions', { token });
}
