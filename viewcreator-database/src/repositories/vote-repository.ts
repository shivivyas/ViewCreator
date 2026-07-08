import { query } from '../db.js';

export interface TemplateWithVotes {
  id: string;
  title: string;
  description: string | null;
  s3_link: string;
  media_type: 'image' | 'video';
  config: Record<string, any>;
  user_id: string | null;
  created_at: Date;
  updated_at: Date;
  upvotes: number;
  user_upvoted: boolean;
  is_saved: boolean;
}

export class VoteRepository {
  /**
   * Toggle an upvote for a template. If the user already upvoted, removes it.
   */
  static async toggleUpvote(templateId: string, userId: string): Promise<{ upvoted: boolean }> {
    const existing = await query(
      'SELECT id FROM template_upvotes WHERE template_id = $1 AND user_id = $2',
      [templateId, userId]
    );

    if (existing.rows.length > 0) {
      await query(
        'DELETE FROM template_upvotes WHERE template_id = $1 AND user_id = $2',
        [templateId, userId]
      );
      return { upvoted: false };
    } else {
      await query(
        'INSERT INTO template_upvotes (template_id, user_id) VALUES ($1, $2)',
        [templateId, userId]
      );
      return { upvoted: true };
    }
  }

  /**
   * Get all templates with upvote counts, save status, and pagination.
   * @param savedOnly When true, only returns templates saved by the current user.
   */
  static async findAllWithVotes(
    currentUserId?: string,
    limit = 100,
    offset = 0,
    savedOnly = false
  ): Promise<TemplateWithVotes[]> {
    const userId = currentUserId || null;
    let whereClause = 'WHERE (t.user_id IS NULL OR t.user_id = $1)';
    const params: any[] = [userId, limit, offset];

    if (savedOnly && userId) {
      whereClause = 'WHERE st2.user_id IS NOT NULL';
    }

    const result = await query<TemplateWithVotes>(
      `SELECT 
        t.id, t.title, t.description, t.s3_link, t.media_type, t.config, t.user_id, t.created_at, t.updated_at,
        COALESCE(v.upvotes, 0)::integer AS upvotes,
        CASE WHEN uv.id IS NOT NULL THEN true ELSE false END AS user_upvoted,
        CASE WHEN st.id IS NOT NULL THEN true ELSE false END AS is_saved
      FROM templates t
      LEFT JOIN (
        SELECT template_id, COUNT(*) AS upvotes
        FROM template_upvotes
        GROUP BY template_id
      ) v ON v.template_id = t.id
      LEFT JOIN template_upvotes uv ON uv.template_id = t.id AND uv.user_id = $1
      LEFT JOIN saved_templates st ON st.template_id = t.id AND st.user_id = $1
      ${savedOnly ? 'LEFT JOIN saved_templates st2 ON st2.template_id = t.id AND st2.user_id = $1' : ''}
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT $2 OFFSET $3`,
      params
    );
    return result.rows;
  }

  /**
   * Get a single template with upvote count, save status, and whether the current user upvoted.
   */
  static async findByIdWithVotes(templateId: string, currentUserId?: string): Promise<TemplateWithVotes | null> {
    const result = await query<TemplateWithVotes>(
      `SELECT 
        t.id, t.title, t.description, t.s3_link, t.media_type, t.config, t.user_id, t.created_at, t.updated_at,
        COALESCE(v.upvotes, 0)::integer AS upvotes,
        CASE WHEN uv.id IS NOT NULL THEN true ELSE false END AS user_upvoted,
        CASE WHEN st.id IS NOT NULL THEN true ELSE false END AS is_saved
      FROM templates t
      LEFT JOIN (
        SELECT template_id, COUNT(*) AS upvotes
        FROM template_upvotes
        GROUP BY template_id
      ) v ON v.template_id = t.id
      LEFT JOIN template_upvotes uv ON uv.template_id = t.id AND uv.user_id = $1
      LEFT JOIN saved_templates st ON st.template_id = t.id AND st.user_id = $1
      WHERE t.id = $2`,
      [currentUserId || null, templateId]
    );
    return result.rows[0] || null;
  }

  /**
   * Get unique category tags from templates visible to the current user.
   * Guests only see tags from public templates (user_id IS NULL).
   * Signed-in users see tags from public + their own templates.
   */
  static async findCategories(currentUserId?: string): Promise<string[]> {
    const result = await query<{ tag: string }>(
      `SELECT DISTINCT jsonb_array_elements_text(t.config->'tags') AS tag
       FROM templates t
       WHERE (t.user_id IS NULL OR t.user_id = $1)
         AND t.config->'tags' IS NOT NULL
         AND jsonb_array_length(t.config->'tags') > 0
       ORDER BY tag`,
      [currentUserId || null]
    );
    return result.rows.map(r => r.tag);
  }
}
