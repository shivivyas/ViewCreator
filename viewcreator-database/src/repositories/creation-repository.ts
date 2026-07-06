import { query, transaction } from '../db.js';

export interface UserCreation {
  id: string;
  user_id: string;
  media_type: 'image' | 'video';
  prompt: string;
  style: string;
  aspect_ratio: string;
  image_size: string;
  number_of_images: number;
  quality: string;
  thinking_level: string;
  duration: number | null;
  template_id: string | null;
  s3_urls: string[];
  reference_images: string[];
  thumbnail_url: string | null;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export interface CreateCreationParams {
  user_id: string;
  media_type: 'image' | 'video';
  prompt: string;
  style?: string;
  aspect_ratio?: string;
  image_size?: string;
  number_of_images?: number;
  quality?: string;
  thinking_level?: string;
  duration?: number | null;
  template_id?: string | null;
  s3_urls: string[];
  reference_images?: string[];
  thumbnail_url?: string | null;
  metadata?: Record<string, any>;
}

export class CreationRepository {
  /**
   * Get all creations for a user, newest first.
   */
  static async findByUserId(userId: string): Promise<UserCreation[]> {
    const result = await query<UserCreation>(
      `SELECT id, user_id, media_type, prompt, style, aspect_ratio, image_size,
              number_of_images, quality, thinking_level, duration, template_id,
              s3_urls, reference_images, thumbnail_url, metadata, created_at, updated_at
       FROM user_creations
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  /**
   * Get a single creation by ID (scoped to user for security).
   */
  static async findById(id: string, userId: string): Promise<UserCreation | null> {
    const result = await query<UserCreation>(
      `SELECT id, user_id, media_type, prompt, style, aspect_ratio, image_size,
              number_of_images, quality, thinking_level, duration, template_id,
              s3_urls, reference_images, thumbnail_url, metadata, created_at, updated_at
       FROM user_creations
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    return result.rows[0] || null;
  }

  /**
   * Create a new creation record after generation.
   */
  static async create(params: CreateCreationParams): Promise<UserCreation> {
    const result = await query<UserCreation>(
      `INSERT INTO user_creations (
         user_id, media_type, prompt, style, aspect_ratio, image_size,
         number_of_images, quality, thinking_level, duration, template_id,
         s3_urls, reference_images, thumbnail_url, metadata
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        params.user_id,
        params.media_type,
        params.prompt,
        params.style || 'None',
        params.aspect_ratio || '1:1',
        params.image_size || '1K',
        params.number_of_images || 1,
        params.quality || 'Standard',
        params.thinking_level || 'minimal',
        params.duration || null,
        params.template_id || null,
        JSON.stringify(params.s3_urls),
        JSON.stringify(params.reference_images || []),
        params.thumbnail_url || null,
        JSON.stringify(params.metadata || {}),
      ]
    );
    return result.rows[0];
  }

  /**
   * Update the images of an existing creation (e.g., after editor save).
   * Stores previous images in metadata.previousImages as a snapshot.
   */
  static async updateImages(
    id: string,
    userId: string,
    newS3Urls: string[],
    thumbnailUrl?: string | null
  ): Promise<UserCreation | null> {
    return await transaction(async (client) => {
      // Fetch current row to snapshot old images
      const current = await client.query(
        `SELECT s3_urls, metadata FROM user_creations WHERE id = $1 AND user_id = $2 FOR UPDATE`,
        [id, userId]
      );

      if (current.rows.length === 0) return null;

      const oldS3Urls = current.rows[0].s3_urls || [];
      const oldMetadata = current.rows[0].metadata || {};

      // Build snapshot history
      const previousImages = oldMetadata.previousImages || [];
      previousImages.push({
        s3_urls: oldS3Urls,
        saved_at: new Date().toISOString(),
      });

      const result = await client.query(
        `UPDATE user_creations
         SET s3_urls = $3,
             thumbnail_url = COALESCE($4, thumbnail_url),
             metadata = jsonb_set(
               metadata,
               '{previousImages}',
               $5::jsonb
             ),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [
          id,
          userId,
          JSON.stringify(newS3Urls),
          thumbnailUrl || null,
          JSON.stringify(previousImages),
        ]
      );

      return result.rows[0] || null;
    });
  }

  /**
   * Delete a creation (owner-only).
   */
  static async delete(id: string, userId: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM user_creations WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Delete all creations for a user (used by "Clear All").
   * Returns the count of deleted rows.
   */
  static async deleteAllByUserId(userId: string): Promise<number> {
    const result = await query(
      'DELETE FROM user_creations WHERE user_id = $1',
      [userId]
    );
    return result.rowCount ?? 0;
  }
}
