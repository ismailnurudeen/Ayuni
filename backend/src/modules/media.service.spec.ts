import { newDb } from "pg-mem";
import { Pool } from "pg";
import { DatabaseService } from "../database/database.service";
import { MediaService, ProfileMedia } from "./media.service";
import * as fs from "fs/promises";
import * as path from "path";

// Helper: create a small valid base64 JPEG data URL (1x1 pixel)
const TINY_JPEG_BASE64 =
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRof" +
  "Hh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwh" +
  "MjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAAR" +
  "CAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAA" +
  "AAD/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMR" +
  "AD8AKwA//9k=";

function makeDataUrl(): string {
  return `data:image/jpeg;base64,${TINY_JPEG_BASE64}`;
}

describe("MediaService", () => {
  let pool: Pool;
  let databaseService: DatabaseService;
  let mediaService: MediaService;
  const testUserId = "test-media-user";

  beforeEach(async () => {
    const db = newDb({ autoCreateForeignKeyIndices: true });
    const adapter = db.adapters.createPg();
    pool = new adapter.Pool();
    databaseService = new DatabaseService({ pool });
    await databaseService.onModuleInit();
    mediaService = new MediaService(databaseService);

    // Insert a test user for foreign key constraints
    await pool.query(
      "INSERT INTO users (id, phone_number) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [testUserId, "+2348000000001"]
    );
  });

  afterEach(async () => {
    // Clean up uploaded files
    try {
      const uploadsDir = path.join(process.cwd(), "uploads");
      const files = await fs.readdir(uploadsDir);
      for (const file of files) {
        if (file.startsWith(testUserId)) {
          await fs.unlink(path.join(uploadsDir, file));
        }
      }
    } catch (_) {
      // uploads dir may not exist in test
    }
    await databaseService.onModuleDestroy();
  });

  describe("uploadMedia", () => {
    it("uploads a valid image and returns id and url", async () => {
      const result = await mediaService.uploadMedia(testUserId, makeDataUrl(), "image");

      expect(result.id).toBeDefined();
      expect(result.url).toMatch(/^\/uploads\//);
      expect(result.mediaType).toBe("image");
    });

    it("sets display_order sequentially for multiple uploads", async () => {
      await mediaService.uploadMedia(testUserId, makeDataUrl(), "image");
      await mediaService.uploadMedia(testUserId, makeDataUrl(), "image");

      const media = await mediaService.getUserMedia(testUserId);
      expect(media).toHaveLength(2);
      expect(media[0].displayOrder).toBe(0);
      expect(media[1].displayOrder).toBe(1);
    });

    it("rejects upload when at 6-item limit", async () => {
      // Upload 6 images
      for (let i = 0; i < 6; i++) {
        await mediaService.uploadMedia(testUserId, makeDataUrl(), "image");
      }

      // 7th should fail
      await expect(
        mediaService.uploadMedia(testUserId, makeDataUrl(), "image")
      ).rejects.toThrow("Maximum 6 media items allowed");
    });

    it("rejects invalid data URL format", async () => {
      await expect(
        mediaService.uploadMedia(testUserId, "not-a-data-url", "image")
      ).rejects.toThrow("Invalid data URL format");
    });

    it("rejects files exceeding size limit", async () => {
      // Create a data URL over 10MB
      const largeBase64 = Buffer.alloc(11 * 1024 * 1024).toString("base64");
      const largeDataUrl = `data:image/jpeg;base64,${largeBase64}`;

      await expect(
        mediaService.uploadMedia(testUserId, largeDataUrl, "image")
      ).rejects.toThrow("File size exceeds 10MB limit");
    });
  });

  describe("deleteMedia", () => {
    it("deletes an existing media item", async () => {
      const uploaded = await mediaService.uploadMedia(testUserId, makeDataUrl(), "image");
      await mediaService.deleteMedia(testUserId, uploaded.id);

      const media = await mediaService.getUserMedia(testUserId);
      expect(media).toHaveLength(0);
    });

    it("reorders remaining items after deletion", async () => {
      const first = await mediaService.uploadMedia(testUserId, makeDataUrl(), "image");
      const second = await mediaService.uploadMedia(testUserId, makeDataUrl(), "image");
      const third = await mediaService.uploadMedia(testUserId, makeDataUrl(), "image");

      // Delete the first item (order 0)
      await mediaService.deleteMedia(testUserId, first.id);

      const remaining = await mediaService.getUserMedia(testUserId);
      expect(remaining).toHaveLength(2);
      expect(remaining[0].id).toBe(second.id);
      expect(remaining[0].displayOrder).toBe(0);
      expect(remaining[1].id).toBe(third.id);
      expect(remaining[1].displayOrder).toBe(1);
    });

    it("rejects deletion of non-existent media", async () => {
      await expect(
        mediaService.deleteMedia(testUserId, "nonexistent-id")
      ).rejects.toThrow("Media not found");
    });

    it("rejects deletion of another user's media", async () => {
      const uploaded = await mediaService.uploadMedia(testUserId, makeDataUrl(), "image");

      await expect(
        mediaService.deleteMedia("different-user", uploaded.id)
      ).rejects.toThrow("Media not found");
    });
  });

  describe("reorderMedia", () => {
    it("reorders media to new order", async () => {
      const first = await mediaService.uploadMedia(testUserId, makeDataUrl(), "image");
      const second = await mediaService.uploadMedia(testUserId, makeDataUrl(), "image");
      const third = await mediaService.uploadMedia(testUserId, makeDataUrl(), "image");

      // Reverse the order
      await mediaService.reorderMedia(testUserId, [third.id, second.id, first.id]);

      const media = await mediaService.getUserMedia(testUserId);
      expect(media[0].id).toBe(third.id);
      expect(media[0].displayOrder).toBe(0);
      expect(media[1].id).toBe(second.id);
      expect(media[1].displayOrder).toBe(1);
      expect(media[2].id).toBe(first.id);
      expect(media[2].displayOrder).toBe(2);
    });

    it("rejects reorder with invalid media IDs", async () => {
      await mediaService.uploadMedia(testUserId, makeDataUrl(), "image");

      await expect(
        mediaService.reorderMedia(testUserId, ["fake-id-1", "fake-id-2"])
      ).rejects.toThrow("Invalid media IDs provided");
    });

    it("rejects reorder with IDs belonging to another user", async () => {
      const uploaded = await mediaService.uploadMedia(testUserId, makeDataUrl(), "image");

      await expect(
        mediaService.reorderMedia("different-user", [uploaded.id])
      ).rejects.toThrow("Invalid media IDs provided");
    });
  });

  describe("getUserMedia", () => {
    it("returns empty array for user with no media", async () => {
      const media = await mediaService.getUserMedia(testUserId);
      expect(media).toEqual([]);
    });

    it("returns media sorted by display_order", async () => {
      const first = await mediaService.uploadMedia(testUserId, makeDataUrl(), "image");
      const second = await mediaService.uploadMedia(testUserId, makeDataUrl(), "image");
      const third = await mediaService.uploadMedia(testUserId, makeDataUrl(), "image");

      // Reorder: 3, 1, 2
      await mediaService.reorderMedia(testUserId, [third.id, first.id, second.id]);

      const media = await mediaService.getUserMedia(testUserId);
      expect(media.map((m: ProfileMedia) => m.id)).toEqual([third.id, first.id, second.id]);
    });

    it("includes correct fields in returned media", async () => {
      await mediaService.uploadMedia(testUserId, makeDataUrl(), "image");

      const media = await mediaService.getUserMedia(testUserId);
      expect(media).toHaveLength(1);
      expect(media[0]).toMatchObject({
        userId: testUserId,
        mediaType: "image",
        displayOrder: 0,
      });
      expect(media[0].storageUrl).toMatch(/^\/uploads\//);
      expect(media[0].uploadedAt).toBeDefined();
    });
  });
});
