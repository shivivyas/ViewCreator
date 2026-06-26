"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const db_js_1 = require("../db.js");
class UserRepository {
    /**
     * Find a user by their unique ID
     */
    static async findById(id) {
        const result = await (0, db_js_1.query)('SELECT id, email, name, created_at, updated_at FROM users WHERE id = $1', [id]);
        return result.rows[0] || null;
    }
    /**
     * Find a user by their unique email address
     */
    static async findByEmail(email) {
        const result = await (0, db_js_1.query)('SELECT id, email, name, created_at, updated_at FROM users WHERE email = $1', [email]);
        return result.rows[0] || null;
    }
    /**
     * Create a new user
     */
    static async create(userData) {
        const result = await (0, db_js_1.query)('INSERT INTO users (email, name) VALUES ($1, $2) RETURNING id, email, name, created_at, updated_at', [userData.email, userData.name || null]);
        return result.rows[0];
    }
    /**
     * Update an existing user's details
     */
    static async update(id, updates) {
        const fields = [];
        const values = [];
        let paramIndex = 1;
        if (updates.email !== undefined) {
            fields.push(`email = $${paramIndex++}`);
            values.push(updates.email);
        }
        if (updates.name !== undefined) {
            fields.push(`name = $${paramIndex++}`);
            values.push(updates.name);
        }
        if (fields.length === 0) {
            return this.findById(id);
        }
        values.push(id);
        const queryText = `
      UPDATE users 
      SET ${fields.join(', ')} 
      WHERE id = $${paramIndex} 
      RETURNING id, email, name, created_at, updated_at
    `;
        const result = await (0, db_js_1.query)(queryText, values);
        return result.rows[0] || null;
    }
    /**
     * Delete a user by ID
     */
    static async delete(id) {
        const result = await (0, db_js_1.query)('DELETE FROM users WHERE id = $1', [id]);
        return (result.rowCount ?? 0) > 0;
    }
}
exports.UserRepository = UserRepository;
//# sourceMappingURL=user-repository.js.map