import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "./auth.service";
import { FirebaseAuthService } from "./firebase-auth.service";
import { DatabaseService } from "../database/database.service";

describe("AuthService", () => {
  let authService: AuthService;
  let databaseService: DatabaseService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DatabaseService, FirebaseAuthService, AuthService]
    }).compile();

    databaseService = module.get<DatabaseService>(DatabaseService);
    authService = module.get<AuthService>(AuthService);

    await databaseService.onModuleInit();
  });

  afterAll(async () => {
    await databaseService.onModuleDestroy();
  });

  async function createTestUser(userId: string) {
    await databaseService.query(
      "INSERT INTO users (id, phone_number, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) ON CONFLICT (id) DO NOTHING",
      [userId, `+234${Math.random().toString().substring(2, 12)}`]
    );
  }

  describe("session management", () => {
    it("should create a session with valid tokens", async () => {
      const userId = "test-user-1";
      await createTestUser(userId);
      const tokens = await authService.createSession(userId, "test-device");

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.accessTokenExpiresAt).toBeDefined();
      expect(tokens.refreshTokenExpiresAt).toBeDefined();
    });

    it("should validate a valid access token", async () => {
      const userId = "test-user-2";
      await createTestUser(userId);
      const tokens = await authService.createSession(userId);

      const validatedUserId = await authService.validateAccessToken(tokens.accessToken);

      expect(validatedUserId).toBe(userId);
    });

    it("should reject an invalid access token", async () => {
      const validatedUserId = await authService.validateAccessToken("invalid-token");

      expect(validatedUserId).toBeNull();
    });

    it("should refresh a valid refresh token", async () => {
      const userId = "test-user-3";
      await createTestUser(userId);
      const tokens = await authService.createSession(userId);

      const newTokens = await authService.refreshAccessToken(tokens.refreshToken);

      expect(newTokens).not.toBeNull();
      expect(newTokens?.accessToken).toBeDefined();
      expect(newTokens?.accessToken).not.toBe(tokens.accessToken);
      expect(newTokens?.refreshToken).toBe(tokens.refreshToken);
    });

    it("should reject an invalid refresh token", async () => {
      const newTokens = await authService.refreshAccessToken("invalid-refresh-token");

      expect(newTokens).toBeNull();
    });

    it("should invalidate a session on logout", async () => {
      const userId = "test-user-4";
      await createTestUser(userId);
      const tokens = await authService.createSession(userId);

      const success = await authService.invalidateSession(tokens.accessToken);
      expect(success).toBe(true);

      const validatedUserId = await authService.validateAccessToken(tokens.accessToken);
      expect(validatedUserId).toBeNull();
    });

    it("should invalidate all sessions for a user", async () => {
      const userId = "test-user-5";
      await createTestUser(userId);
      await authService.createSession(userId, "device-1");
      await authService.createSession(userId, "device-2");
      await authService.createSession(userId, "device-3");

      const count = await authService.invalidateAllUserSessions(userId);

      expect(count).toBeGreaterThanOrEqual(3);
    });
  });
});
