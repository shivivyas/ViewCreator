import { query, transaction } from '../db.js';

export interface UserCredits {
  id: string;
  user_id: string;
  balance: number;
  lifetime_credits: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  type: 'purchase' | 'usage' | 'refund' | 'expiration' | 'grant';
  amount: number;
  balance_after: number;
  description: string | null;
  dodo_payment_id: string | null;
  dodo_subscription_id: string | null;
  metadata: Record<string, any>;
  created_at: Date;
}

export class CreditRepository {
  /**
   * Get a user's current credit balance
   */
  static async findByUserId(userId: string): Promise<UserCredits | null> {
    const result = await query<UserCredits>(
      'SELECT * FROM user_credits WHERE user_id = $1',
      [userId]
    );
    return result.rows[0] || null;
  }

  /**
   * Ensure a user_credits row exists (auto-create if missing)
   */
  static async ensureUser(userId: string): Promise<UserCredits> {
    const existing = await this.findByUserId(userId);
    if (existing) return existing;

    const result = await query<UserCredits>(
      `INSERT INTO user_credits (user_id, balance, lifetime_credits)
       VALUES ($1, 0, 0)
       RETURNING *`,
      [userId]
    );
    return result.rows[0];
  }

  /**
   * Atomic check-and-deduct with row-level locking.
   * Prevents concurrent requests from over-drafting credits.
   * Uses SELECT ... FOR UPDATE within a transaction.
   */
  static async checkAndDeductAtomic(
    userId: string,
    cost: number,
    description: string = 'Generation usage',
    metadata: Record<string, any> = {}
  ): Promise<{ success: boolean; remaining?: number; reason?: string }> {
    if (cost <= 0) return { success: false, reason: 'invalid_amount' };

    return await transaction(async (client) => {
      // Row-level lock — prevents concurrent deductions from other requests
      const lockResult = await client.query(
        'SELECT balance FROM user_credits WHERE user_id = $1 FOR UPDATE',
        [userId]
      );

      const currentBalance = lockResult.rows[0]?.balance ?? 0;

      if (currentBalance < cost) {
        return { success: false, reason: 'insufficient', remaining: currentBalance };
      }

      // Atomic deduct
      const updateResult = await client.query(
        `UPDATE user_credits
         SET balance = balance - $2, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND balance >= $2
         RETURNING balance`,
        [userId, cost]
      );

      if (updateResult.rows.length === 0) {
        return { success: false, reason: 'race_lost', remaining: currentBalance };
      }

      // Log the transaction in the same transaction
      await client.query(
        `INSERT INTO credit_transactions (user_id, type, amount, balance_after, description, metadata)
         VALUES ($1, 'usage', $2, $3, $4, $5)`,
        [userId, -cost, updateResult.rows[0].balance, description, JSON.stringify(metadata)]
      );

      return { success: true, remaining: updateResult.rows[0].balance };
    });
  }

  /**
   * Deduct credits atomically. Returns false if insufficient balance.
   * Uses a transaction to ensure balance update and audit log are atomic.
   */
  static async deductCredits(
    userId: string,
    amount: number,
    description: string = 'Generation usage',
    metadata: Record<string, any> = {}
  ): Promise<boolean> {
    if (amount <= 0) return false;

    return await transaction(async (client) => {
      // Atomic UPDATE with balance check — wrapped in transaction
      const updateResult = await client.query(
        `UPDATE user_credits
         SET balance = balance - $2, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND balance >= $2
         RETURNING *`,
        [userId, amount]
      );

      if (updateResult.rows.length === 0) return false;

      // Log the transaction in the same transaction
      await client.query(
        `INSERT INTO credit_transactions (user_id, type, amount, balance_after, description, metadata)
         VALUES ($1, 'usage', $2, $3, $4, $5)`,
        [userId, -amount, updateResult.rows[0].balance, description, JSON.stringify(metadata)]
      );

      return true;
    });
  }

  /**
   * Add credits to a user's balance (for purchases, grants, refunds)
   */
  static async addCredits(
    userId: string,
    amount: number,
    type: CreditTransaction['type'],
    description: string,
    metadata: Record<string, any> = {}
  ): Promise<UserCredits> {
    if (amount <= 0) throw new Error('Amount must be positive');

    const userCredits = await this.ensureUser(userId);

    return await transaction(async (client) => {
      const updateResult = await client.query(
        `UPDATE user_credits
         SET balance = balance + $2, lifetime_credits = lifetime_credits + $2, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1
         RETURNING *`,
        [userId, amount]
      );

      await client.query(
        `INSERT INTO credit_transactions (user_id, type, amount, balance_after, description, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, type, amount, updateResult.rows[0].balance, description, JSON.stringify(metadata)]
      );

      return updateResult.rows[0];
    });
  }

  /**
   * Get recent credit transactions for a user
   */
  static async getTransactions(userId: string, limit: number = 20): Promise<CreditTransaction[]> {
    const result = await query<CreditTransaction>(
      'SELECT * FROM credit_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
      [userId, limit]
    );
    return result.rows;
  }

  /**
   * Check if a user has already purchased a specific plan recently (within last hour).
   * Used by confirm-purchase endpoint for idempotency.
   */
  static async getRecentPurchase(userId: string, planId: string): Promise<CreditTransaction | null> {
    const result = await query<CreditTransaction>(
      `SELECT * FROM credit_transactions
       WHERE user_id = $1
         AND type = 'purchase'
         AND metadata @> $2::jsonb
         AND created_at > NOW() - INTERVAL '1 hour'
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId, JSON.stringify({ plan_id: planId })]
    );
    return result.rows[0] || null;
  }

  /**
   * Atomic deduction with idempotency key.
   * Same key = same result (no double-deduct).
   *
   * Uses the webhook_events table as an idempotency store.
   * If the idempotency_key has already been processed, returns the cached result.
   * Otherwise, performs the deduction atomically and records the key.
   */
  static async deductWithIdempotency(
    userId: string,
    amount: number,
    idempotencyKey: string,
    description: string = 'Credit deduction',
    metadata: Record<string, any> = {}
  ): Promise<{ success: boolean; remaining?: number; reason?: string; deducted?: number }> {
    if (amount <= 0) {
      return { success: false, reason: 'invalid_amount' };
    }

    // 1. Check idempotency — if already processed, return cached result
    const existing = await query(
      'SELECT 1 FROM webhook_events WHERE event_id = $1',
      [idempotencyKey]
    );
    if (existing.rows.length > 0) {
      // Look up the resulting transaction to get balance after
      const txResult = await query<CreditTransaction>(
        `SELECT * FROM credit_transactions
         WHERE user_id = $1
           AND type = 'usage'
           AND amount = $2
           AND created_at > NOW() - INTERVAL '5 minutes'
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId, -amount]
      );
      return {
        success: true,
        remaining: txResult.rows[0]?.balance_after ?? 0,
        deducted: amount,
      };
    }

    // 2. Perform the atomic deduction within a transaction
    return await transaction(async (client) => {
      // Row-level lock — prevents concurrent deductions
      const lockResult = await client.query(
        'SELECT balance FROM user_credits WHERE user_id = $1 FOR UPDATE',
        [userId]
      );

      const currentBalance = lockResult.rows[0]?.balance ?? 0;

      if (currentBalance < amount) {
        return { success: false, reason: 'insufficient', remaining: currentBalance };
      }

      // Atomic deduct
      const updateResult = await client.query(
        `UPDATE user_credits
         SET balance = balance - $2, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND balance >= $2
         RETURNING balance`,
        [userId, amount]
      );

      if (updateResult.rows.length === 0) {
        return { success: false, reason: 'race_lost', remaining: currentBalance };
      }

      const balanceAfter = updateResult.rows[0].balance;

      // Log the credit transaction in the same transaction
      await client.query(
        `INSERT INTO credit_transactions (user_id, type, amount, balance_after, description, metadata)
         VALUES ($1, 'usage', $2, $3, $4, $5)`,
        [userId, -amount, balanceAfter, description, JSON.stringify(metadata)]
      );

      // Record idempotency key in webhook_events table
      await client.query(
        `INSERT INTO webhook_events (event_id, event_type)
         VALUES ($1, 'credit_deduction')
         ON CONFLICT (event_id) DO NOTHING`,
        [idempotencyKey]
      );

      return { success: true, remaining: balanceAfter, deducted: amount };
    });
  }
}
