import { Test, TestingModule } from "@nestjs/testing";
import { OtpService, OtpResult, VerificationResult } from "./otp.service";
import { PoolClient } from "pg";

describe("OtpService", () => {
  let service: OtpService;
  let mockClient: Partial<PoolClient>;
  let mockSendSms: jest.Mock;

  beforeEach(async () => {
    mockClient = {
      query: jest.fn()
    };
    
    mockSendSms = jest.fn().mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [OtpService]
    }).compile();

    service = module.get<OtpService>(OtpService);
  });

  describe("validateNigerianPhone", () => {
    it("should accept +234XXXXXXXXXX format", () => {
      expect(service.validateNigerianPhone("+2348012345678")).toBe(true);
    });

    it("should accept 0XXXXXXXXXX format", () => {
      expect(service.validateNigerianPhone("08012345678")).toBe(true);
    });

    it("should reject invalid formats", () => {
      expect(service.validateNigerianPhone("+1234567890")).toBe(false);
      expect(service.validateNigerianPhone("123")).toBe(false);
      expect(service.validateNigerianPhone("")).toBe(false);
    });
  });

  describe("normalizeNigerianPhone", () => {
    it("should normalize 0XXXXXXXXXX to +234XXXXXXXXXX", () => {
      expect(service.normalizeNigerianPhone("08012345678")).toBe("+2348012345678");
    });

    it("should keep +234XXXXXXXXXX as is", () => {
      expect(service.normalizeNigerianPhone("+2348012345678")).toBe("+2348012345678");
    });

    it("should add + to 234XXXXXXXXXX", () => {
      expect(service.normalizeNigerianPhone("2348012345678")).toBe("+2348012345678");
    });
  });

  describe("requestOtp", () => {
    it("should reject invalid phone numbers", async () => {
      const result = await service.requestOtp("invalid", mockClient as PoolClient, mockSendSms);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe("invalid_phone");
      }
    });

    it("should successfully create OTP for valid phone", async () => {
      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] }) // No rate limit record (checkRateLimit)
        .mockResolvedValueOnce(undefined) // Update existing OTPs
        .mockResolvedValueOnce(undefined) // Insert new OTP
        .mockResolvedValueOnce({ rows: [] }) // Get rate limit (updateRateLimit)
        .mockResolvedValueOnce(undefined); // Insert rate limit record

      const result = await service.requestOtp("08012345678", mockClient as PoolClient, mockSendSms);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.retryAfterSeconds).toBeGreaterThan(0);
      }
      expect(mockSendSms).toHaveBeenCalled();
    });

    it("should enforce resend cooldown", async () => {
      const now = new Date();
      const lastRequest = new Date(now.getTime() - 30 * 1000); // 30 seconds ago
      
      (mockClient.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          phone_number: "+2348012345678",
          request_count: 1,
          last_request_at: lastRequest,
          window_start: lastRequest,
          blocked_until: null
        }]
      });

      const result = await service.requestOtp("08012345678", mockClient as PoolClient, mockSendSms);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe("rate_limit");
        expect(result.retryAfterSeconds).toBeGreaterThan(0);
      }
    });

    it("should block after too many requests", async () => {
      const now = new Date();
      const windowStart = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes ago
      
      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{
            phone_number: "+2348012345678",
            request_count: 5,
            last_request_at: new Date(now.getTime() - 70 * 1000), // 70 seconds ago (past cooldown)
            window_start: windowStart,
            blocked_until: null
          }]
        })
        .mockResolvedValueOnce(undefined); // Block update

      const result = await service.requestOtp("08012345678", mockClient as PoolClient, mockSendSms);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe("blocked");
        expect(result.retryAfterSeconds).toBeGreaterThan(3600);
      }
    });
  });

  describe("verifyOtp", () => {
    it("should return not_found if no OTP exists", async () => {
      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] }) // No active OTP
        .mockResolvedValueOnce({ rows: [] }); // No expired OTP either

      const result = await service.verifyOtp("08012345678", "123456", mockClient as PoolClient);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe("not_found");
      }
    });

    it("should return expired if OTP has expired", async () => {
      const expiredDate = new Date(Date.now() - 1000); // 1 second ago
      
      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] }) // No active OTP
        .mockResolvedValueOnce({
          rows: [{
            id: "test-otp-id",
            phone_number: "+2348012345678",
            otp_code_hash: "somehash",
            expires_at: expiredDate,
            verification_attempts: 0,
            verified: false
          }]
        });

      const result = await service.verifyOtp("08012345678", "123456", mockClient as PoolClient);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe("expired");
      }
    });

    it("should return max_attempts if too many attempts", async () => {
      (mockClient.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: "test-otp-id",
          phone_number: "+2348012345678",
          otp_code_hash: "somehash",
          expires_at: new Date(Date.now() + 600000), // Future
          verification_attempts: 5,
          verified: false
        }]
      });

      const result = await service.verifyOtp("08012345678", "123456", mockClient as PoolClient);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe("max_attempts");
      }
    });

    it("should increment attempts on wrong code", async () => {
      const correctHash = require("crypto").createHash("sha256").update("999999").digest("hex");
      
      (mockClient.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{
            id: "test-otp-id",
            phone_number: "+2348012345678",
            otp_code_hash: correctHash,
            expires_at: new Date(Date.now() + 600000),
            verification_attempts: 0,
            verified: false
          }]
        })
        .mockResolvedValueOnce(undefined); // Increment attempt

      const result = await service.verifyOtp("08012345678", "123456", mockClient as PoolClient);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.reason).toBe("invalid_code");
      }
      
      // Verify increment was called
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE otp_verifications"),
        expect.arrayContaining([expect.any(Date), "test-otp-id"])
      );
    });
  });
});
