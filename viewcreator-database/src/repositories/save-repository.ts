import { query } from '../db.js';

export interface SavedTemplate {
  id: string;
  template_id: string;
  user_id: string;
  created_at: Date;
}

export class SaveRepository {
  /**
   * Toggle a saved template. If already saved, unsaves it.
   */
  static async toggle(templateId: string, userId: string): Promise<{ saved: boolean }> {
    const existing = await query(
      'SELECT id FROM saved_templates WHERE template_id = $1 AND user_id = $2',
      [templateId, userId]
    );

    if (existing.rows.length > 0) {
      await query(
        'DELETE FROM saved_templates WHERE template_id = $1 AND user_id = $2',
        [templateId, userId]
      );
      return { saved: false };
    } else {
      await query(
        'INSERT INTO saved_templates (template_id, user_id) VALUES ($1, $2)',
        [templateId, userId]
      );
      return { saved: true };
    }
  }

  /**
   * Get all template IDs saved by a user.
   */
  static async findSavedIds(userId: string): Promise<string[]> {
    const result = await query<{ template_id: string }>(
      'SELECT template_id FROM saved_templates WHERE user_id = $1',
      [userId]
    );
    return result.rows.map(r => r.template_id);
  }
}
