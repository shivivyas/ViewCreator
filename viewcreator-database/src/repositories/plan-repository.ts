import { query } from '../db.js';

export interface SubscriptionPlan {
  id: string;
  name: string;
  type: 'credits' | 'subscription';
  credits: number;
  price_cents: number;
  currency: string;
  interval: 'month' | 'year' | null;
  features: string[];
  is_active: boolean;
  sort_order: number;
  dodo_product_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export class PlanRepository {
  /**
   * Get all active plans, sorted by sort_order
   */
  static async findAllActive(): Promise<SubscriptionPlan[]> {
    const result = await query<SubscriptionPlan>(
      'SELECT * FROM subscription_plans WHERE is_active = true ORDER BY sort_order ASC'
    );
    return result.rows;
  }

  /**
   * Get active plans filtered by type
   */
  static async findByType(type: 'credits' | 'subscription'): Promise<SubscriptionPlan[]> {
    const result = await query<SubscriptionPlan>(
      'SELECT * FROM subscription_plans WHERE is_active = true AND type = $1 ORDER BY sort_order ASC',
      [type]
    );
    return result.rows;
  }

  /**
   * Find a plan by its ID
   */
  static async findById(id: string): Promise<SubscriptionPlan | null> {
    const result = await query<SubscriptionPlan>(
      'SELECT * FROM subscription_plans WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Find a plan by its Dodo Payments product ID
   */
  static async findByDodoProductId(dodoProductId: string): Promise<SubscriptionPlan | null> {
    const result = await query<SubscriptionPlan>(
      'SELECT * FROM subscription_plans WHERE dodo_product_id = $1',
      [dodoProductId]
    );
    return result.rows[0] || null;
  }
}
