import { Injectable } from "@nestjs/common";

export interface WhatsAppProvider {
  sendTemplate(phoneNumber: string, templateName: string, params: Record<string, string>): Promise<string | null>;
  isTestMode(): boolean;
}

/**
 * WhatsApp Business API provider using Meta Cloud API via Twilio.
 * Falls back to test mode when credentials are missing.
 */
@Injectable()
export class WhatsAppService implements WhatsAppProvider {
  private readonly accountSid: string | undefined;
  private readonly authToken: string | undefined;
  private readonly fromWhatsApp: string | undefined;
  private readonly testMode: boolean;
  private twilioClient: any;

  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromWhatsApp = process.env.TWILIO_WHATSAPP_NUMBER; // e.g., "whatsapp:+14155238886"

    this.testMode = !this.accountSid || !this.authToken || !this.fromWhatsApp;

    if (!this.testMode) {
      try {
        const twilio = require("twilio");
        this.twilioClient = twilio(this.accountSid, this.authToken);
      } catch {
        console.warn("Twilio SDK not available, WhatsApp falling back to test mode");
        (this as any).testMode = true;
      }
    }

    if (this.testMode) {
      console.log("⚠️  WhatsApp service running in TEST MODE - messages will be logged, not sent");
    }
  }

  /**
   * Send a WhatsApp template message.
   * Returns the Twilio message SID on success, or null in test mode.
   */
  async sendTemplate(phoneNumber: string, templateName: string, params: Record<string, string>): Promise<string | null> {
    const body = this.formatTemplateBody(templateName, params);

    if (this.testMode) {
      console.log(`📱 [TEST MODE] WhatsApp to ${phoneNumber}: [${templateName}] ${body}`);
      return null;
    }

    try {
      const message = await this.twilioClient.messages.create({
        body,
        from: this.fromWhatsApp,
        to: `whatsapp:${phoneNumber}`
      });
      console.log(`✅ WhatsApp sent to ${phoneNumber} (SID: ${message.sid})`);
      return message.sid;
    } catch (error) {
      console.error(`❌ Failed to send WhatsApp to ${phoneNumber}:`, error);
      throw new Error("Failed to send WhatsApp message");
    }
  }

  isTestMode(): boolean {
    return this.testMode;
  }

  private formatTemplateBody(templateName: string, params: Record<string, string>): string {
    switch (templateName) {
      case "booking_confirmed":
        return `Hi ${params.name}! Your Ayuni date with ${params.counterpart} at ${params.venue} on ${params.date} is confirmed. See you there! 🎉`;
      case "reminder_24h":
        return `Reminder: Your Ayuni date with ${params.counterpart} at ${params.venue} is tomorrow at ${params.time}. Don't forget! ⏰`;
      case "reminder_2h":
        return `Your Ayuni date with ${params.counterpart} at ${params.venue} starts in 2 hours at ${params.time}. Have a great time! 💫`;
      case "payment_nudge":
        return `Hi ${params.name}! Your date with ${params.counterpart} is waiting for payment. Complete payment to confirm your booking. 💳`;
      case "cancellation_notice":
        return `Your Ayuni date with ${params.counterpart} at ${params.venue} on ${params.date} has been cancelled. We hope to see you on your next date!`;
      default:
        return `Ayuni notification: ${JSON.stringify(params)}`;
    }
  }
}
