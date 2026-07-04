import { query } from '../db.js';

export class WebhookEventRepository {
  /**
   * Check if a webhook event has already been processed
   */
  static async isProcessed(eventId: string): Promise<boolean> {
    const result = await query(
      'SELECT 1 FROM webhook_events WHERE event_id = $1',
      [eventId]
    );
    return result.rows.length > 0;
  }

  /**
   * Mark a webhook event as processed (idempotent)
   */
  static async markProcessed(eventId: string, eventType: string): Promise<void> {
    await query(
      `INSERT INTO webhook_events (event_id, event_type)
       VALUES ($1, $2)
       ON CONFLICT (event_id) DO NOTHING`,
      [eventId, eventType]
    );
  }

  /**
   * Clean up old events (events older than `daysOld` days)
   */
  static async cleanOldEvents(daysOld: number = 7): Promise<void> {
    await query(
      'DELETE FROM webhook_events WHERE created_at < CURRENT_TIMESTAMP - ($1::int * INTERVAL \'1 day\')',
      [daysOld]
    );
  }
}
