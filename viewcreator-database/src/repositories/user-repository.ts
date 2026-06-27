import { query } from '../db.js';

export interface User {
  id: string;
  email: string;
  name: string | null;
  created_at: Date;
  updated_at: Date;
}

export class UserRepository {
  /**
   * Find a user by their unique ID
   */
  static async findById(id: string): Promise<User | null> {
    const result = await query<User>(
      'SELECT id, email, name, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Find a user by their unique email address
   */
  static async findByEmail(email: string): Promise<User | null> {
    const result = await query<User>(
      'SELECT id, email, name, created_at, updated_at FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  }

  /**
   * Create a new user
   */
  static async create(userData: { id: string; email: string; name?: string }): Promise<User> {
    const result = await query<User>(
      'INSERT INTO users (id, email, name) VALUES ($1, $2, $3) RETURNING id, email, name, created_at, updated_at',
      [userData.id, userData.email, userData.name || null]
    );
    return result.rows[0];
  }

  /**
   * Update an existing user's details
   */
  static async update(
    id: string,
    updates: { email?: string; name?: string }
  ): Promise<User | null> {
    const fields: string[] = [];
    const values: any[] = [];
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

    const result = await query<User>(queryText, values);
    return result.rows[0] || null;
  }

  /**
   * Delete a user by ID
   */
  static async delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM users WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
