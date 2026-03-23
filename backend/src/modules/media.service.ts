import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { PoolClient } from "pg";
import { randomUUID } from "crypto";
import * as fs from "fs/promises";
import * as path from "path";

export type MediaUploadResult = {
  id: string;
  url: string;
  mediaType: "image" | "video";
};

export type ProfileMedia = {
  id: string;
  userId: string;
  mediaType: "image" | "video";
  storageUrl: string;
  displayOrder: number;
  uploadedAt: Date;
};

@Injectable()
export class MediaService {
  private readonly UPLOADS_DIR = path.join(process.cwd(), "uploads");
  private readonly MAX_MEDIA_COUNT = 6;
  private readonly MAX_FILE_SIZE_MB = 10;

  constructor(private readonly database: DatabaseService) {
    // Ensure uploads directory exists
    this.ensureUploadsDir();
  }

  private async ensureUploadsDir() {
    try {
      await fs.mkdir(this.UPLOADS_DIR, { recursive: true });
    } catch (error) {
      console.error("Failed to create uploads directory:", error);
    }
  }

  /**
   * Upload media (image or video) for a user's profile
   * For MVP, accepts base64 data URL and stores as file
   */
  async uploadMedia(
    userId: string,
    dataUrl: string,
    mediaType: "image" | "video",
    client?: PoolClient
  ): Promise<MediaUploadResult> {
    if (client) {
      return this.uploadMediaWithClient(userId, dataUrl, mediaType, client);
    }
    
    return this.database.withTransaction(async (c) => {
      return this.uploadMediaWithClient(userId, dataUrl, mediaType, c);
    });
  }

  private async uploadMediaWithClient(
    userId: string,
    dataUrl: string,
    mediaType: "image" | "video",
    client: PoolClient
  ): Promise<MediaUploadResult> {
    // Check current media count
    const countResult = await client.query(
      "SELECT COUNT(*) as count FROM profile_media WHERE user_id = $1",
      [userId]
    );
    
    if (parseInt(countResult.rows[0].count) >= this.MAX_MEDIA_COUNT) {
      throw new Error(`Maximum ${this.MAX_MEDIA_COUNT} media items allowed`);
    }

    // Parse data URL (format: data:image/png;base64,...)
    const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      throw new Error("Invalid data URL format");
    }

    const mimeType = matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, "base64");

    // Check file size (in bytes)
    const fileSizeBytes = buffer.length;
    const fileSizeMB = fileSizeBytes / (1024 * 1024);
    if (fileSizeMB > this.MAX_FILE_SIZE_MB) {
      throw new Error(`File size exceeds ${this.MAX_FILE_SIZE_MB}MB limit`);
    }

    // Generate unique filename
    const extension = mimeType.split("/")[1] || "jpg";
    const filename = `${userId}-${randomUUID()}.${extension}`;
    const filepath = path.join(this.UPLOADS_DIR, filename);

    // Save file
    await fs.writeFile(filepath, buffer);

    // Get next display order
    const orderResult = await client.query(
      "SELECT COALESCE(MAX(display_order), -1) + 1 as next_order FROM profile_media WHERE user_id = $1",
      [userId]
    );
    const displayOrder = orderResult.rows[0].next_order;

    // Insert database record
    const id = randomUUID();
    const storageUrl = `/uploads/${filename}`;

    await client.query(
      `INSERT INTO profile_media (id, user_id, media_type, storage_url, display_order, file_size_bytes, mime_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, userId, mediaType, storageUrl, displayOrder, fileSizeBytes, mimeType]
    );

    return {
      id,
      url: storageUrl,
      mediaType
    };
  }

  /**
   * Delete media item
   */
  async deleteMedia(userId: string, mediaId: string, client?: PoolClient): Promise<void> {
    if (client) {
      return this.deleteMediaWithClient(userId, mediaId, client);
    }
    
    return this.database.withTransaction(async (c) => {
      return this.deleteMediaWithClient(userId, mediaId, c);
    });
  }

  private async deleteMediaWithClient(userId: string, mediaId: string, client: PoolClient): Promise<void> {
    // Get media record
    const result = await client.query(
      "SELECT * FROM profile_media WHERE id = $1 AND user_id = $2",
      [mediaId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error("Media not found");
    }

    const media = result.rows[0];

    // Delete file from filesystem
    try {
      const filepath = path.join(process.cwd(), media.storage_url);
      await fs.unlink(filepath);
    } catch (error) {
      console.error("Failed to delete file:", error);
      // Continue with database deletion even if file deletion fails
    }

    // Delete database record
    await client.query(
      "DELETE FROM profile_media WHERE id = $1",
      [mediaId]
    );

    // Reorder remaining media
    await this.reorderAfterDelete(userId, media.display_order, client);
  }

  /**
   * Reorder media after deletion
   */
  private async reorderAfterDelete(userId: string, deletedOrder: number, client: PoolClient): Promise<void> {
    await client.query(
      `UPDATE profile_media 
       SET display_order = display_order - 1
       WHERE user_id = $1 AND display_order > $2`,
      [userId, deletedOrder]
    );
  }

  /**
   * Reorder media items
   * mediaIds should be in the desired order
   */
  async reorderMedia(userId: string, mediaIds: string[], client?: PoolClient): Promise<void> {
    if (client) {
      return this.reorderMediaWithClient(userId, mediaIds, client);
    }
    
    return this.database.withTransaction(async (c) => {
      return this.reorderMediaWithClient(userId, mediaIds, c);
    });
  }

  private async reorderMediaWithClient(userId: string, mediaIds: string[], client: PoolClient): Promise<void> {
    // Verify all media IDs belong to the user
    const result = await client.query(
      "SELECT id FROM profile_media WHERE user_id = $1",
      [userId]
    );

    const userMediaIds = result.rows.map(row => row.id);
    const allValid = mediaIds.every(id => userMediaIds.includes(id));

    if (!allValid) {
      throw new Error("Invalid media IDs provided");
    }

    // Update display order for each media item
    for (let i = 0; i < mediaIds.length; i++) {
      await client.query(
        "UPDATE profile_media SET display_order = $1 WHERE id = $2",
        [i, mediaIds[i]]
      );
    }
  }

  /**
   * Get all media for a user
   */
  async getUserMedia(userId: string, client?: PoolClient): Promise<ProfileMedia[]> {
    if (client) {
      return this.getUserMediaWithClient(userId, client);
    }
    
    return this.database.withTransaction(async (c) => {
      return this.getUserMediaWithClient(userId, c);
    });
  }

  private async getUserMediaWithClient(userId: string, client: PoolClient): Promise<ProfileMedia[]> {
    const result = await client.query(
      `SELECT * FROM profile_media 
       WHERE user_id = $1 
       ORDER BY display_order ASC`,
      [userId]
    );

    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      mediaType: row.media_type,
      storageUrl: row.storage_url,
      displayOrder: row.display_order,
      uploadedAt: row.uploaded_at
    }));
  }
}
