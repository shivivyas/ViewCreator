import { query } from '../db.js';

export interface Template {
  id: string;
  title: string;
  description: string | null;
  s3_link: string;
  config: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export class TemplateRepository {
  /**
   * Find a template by its unique ID
   */
  static async findById(id: string): Promise<Template | null> {
    const result = await query<Template>(
      'SELECT id, title, description, s3_link, config, created_at, updated_at FROM templates WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Get all available templates
   */
  static async findAll(): Promise<Template[]> {
    const result = await query<Template>(
      'SELECT id, title, description, s3_link, config, created_at, updated_at FROM templates ORDER BY created_at DESC'
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
    config?: Record<string, any>;
  }): Promise<Template> {
    const result = await query<Template>(
      'INSERT INTO templates (title, description, s3_link, config) VALUES ($1, $2, $3, $4) RETURNING id, title, description, s3_link, config, created_at, updated_at',
      [
        templateData.title,
        templateData.description || null,
        templateData.s3_link,
        JSON.stringify(templateData.config || {}),
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
      config?: Record<string, any>;
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
    if (updates.config !== undefined) {
      fields.push(`config = $${paramIndex++}`);
      values.push(JSON.stringify(updates.config));
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const queryText = `
      UPDATE templates 
      SET ${fields.join(', ')} 
      WHERE id = $${paramIndex} 
      RETURNING id, title, description, s3_link, config, created_at, updated_at
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
