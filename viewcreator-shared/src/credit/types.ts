/**
 * Result of a credit guard check (server-side).
 */
export interface CreditGuardResult {
  allowed: boolean;
  reason?: 'subscription' | 'credits' | 'insufficient';
  credits_balance?: number;
  required?: number;
}

/**
 * Core credit balance information for a user.
 */
export interface UserCredits {
  balance: number;
  lifetime_credits: number;
}

/**
 * Credit transaction types
 */
export type CreditTransactionType = 'purchase' | 'usage' | 'refund' | 'expiration' | 'grant';

/**
 * Credit transaction record
 */
export interface CreditTransaction {
  id: string;
  type: CreditTransactionType;
  amount: number;
  balance_after: number;
  description: string | null;
  dodo_payment_id: string | null;
  dodo_subscription_id: string | null;
  created_at: string;
}

/**
 * Deduction result returned by the credit service.
 */
export interface CreditDeductionResult {
  success: boolean;
  remaining?: number;
  reason?: string;
}
