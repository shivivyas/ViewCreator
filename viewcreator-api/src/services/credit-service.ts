import { CreditRepository, SubscriptionRepository } from 'viewcreator-database';
import type { CreditGuardResult, CreditDeductionResult } from 'viewcreator-shared';

/**
 * Check if a user can perform an operation that costs `cost` credits.
 * - Subscription users always pass (unlimited access).
 * - Credit users must have sufficient balance.
 *
 * Returns the result WITHOUT deducting — deduction happens AFTER
 * a successful operation using `deductCredits`.
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

  // 2. Check credit balance (read-only, no lock)
  // Use ensureUser to auto-create the row if missing (consistent with GET /api/payments/balance)
  const credits = await CreditRepository.ensureUser(userId);
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
 * Deduct credits after a successful operation using atomic row-level locking.
 * This prevents concurrent requests from over-drafting credits.
 * Subscription users skip deduction entirely.
 *
 * @param userId - The user to deduct from
 * @param cost - Number of credits to deduct
 * @param description - Human-readable description for the transaction log
 * @param metadata - Optional metadata to attach to the transaction
 * @returns The deduction result
 */
export async function deductCredits(
  userId: string,
  cost: number,
  description: string,
  metadata: Record<string, any> = {}
): Promise<CreditDeductionResult> {
  // Check subscription again to avoid deducting from subscribers
  const subscription = await SubscriptionRepository.findActiveByUserId(userId);
  if (subscription && subscription.status === 'active') {
    return { success: true }; // Subscription users don't pay per-operation
  }

  // Use atomic check-and-deduct with row-level locking
  const result = await CreditRepository.checkAndDeductAtomic(userId, cost, description, metadata);
  
  if (!result.success) {
    console.warn(`[Credit] Deduction failed for user ${userId}:`, {
      reason: result.reason,
      cost,
      remaining: result.remaining,
      description,
    });
  }

  return result;
}
