import { CreditRepository, SubscriptionRepository } from 'viewcreator-database';

export interface CreditGuardResult {
  allowed: boolean;
  reason?: 'subscription' | 'credits' | 'insufficient';
  credits_balance?: number;
  required?: number;
}

export const CREDIT_COSTS = {
  IMAGE_STANDARD: 1,
  IMAGE_PREMIUM: 2,
  VIDEO: 5,
  EDIT: 1,
} as const;

/**
 * Check if a user can perform a generation that costs `cost` credits.
 * - Subscription users always pass (unlimited).
 * - Credit users must have sufficient balance.
 *
 * Returns the result WITHOUT deducting — deduction happens AFTER
 * a successful generation.
 */
export async function checkCredits(
  userId: string,
  cost: number
): Promise<CreditGuardResult> {
  // 1. Check for active subscription first (unlimited access)
  const subscription = await SubscriptionRepository.findActiveByUserId(userId);
  if (subscription && subscription.status === 'active') {
    return { allowed: true, reason: 'subscription' };
  }

  // 2. Check credit balance
  const credits = await CreditRepository.findByUserId(userId);
  const balance = credits?.balance ?? 0;

  if (balance < cost) {
    return {
      allowed: false,
      reason: 'insufficient',
      credits_balance: balance,
      required: cost,
    };
  }

  return {
    allowed: true,
    reason: 'credits',
    credits_balance: balance - cost,
  };
}

/**
 * Deduct credits after a successful generation.
 * Only deducts for credit-based users (subscription users skip deduction).
 */
export async function deductForGeneration(
  userId: string,
  cost: number,
  description: string,
  metadata: Record<string, any> = {}
): Promise<void> {
  // Check subscription again to avoid deducting from subscribers
  const subscription = await SubscriptionRepository.findActiveByUserId(userId);
  if (subscription && subscription.status === 'active') {
    return; // Subscription users don't pay per-generation
  }

  await CreditRepository.deductCredits(userId, cost, description, metadata);
}
