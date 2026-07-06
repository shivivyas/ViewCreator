import { query } from '../db.js';

export class WebhookEventRepository {
  /**
   * Atomically try to claim an idempotency key.
   * Returns true if the key was claimed (first time), false if already existed.
   * Eliminates the TOCTOU race between isProcessed() + markProcessed().
   */
  static async tryClaim(eventId: string, eventType: string): Promise<boolean> {
    const start = Date.now();
    const result = await query(
      `INSERT INTO webhook_events (event_id, event_type)
       VALUES ($1, $2)
       ON CONFLICT (event_id) DO NOTHING`,
      [eventId, eventType]
    );
    const claimed = (result.rowCount ?? 0) > 0;
    console.log(`[WebhookRepository.tryClaim] key=${eventId} type=${eventType} claimed=${claimed} rowCount=${result.rowCount} duration=${Date.now() - start}ms`);
    return claimed;
  }

  /**
   * Check if a webhook event has already been processed
   * @deprecated Use tryClaim() for atomic check-and-claim instead.
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
   * @deprecated Use tryClaim() for atomic check-and-claim instead.
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
