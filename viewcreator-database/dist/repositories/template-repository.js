"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateRepository = void 0;
const db_js_1 = require("../db.js");
class TemplateRepository {
    /**
     * Find a template by its unique ID
     */
    static async findById(id) {
        const result = await (0, db_js_1.query)('SELECT id, title, description, s3_link, media_type, config, user_id, created_at, updated_at FROM templates WHERE id = $1', [id]);
        return result.rows[0] || null;
    }
    /**
     * Get all available templates.
     * If a userId is passed, fetches public templates (user_id IS NULL) AND user's private templates.
     * If no userId is passed, fetches public templates only.
     * Optionally filter by media_type ('image' | 'video').
     */
    static async findAll(userId, mediaType) {
        if (userId) {
            const result = await (0, db_js_1.query)('SELECT id, title, description, s3_link, media_type, config, user_id, created_at, updated_at FROM templates WHERE (user_id IS NULL OR user_id = $1) AND ($2::varchar IS NULL OR media_type = $2) ORDER BY created_at DESC', [userId, mediaType || null]);
            return result.rows;
        }
        const result = await (0, db_js_1.query)('SELECT id, title, description, s3_link, media_type, config, user_id, created_at, updated_at FROM templates WHERE user_id IS NULL AND ($1::varchar IS NULL OR media_type = $1) ORDER BY created_at DESC', [mediaType || null]);
        return result.rows;
    }
    /**
     * Create a new template
     */
    static async create(templateData) {
        const result = await (0, db_js_1.query)('INSERT INTO templates (title, description, s3_link, media_type, config, user_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, title, description, s3_link, media_type, config, user_id, created_at, updated_at', [
            templateData.title,
            templateData.description || null,
            templateData.s3_link,
            templateData.media_type || 'image',
            JSON.stringify(templateData.config || {}),
            templateData.user_id || null
        ]);
        return result.rows[0];
    }
    /**
     * Update an existing template
     */
    static async update(id, updates) {
        const fields = [];
        const values = [];
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
        const result = await (0, db_js_1.query)(queryText, values);
        return result.rows[0] || null;
    }
    /**
     * Delete a template by ID
     */
    static async delete(id) {
        const result = await (0, db_js_1.query)('DELETE FROM templates WHERE id = $1', [id]);
        return (result.rowCount ?? 0) > 0;
    }
}
exports.TemplateRepository = TemplateRepository;
//# sourceMappingURL=template-repository.js.map