import { Injectable } from "@nestjs/common";

export interface SmsProvider {
  sendOtp(phoneNumber: string, code: string): Promise<void>;
}

/**
 * Twilio SMS provider for sending OTP codes
 * In production, requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER
 * In development/test mode, logs OTP codes instead of sending
 */
@Injectable()
export class TwilioSmsService implements SmsProvider {
  private readonly accountSid: string | undefined;
  private readonly authToken: string | undefined;
  private readonly fromPhoneNumber: string | undefined;
  private readonly testMode: boolean;
  private twilioClient: any;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
    
    // Enable test mode if credentials are not configured
    this.testMode = !this.accountSid || !this.authToken || !this.fromPhoneNumber;

    if (!this.testMode) {
      // Lazy load Twilio client only in production mode
      try {
        const twilio = require("twilio");
        this.twilioClient = twilio(this.accountSid, this.authToken);
      } catch (error) {
        console.warn("Twilio SDK not available, falling back to test mode");
        this.testMode = true;
      }
    }

    if (this.testMode) {
      console.log("⚠️  SMS service running in TEST MODE - OTP codes will be logged, not sent");
    }
  }

  /**
   * Send OTP code via SMS
   * In test mode, just logs the code
   */
  async sendOtp(phoneNumber: string, code: string): Promise<void> {
    if (this.testMode) {
      // Test mode: just log the OTP
      console.log(`📱 [TEST MODE] OTP for ${phoneNumber}: ${code}`);
      return;
    }

    // Production mode: send via Twilio
    try {
      await this.twilioClient.messages.create({
        body: `Your Ayuni verification code is: ${code}. Valid for 10 minutes. Do not share this code.`,
        from: this.fromPhoneNumber,
        to: phoneNumber
      });
      
      console.log(`✅ SMS sent to ${phoneNumber} (not logging OTP code for security)`);
    } catch (error) {
      console.error(`❌ Failed to send SMS to ${phoneNumber}:`, error);
      throw new Error("Failed to send SMS");
    }
  }

  /**
   * Check if service is in test mode
   */
  isTestMode(): boolean {
    return this.testMode;
  }
}
