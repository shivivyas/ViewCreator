"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateRepository = void 0;
const db_js_1 = require("../db.js");
class TemplateRepository {
    /**
     * Find a template by its unique ID
     */
    static async findById(id) {
        const result = await (0, db_js_1.query)('SELECT id, title, description, s3_link, config, created_at, updated_at FROM templates WHERE id = $1', [id]);
        return result.rows[0] || null;
    }
    /**
     * Get all available templates
     */
    static async findAll() {
        const result = await (0, db_js_1.query)('SELECT id, title, description, s3_link, config, created_at, updated_at FROM templates ORDER BY created_at DESC');
        return result.rows;
    }
    /**
     * Create a new template
     */
    static async create(templateData) {
        const result = await (0, db_js_1.query)('INSERT INTO templates (title, description, s3_link, config) VALUES ($1, $2, $3, $4) RETURNING id, title, description, s3_link, config, created_at, updated_at', [
            templateData.title,
            templateData.description || null,
            templateData.s3_link,
            JSON.stringify(templateData.config || {}),
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