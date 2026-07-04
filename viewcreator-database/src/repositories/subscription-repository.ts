import { query } from '../db.js';

export interface UserSubscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: 'active' | 'canceled' | 'past_due' | 'incomplete' | 'trialing' | 'expired';
  current_period_start: Date | null;
  current_period_end: Date | null;
  canceled_at: Date | null;
  dodo_subscription_id: string | null;
  dodo_customer_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export class SubscriptionRepository {
  /**
   * Get a user's active subscription
   */
  static async findActiveByUserId(userId: string): Promise<UserSubscription | null> {
    const result = await query<UserSubscription>(
      `SELECT * FROM user_subscriptions
       WHERE user_id = $1 AND status IN ('active', 'trialing', 'past_due')
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  /**
   * Find a subscription by Dodo Payments subscription ID
   */
  static async findByDodoSubscriptionId(dodoSubscriptionId: string): Promise<UserSubscription | null> {
    const result = await query<UserSubscription>(
      'SELECT * FROM user_subscriptions WHERE dodo_subscription_id = $1',
      [dodoSubscriptionId]
    );
    return result.rows[0] || null;
  }

  /**
   * Create a new subscription record
   */
  static async create(data: {
    user_id: string;
    plan_id: string;
    status: UserSubscription['status'];
    current_period_start?: Date;
    current_period_end?: Date;
    dodo_subscription_id?: string;
    dodo_customer_id?: string;
  }): Promise<UserSubscription> {
    const result = await query<UserSubscription>(
      `INSERT INTO user_subscriptions (user_id, plan_id, status, current_period_start, current_period_end, dodo_subscription_id, dodo_customer_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.user_id,
        data.plan_id,
        data.status,
        data.current_period_start ?? null,
        data.current_period_end ?? null,
        data.dodo_subscription_id ?? null,
        data.dodo_customer_id ?? null,
      ]
    );
    return result.rows[0];
  }

  /**
   * Update subscription status and period
   */
  static async updateByDodoId(
    dodoSubscriptionId: string,
    updates: {
      status?: UserSubscription['status'];
      current_period_start?: Date;
      current_period_end?: Date;
      canceled_at?: Date | null;
      plan_id?: string;
      dodo_customer_id?: string;
    }
  ): Promise<UserSubscription | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }
    if (updates.current_period_start !== undefined) {
      fields.push(`current_period_start = $${paramIndex++}`);
      values.push(updates.current_period_start);
    }
    if (updates.current_period_end !== undefined) {
      fields.push(`current_period_end = $${paramIndex++}`);
      values.push(updates.current_period_end);
    }
    if (updates.canceled_at !== undefined) {
      fields.push(`canceled_at = $${paramIndex++}`);
      values.push(updates.canceled_at);
    }
    if (updates.plan_id !== undefined) {
      fields.push(`plan_id = $${paramIndex++}`);
      values.push(updates.plan_id);
    }
    if (updates.dodo_customer_id !== undefined) {
      fields.push(`dodo_customer_id = $${paramIndex++}`);
      values.push(updates.dodo_customer_id);
    }

    if (fields.length === 0) return null;

    values.push(dodoSubscriptionId);
    const result = await query<UserSubscription>(
      `UPDATE user_subscriptions SET ${fields.join(', ')} WHERE dodo_subscription_id = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  /**
   * Cancel a subscription
   */
  static async cancel(dodoSubscriptionId: string): Promise<UserSubscription | null> {
    const result = await query<UserSubscription>(
      `UPDATE user_subscriptions
       SET status = 'canceled', canceled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE dodo_subscription_id = $1
       RETURNING *`,
      [dodoSubscriptionId]
    );
    return result.rows[0] || null;
  }
}
