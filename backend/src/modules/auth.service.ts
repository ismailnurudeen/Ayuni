import { Injectable } from "@nestjs/common";
import { PoolClient } from "pg";
import { randomBytes, createHash } from "crypto";
import { DatabaseService } from "../database/database.service";
import { FirebaseAuthService } from "./firebase-auth.service";
import { AuthTokens, Session } from "./app.types";

export interface SignInResult {
  userId: string;
  phoneNumber: string;
  tokens: AuthTokens;
}

@Injectable()
export class AuthService {
  // Access tokens expire in 15 minutes
  private readonly ACCESS_TOKEN_EXPIRY_MS = 15 * 60 * 1000;
  // Refresh tokens expire in 30 days
  private readonly REFRESH_TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000;

  constructor(
    private readonly database: DatabaseService,
    private readonly firebaseAuthService: FirebaseAuthService,
  ) {}

 /**
   * Create a new authenticated session for a user after successful verification
   */
  async createSession(userId: string, deviceInfo?: string, client?: PoolClient): Promise<AuthTokens> {
    const sessionId = this.generateSessionId();
    const accessToken = this.generateToken();
    const refreshToken = this.generateToken();
    const now = new Date();
    const accessTokenExpiresAt = new Date(now.getTime() + this.ACCESS_TOKEN_EXPIRY_MS);
    const refreshTokenExpiresAt = new Date(now.getTime() + this.REFRESH_TOKEN_EXPIRY_MS);

    // Hash tokens before storing in database
    const accessTokenHash = this.hashToken(accessToken);
    const refreshTokenHash = this.hashToken(refreshToken);

    const queryFn: any = client || this.database;
    await queryFn.query(
      `
      INSERT INTO sessions (
        id, user_id, access_token, refresh_token, 
        access_token_expires_at, refresh_token_expires_at,
        device_info, created_at, updated_at, last_used_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), NOW())
    `,
      [sessionId, userId, accessTokenHash, refreshTokenHash, accessTokenExpiresAt, refreshTokenExpiresAt, deviceInfo ?? null]
    );

    return {
      accessToken,
      refreshToken,
      accessTokenExpiresAt: accessTokenExpiresAt.toISOString(),
      refreshTokenExpiresAt: refreshTokenExpiresAt.toISOString()
    };
  }

  /**
   * Validate an access token and return the associated user ID
   */
  async validateAccessToken(accessToken: string): Promise<string | null> {
    const accessTokenHash = this.hashToken(accessToken);
    const result = await this.database.query<{ user_id: string; access_token_expires_at: string }>(
      `
      SELECT user_id, access_token_expires_at 
      FROM sessions 
      WHERE access_token = $1
    `,
      [accessTokenHash]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const session = result.rows[0];
    const expiresAt = new Date(session.access_token_expires_at);

    if (expiresAt < new Date()) {
      return null;
    }

    // Update last used timestamp
    await this.database.query(
      `
      UPDATE sessions 
      SET last_used_at = NOW() 
      WHERE access_token = $1
    `,
      [accessTokenHash]
    );

    return session.user_id;
  }

  /**
   * Refresh an expired access token using a valid refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthTokens | null> {
    const refreshTokenHash = this.hashToken(refreshToken);
    const result = await this.database.query<{
      id: string;
      user_id: string;
      refresh_token_expires_at: string;
    }>(
      `
      SELECT id, user_id, refresh_token_expires_at 
      FROM sessions 
      WHERE refresh_token = $1
    `,
      [refreshTokenHash]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const session = result.rows[0];
    const expiresAt = new Date(session.refresh_token_expires_at);

    if (expiresAt < new Date()) {
      // Refresh token expired, delete the session
      await this.database.query("DELETE FROM sessions WHERE id = $1", [session.id]);
      return null;
    }

    // Generate new access token
    const newAccessToken = this.generateToken();
    const newAccessTokenHash = this.hashToken(newAccessToken);
    const accessTokenExpiresAt = new Date(Date.now() + this.ACCESS_TOKEN_EXPIRY_MS);

    await this.database.query(
      `
      UPDATE sessions 
      SET access_token = $2, 
          access_token_expires_at = $3,
          updated_at = NOW(),
          last_used_at = NOW()
      WHERE id = $1
    `,
      [session.id, newAccessTokenHash, accessTokenExpiresAt]
    );

    return {
      accessToken: newAccessToken,
      refreshToken,
      accessTokenExpiresAt: accessTokenExpiresAt.toISOString(),
      refreshTokenExpiresAt: expiresAt.toISOString()
    };
  }

  /**
   * Invalidate a session (logout)
   */
  async invalidateSession(accessToken: string): Promise<boolean> {
    const accessTokenHash = this.hashToken(accessToken);
    const result = await this.database.query(
      `
      DELETE FROM sessions 
      WHERE access_token = $1
      RETURNING id
    `,
      [accessTokenHash]
    );

    return result.rows.length > 0;
  }

  /**
   * Invalidate all sessions for a user
   */
  async invalidateAllUserSessions(userId: string): Promise<number> {
    const result = await this.database.query(
      `
      DELETE FROM sessions 
      WHERE user_id = $1
      RETURNING id
    `,
      [userId]
    );

    return result.rows.length;
  }

  /**
   * Clean up expired sessions (can be run periodically)
   */
  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.database.query(
      `
      DELETE FROM sessions 
      WHERE refresh_token_expires_at < NOW()
      RETURNING id
    `
    );

    return result.rows.length;
  }

  /**
   * Authenticate via Firebase Phone Auth and create a session.
   * Firebase handles phone OTP verification on the client side;
   * the backend verifies the resulting ID token and signs the user in.
   */
  async signInWithFirebase(
    firebaseIdToken: string,
    deviceInfo?: string,
    client?: PoolClient
  ): Promise<SignInResult | { error: string }> {
    const firebaseResult = await this.firebaseAuthService.verifyIdToken(firebaseIdToken);
    if (!firebaseResult) {
      return { error: "invalid_token" };
    }

    const tokens = await this.createSession(firebaseResult.phoneNumber, deviceInfo, client);
    return {
      userId: firebaseResult.phoneNumber,
      phoneNumber: firebaseResult.phoneNumber,
      tokens,
    };
  }

  private generateToken(): string {
    // Generate a cryptographically secure random token
    return randomBytes(32).toString("base64url");
  }

  private generateSessionId(): string {
    return `sess-${Date.now()}-${randomBytes(8).toString("hex")}`;
  }

  private hashToken(token: string): string {
    // Hash tokens with SHA-256 before storing in database
    // This protects against database compromises
    return createHash("sha256").update(token).digest("hex");
  }
}
