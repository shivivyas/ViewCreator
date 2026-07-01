import { query } from '../db.js';

export interface Template {
  id: string;
  title: string;
  description: string | null;
  s3_link: string;
  media_type: 'image' | 'video';
  config: Record<string, any>;
  user_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export class TemplateRepository {
  /**
   * Find a template by its unique ID
   */
  static async findById(id: string): Promise<Template | null> {
    const result = await query<Template>(
      'SELECT id, title, description, s3_link, media_type, config, user_id, created_at, updated_at FROM templates WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Find a template by its S3 link (used for idempotent seeding)
   */
  static async findByS3Link(s3Link: string): Promise<Template | null> {
    const result = await query<Template>(
      'SELECT id, title, description, s3_link, media_type, config, user_id, created_at, updated_at FROM templates WHERE s3_link = $1 LIMIT 1',
      [s3Link]
    );
    return result.rows[0] || null;
  }

  /**
   * Get all available templates.
   * If a userId is passed, fetches public templates (user_id IS NULL) AND user's private templates.
   * If no userId is passed, fetches public templates only.
   * Optionally filter by media_type ('image' | 'video').
   */
  static async findAll(userId?: string, mediaType?: 'image' | 'video'): Promise<Template[]> {
    if (userId) {
      const result = await query<Template>(
        'SELECT id, title, description, s3_link, media_type, config, user_id, created_at, updated_at FROM templates WHERE (user_id IS NULL OR user_id = $1) AND ($2::varchar IS NULL OR media_type = $2) ORDER BY created_at DESC',
        [userId, mediaType || null]
      );
      return result.rows;
    }

    const result = await query<Template>(
      'SELECT id, title, description, s3_link, media_type, config, user_id, created_at, updated_at FROM templates WHERE user_id IS NULL AND ($1::varchar IS NULL OR media_type = $1) ORDER BY created_at DESC',
      [mediaType || null]
    );
    return result.rows;
  }

  /**
   * Create a new template
   */
  static async create(templateData: {
    title: string;
    description?: string;
    s3_link: string;
    media_type?: 'image' | 'video';
    config?: Record<string, any>;
    user_id?: string | null;
  }): Promise<Template> {
    const result = await query<Template>(
      'INSERT INTO templates (title, description, s3_link, media_type, config, user_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, title, description, s3_link, media_type, config, user_id, created_at, updated_at',
      [
        templateData.title,
        templateData.description || null,
        templateData.s3_link,
        templateData.media_type || 'image',
        JSON.stringify(templateData.config || {}),
        templateData.user_id || null
      ]
    );
    return result.rows[0];
  }

  /**
   * Update an existing template
   */
  static async update(
    id: string,
    updates: {
      title?: string;
      description?: string;
      s3_link?: string;
      media_type?: 'image' | 'video';
      config?: Record<string, any>;
      user_id?: string | null;
    }
  ): Promise<Template | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.title !== undefined) {
      fields.push(`title = $${paramIndex++}`);
      values.push(updates.title);
    }
    if (updates.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(updates.description);
    }
    if (updates.s3_link !== undefined) {
      fields.push(`s3_link = $${paramIndex++}`);
      values.push(updates.s3_link);
    }
    if (updates.media_type !== undefined) {
      fields.push(`media_type = $${paramIndex++}`);
      values.push(updates.media_type);
    }
    if (updates.config !== undefined) {
      fields.push(`config = $${paramIndex++}`);
      values.push(JSON.stringify(updates.config));
    }
    if (updates.user_id !== undefined) {
      fields.push(`user_id = $${paramIndex++}`);
      values.push(updates.user_id);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const queryText = `
      UPDATE templates 
      SET ${fields.join(', ')} 
      WHERE id = $${paramIndex} 
      RETURNING id, title, description, s3_link, media_type, config, user_id, created_at, updated_at
    `;

    const result = await query<Template>(queryText, values);
    return result.rows[0] || null;
  }

  /**
   * Delete a template by ID
   */
  static async delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM templates WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
