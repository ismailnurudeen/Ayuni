import { Injectable } from "@nestjs/common";
import { createHash, randomInt, randomUUID } from "crypto";
import { PoolClient } from "pg";

export type OtpResult =
  | { success: true; retryAfterSeconds: number }
  | { success: false; reason: "rate_limit" | "blocked" | "invalid_phone"; retryAfterSeconds?: number; blockedUntil?: Date };

export type VerificationResult =
  | { success: true }
  | { success: false; reason: "invalid_code" | "expired" | "max_attempts" | "not_found" };

@Injectable()
export class OtpService {
  private readonly OTP_LENGTH = 6;
  private readonly OTP_EXPIRY_MINUTES = 10;
  private readonly MAX_VERIFICATION_ATTEMPTS = 5;
  private readonly RESEND_COOLDOWN_SECONDS = 60;
  private readonly HOURLY_REQUEST_LIMIT = 5;
  private readonly ABUSE_BLOCK_HOURS = 24;

  /**
   * Generate a random 6-digit OTP code
   */
  private generateOtpCode(): string {
    const min = 100000;
    const max = 999999;
    return randomInt(min, max + 1).toString();
  }

  /**
   * Hash OTP code using SHA-256 (same pattern as auth tokens)
   */
  private hashOtpCode(code: string): string {
    return createHash("sha256").update(code).digest("hex");
  }

  /**
   * Validate Nigerian phone number format
   * Accepts: +234XXXXXXXXXX or 0XXXXXXXXXX (Nigerian format)
   */
  validateNigerianPhone(phoneNumber: string): boolean {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, "");

    // Nigerian numbers: +234 followed by 10 digits OR 0 followed by 10 digits
    const nigerianRegex = /^(234\d{10}|0\d{10})$/;
    return nigerianRegex.test(digits);
  }

  /**
   * Normalize phone number to E.164 format (+234XXXXXXXXXX)
   */
  normalizeNigerianPhone(phoneNumber: string): string {
    const digits = phoneNumber.replace(/\D/g, "");

    // If starts with 0, replace with 234
    if (digits.startsWith("0") && digits.length === 11) {
      return `+234${digits.substring(1)}`;
    }

    // If starts with 234, add +
    if (digits.startsWith("234") && digits.length === 13) {
      return `+${digits}`;
    }

    // Already normalized or invalid
    return phoneNumber;
  }

  /**
   * Check rate limits for phone number
   * Returns null if allowed, or retryAfterSeconds if rate limited
   */
  private async checkRateLimit(phoneNumber: string, client: PoolClient): Promise<number | null> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour window

    // Get or create rate limit record
    const rateLimitResult = await client.query(
      `SELECT * FROM otp_rate_limits WHERE phone_number = $1`,
      [phoneNumber]
    );

    if (rateLimitResult.rows.length === 0) {
      // No existing record, allow request
      return null;
    }

    const rateLimit = rateLimitResult.rows[0];

    // Check if blocked
    if (rateLimit.blocked_until && new Date(rateLimit.blocked_until) > now) {
      const blockedSeconds = Math.ceil((new Date(rateLimit.blocked_until).getTime() - now.getTime()) / 1000);
      return blockedSeconds;
    }

    // Check resend cooldown (60 seconds since last request)
    const lastRequestTime = new Date(rateLimit.last_request_at);
    const cooldownRemaining = this.RESEND_COOLDOWN_SECONDS - Math.floor((now.getTime() - lastRequestTime.getTime()) / 1000);
    if (cooldownRemaining > 0) {
      return cooldownRemaining;
    }

    // Check hourly limit
    const windowStartTime = new Date(rateLimit.window_start);
    if (windowStartTime > windowStart) {
      // Still in same window
      if (rateLimit.request_count >= this.HOURLY_REQUEST_LIMIT) {
        // Block for 24 hours due to abuse
        const blockedUntil = new Date(now.getTime() + this.ABUSE_BLOCK_HOURS * 60 * 60 * 1000);
        await client.query(
          `UPDATE otp_rate_limits SET blocked_until = $1 WHERE phone_number = $2`,
          [blockedUntil, phoneNumber]
        );
        return this.ABUSE_BLOCK_HOURS * 3600;
      }
    }

    return null;
  }

  /**
   * Update rate limit tracking after OTP request
   */
  private async updateRateLimit(phoneNumber: string, client: PoolClient): Promise<void> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour window

    const existing = await client.query(
      `SELECT * FROM otp_rate_limits WHERE phone_number = $1`,
      [phoneNumber]
    );

    if (existing.rows.length === 0) {
      // Create new record
      await client.query(
        `INSERT INTO otp_rate_limits (id, phone_number, request_count, first_request_at, last_request_at, window_start)
         VALUES ($1, $2, 1, $3, $3, $3)`,
        [randomUUID(), phoneNumber, now]
      );
    } else {
      const rateLimit = existing.rows[0];
      const windowStartTime = new Date(rateLimit.window_start);

      if (windowStartTime < windowStart) {
        // New window, reset counter
        await client.query(
          `UPDATE otp_rate_limits
           SET request_count = 1, window_start = $1, last_request_at = $1, blocked_until = NULL
           WHERE phone_number = $2`,
          [now, phoneNumber]
        );
      } else {
        // Increment counter in same window
        await client.query(
          `UPDATE otp_rate_limits
           SET request_count = request_count + 1, last_request_at = $1
           WHERE phone_number = $2`,
          [now, phoneNumber]
        );
      }
    }
  }

  /**
   * Request OTP for phone verification
   * Handles rate limiting, generates OTP, stores hashed version, sends SMS
   */
  async requestOtp(
    phoneNumber: string,
    client: PoolClient,
    sendSms: (phone: string, code: string) => Promise<void>
  ): Promise<OtpResult> {
    // Normalize phone number
    const normalizedPhone = this.normalizeNigerianPhone(phoneNumber);

    // Validate phone number
    if (!this.validateNigerianPhone(normalizedPhone)) {
      return {
        success: false,
        reason: "invalid_phone"
      };
    }

// Check rate limits
    const rateLimitSeconds = await this.checkRateLimit(normalizedPhone, client);
    if (rateLimitSeconds !== null) {
      if (rateLimitSeconds > 3600) {
        // Blocked for abuse
        const blockedUntil = new Date(Date.now() + rateLimitSeconds * 1000);
        return {
          success: false,
          reason: "blocked",
          retryAfterSeconds: rateLimitSeconds,
          blockedUntil
        };
      } else {
        // Resend cooldown
        return {
          success: false,
          reason: "rate_limit",
          retryAfterSeconds: rateLimitSeconds
        };
      }
    }

    // Generate OTP
    const otpCode = this.generateOtpCode();
    const otpCodeHash = this.hashOtpCode(otpCode);

    // Calculate expiry
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

    // Invalidate any existing OTP for this phone number
    await client.query(
      `UPDATE otp_verifications
       SET verified = TRUE, verified_at = NOW()
       WHERE phone_number = $1 AND verified = FALSE`,
      [normalizedPhone]
    );

    // Store new OTP
    await client.query(
      `INSERT INTO otp_verifications (id, phone_number, otp_code_hash, created_at, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [randomUUID(), normalizedPhone, otpCodeHash, now, expiresAt]
    );

    // Update rate limiting
    await this.updateRateLimit(normalizedPhone, client);

    // Send SMS
    try {
      await sendSms(normalizedPhone, otpCode);
    } catch (error) {
      // Log error but don't fail the request
      // In production, you might want to mark the OTP as failed
      console.error("Failed to send SMS:", error);
    }

    return {
      success: true,
      retryAfterSeconds: this.RESEND_COOLDOWN_SECONDS
    };
  }

  /**
   * Verify OTP code
   */
  async verifyOtp(phoneNumber: string, code: string, client: PoolClient): Promise<VerificationResult> {
    const normalizedPhone = this.normalizeNigerianPhone(phoneNumber);
    const codeHash = this.hashOtpCode(code);
    const now = new Date();

    // Find active OTP
    const otpResult = await client.query(
      `SELECT * FROM otp_verifications
       WHERE phone_number = $1
         AND verified = FALSE
         AND expires_at > $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [normalizedPhone, now]
    );

    if (otpResult.rows.length === 0) {
      // Check if there was an OTP but it expired
      const expiredCheck = await client.query(
        `SELECT * FROM otp_verifications
         WHERE phone_number = $1
           AND verified = FALSE
         ORDER BY created_at DESC
         LIMIT 1`,
        [normalizedPhone]
      );

      if (expiredCheck.rows.length > 0) {
        return { success: false, reason: "expired" };
      }

      return { success: false, reason: "not_found" };
    }

    const otp = otpResult.rows[0];

    // Check max attempts
    if (otp.verification_attempts >= this.MAX_VERIFICATION_ATTEMPTS) {
      return { success: false, reason: "max_attempts" };
    }

    // Increment attempt counter
    await client.query(
      `UPDATE otp_verifications
       SET verification_attempts = verification_attempts + 1,
           last_verification_attempt_at = $1
       WHERE id = $2`,
      [now, otp.id]
    );

    // Verify code
    if (otp.otp_code_hash !== codeHash) {
      return { success: false, reason: "invalid_code" };
    }

    // Mark as verified
    await client.query(
      `UPDATE otp_verifications
       SET verified = TRUE, verified_at = $1
       WHERE id = $2`,
      [now, otp.id]
    );

    return { success: true };
  }
}
