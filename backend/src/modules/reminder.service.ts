import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { WhatsAppService } from "./whatsapp.service";
import { TwilioSmsService } from "./sms.service";
import { ReminderLog, ReminderPreferences, ReminderTemplate, DateBooking } from "./app.types";
import { randomUUID } from "crypto";

@Injectable()
export class ReminderService {
  // Max messages per user per hour
  private readonly RATE_LIMIT = 10;

  constructor(
    private readonly database: DatabaseService,
    private readonly whatsappService: WhatsAppService,
    private readonly smsService: TwilioSmsService
  ) {}

  // ── Public API ─────────────────────────────────────────────────

  /**
   * Send a booking confirmation message after successful payment.
   */
  async sendBookingConfirmation(userId: string, booking: DateBooking, phoneNumber: string, userName: string): Promise<void> {
    const prefs = await this.getPreferences(userId);
    if (!prefs.bookingConfirmations) return;

    await this.dispatch(userId, booking.id, phoneNumber, "booking_confirmed", {
      name: userName,
      counterpart: booking.counterpartName,
      venue: booking.venueName,
      date: this.formatDate(booking.startAt)
    });
  }

  /**
   * Send a 24-hour reminder before a confirmed date.
   */
  async sendReminder24h(userId: string, booking: DateBooking, phoneNumber: string): Promise<void> {
    const prefs = await this.getPreferences(userId);
    if (!prefs.reminders) return;

    await this.dispatch(userId, booking.id, phoneNumber, "reminder_24h", {
      counterpart: booking.counterpartName,
      venue: booking.venueName,
      time: this.formatTime(booking.startAt)
    });
  }

  /**
   * Send a 2-hour reminder before a confirmed date.
   */
  async sendReminder2h(userId: string, booking: DateBooking, phoneNumber: string): Promise<void> {
    const prefs = await this.getPreferences(userId);
    if (!prefs.reminders) return;

    await this.dispatch(userId, booking.id, phoneNumber, "reminder_2h", {
      counterpart: booking.counterpartName,
      venue: booking.venueName,
      time: this.formatTime(booking.startAt)
    });
  }

  /**
   * Send a payment nudge when booking enters payment_pending state.
   */
  async sendPaymentNudge(userId: string, booking: DateBooking, phoneNumber: string, userName: string): Promise<void> {
    const prefs = await this.getPreferences(userId);
    if (!prefs.paymentNudges) return;

    await this.dispatch(userId, booking.id, phoneNumber, "payment_nudge", {
      name: userName,
      counterpart: booking.counterpartName
    });
  }

  /**
   * Send a cancellation notice when a booking is cancelled.
   */
  async sendCancellationNotice(userId: string, booking: DateBooking, phoneNumber: string): Promise<void> {
    const prefs = await this.getPreferences(userId);
    if (!prefs.cancellationNotices) return;

    await this.dispatch(userId, booking.id, phoneNumber, "cancellation_notice", {
      counterpart: booking.counterpartName,
      venue: booking.venueName,
      date: this.formatDate(booking.startAt)
    });
  }

  // ── Preferences ────────────────────────────────────────────────

  async getPreferences(userId: string): Promise<ReminderPreferences> {
    const result = await this.database.query(
      "SELECT * FROM reminder_preferences WHERE user_id = $1",
      [userId]
    );
    if (result.rows.length > 0) {
      const row = result.rows[0];
      return {
        userId: row.user_id,
        bookingConfirmations: row.booking_confirmations,
        reminders: row.reminders,
        paymentNudges: row.payment_nudges,
        cancellationNotices: row.cancellation_notices
      };
    }
    // Return defaults (all enabled)
    return {
      userId,
      bookingConfirmations: true,
      reminders: true,
      paymentNudges: true,
      cancellationNotices: true
    };
  }

  async updatePreferences(userId: string, updates: Partial<Omit<ReminderPreferences, "userId">>): Promise<ReminderPreferences> {
    const current = await this.getPreferences(userId);
    const merged = { ...current, ...updates };

    await this.database.query(
      `INSERT INTO reminder_preferences (user_id, booking_confirmations, reminders, payment_nudges, cancellation_notices, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         booking_confirmations = $2, reminders = $3, payment_nudges = $4, cancellation_notices = $5, updated_at = NOW()`,
      [userId, merged.bookingConfirmations, merged.reminders, merged.paymentNudges, merged.cancellationNotices]
    );

    return merged;
  }

  // ── Delivery status webhook ────────────────────────────────────

  async updateDeliveryStatus(messageSid: string, status: string): Promise<void> {
    // Map Twilio status to our status
    let mappedStatus: ReminderLog["status"];
    let extraColumn = "";
    let extraValue = "";

    switch (status) {
      case "delivered":
        mappedStatus = "delivered";
        extraColumn = ", delivered_at = NOW()";
        break;
      case "read":
        mappedStatus = "read";
        extraColumn = ", read_at = NOW()";
        break;
      case "failed":
      case "undelivered":
        mappedStatus = "failed";
        extraColumn = ", failed_at = NOW(), failure_reason = $3";
        extraValue = status;
        break;
      default:
        // Ignore intermediate statuses like "queued", "sending", "sent"
        return;
    }

    const params: unknown[] = [mappedStatus, messageSid];
    if (extraValue) params.push(extraValue);

    await this.database.query(
      `UPDATE reminder_logs SET status = $1${extraColumn} WHERE id = $2`,
      params
    );
  }

  // ── Logs for ops console ───────────────────────────────────────

  async getDeliveryLogs(options?: { limit?: number; status?: string; userId?: string }): Promise<ReminderLog[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (options?.status) {
      conditions.push(`status = $${idx++}`);
      params.push(options.status);
    }
    if (options?.userId) {
      conditions.push(`user_id = $${idx++}`);
      params.push(options.userId);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = options?.limit ?? 50;

    const result = await this.database.query(
      `SELECT * FROM reminder_logs ${where} ORDER BY sent_at DESC LIMIT $${idx}`,
      [...params, limit]
    );

    return result.rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      bookingId: row.booking_id,
      channel: row.channel,
      templateId: row.template_id,
      phoneNumber: row.phone_number,
      status: row.status,
      failureReason: row.failure_reason,
      sentAt: row.sent_at,
      deliveredAt: row.delivered_at,
      readAt: row.read_at,
      failedAt: row.failed_at
    }));
  }

  // ── Scheduled reminders scan ───────────────────────────────────

  /**
   * Scan for confirmed bookings that need reminders.
   * Called periodically (e.g., every 30 minutes via cron or setInterval).
   */
  async processScheduledReminders(): Promise<void> {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const window = 30 * 60 * 1000; // 30-minute window for matching

    // Find confirmed bookings starting in ~24h
    const bookings24h = await this.findBookingsInWindow(in24h, window);
    for (const row of bookings24h) {
      const alreadySent = await this.hasReminderBeenSent(row.userId, row.booking.id, "reminder_24h");
      if (!alreadySent) {
        await this.sendReminder24h(row.userId, row.booking, row.phoneNumber);
      }
    }

    // Find confirmed bookings starting in ~2h
    const bookings2h = await this.findBookingsInWindow(in2h, window);
    for (const row of bookings2h) {
      const alreadySent = await this.hasReminderBeenSent(row.userId, row.booking.id, "reminder_2h");
      if (!alreadySent) {
        await this.sendReminder2h(row.userId, row.booking, row.phoneNumber);
      }
    }
  }

  // ── Private helpers ────────────────────────────────────────────

  private async dispatch(
    userId: string,
    bookingId: string,
    phoneNumber: string,
    templateId: ReminderTemplate,
    params: Record<string, string>
  ): Promise<void> {
    // Rate-limit check
    if (await this.isRateLimited(userId)) {
      console.warn(`⚠️  Rate limit exceeded for user ${userId}, skipping ${templateId}`);
      return;
    }

    const logId = randomUUID();
    let channel: "whatsapp" | "sms" = "whatsapp";

    try {
      // Try WhatsApp first
      const messageSid = await this.whatsappService.sendTemplate(phoneNumber, templateId, params);
      // Use messageSid as log ID if available (for delivery status matching)
      const effectiveId = messageSid || logId;

      await this.insertLog(effectiveId, userId, bookingId, "whatsapp", templateId, phoneNumber, "sent");
    } catch {
      // Fallback to SMS
      console.log(`📱 WhatsApp failed for ${phoneNumber}, falling back to SMS`);
      channel = "sms";
      try {
        const body = this.buildSmsBody(templateId, params);
        await this.sendSmsFallback(phoneNumber, body);
        await this.insertLog(logId, userId, bookingId, "sms", templateId, phoneNumber, "sent");
      } catch (smsError) {
        await this.insertLog(logId, userId, bookingId, "sms", templateId, phoneNumber, "failed",
          smsError instanceof Error ? smsError.message : "SMS send failed"
        );
      }
    }
  }

  private async sendSmsFallback(phoneNumber: string, body: string): Promise<void> {
    // Use the existing TwilioSmsService's underlying client pattern
    if (this.smsService.isTestMode()) {
      console.log(`📱 [TEST MODE] SMS to ${phoneNumber}: ${body}`);
      return;
    }
    // Direct Twilio SMS send — can't reuse sendOtp since it formats OTP messages
    const twilio = require("twilio");
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await client.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });
  }

  private buildSmsBody(templateId: ReminderTemplate, params: Record<string, string>): string {
    switch (templateId) {
      case "booking_confirmed":
        return `Ayuni: Your date with ${params.counterpart} at ${params.venue} on ${params.date} is confirmed!`;
      case "reminder_24h":
        return `Ayuni: Reminder — date with ${params.counterpart} at ${params.venue} tomorrow at ${params.time}`;
      case "reminder_2h":
        return `Ayuni: Your date with ${params.counterpart} starts in 2 hours at ${params.time}`;
      case "payment_nudge":
        return `Ayuni: Complete payment for your date with ${params.counterpart} to confirm your booking`;
      case "cancellation_notice":
        return `Ayuni: Your date with ${params.counterpart} on ${params.date} has been cancelled`;
      default:
        return `Ayuni notification`;
    }
  }

  private async insertLog(
    id: string, userId: string, bookingId: string, channel: string,
    templateId: string, phoneNumber: string, status: string, failureReason?: string
  ): Promise<void> {
    await this.database.query(
      `INSERT INTO reminder_logs (id, user_id, booking_id, channel, template_id, phone_number, status, failure_reason, sent_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [id, userId, bookingId, channel, templateId, phoneNumber, status, failureReason || null]
    );
  }

  private async isRateLimited(userId: string): Promise<boolean> {
    const result = await this.database.query(
      `SELECT COUNT(*) as cnt FROM reminder_logs WHERE user_id = $1 AND sent_at > NOW() - INTERVAL '1 hour'`,
      [userId]
    );
    return parseInt(result.rows[0]?.cnt || "0", 10) >= this.RATE_LIMIT;
  }

  private async hasReminderBeenSent(userId: string, bookingId: string, templateId: string): Promise<boolean> {
    const result = await this.database.query(
      `SELECT 1 FROM reminder_logs WHERE user_id = $1 AND booking_id = $2 AND template_id = $3 LIMIT 1`,
      [userId, bookingId, templateId]
    );
    return result.rows.length > 0;
  }

  private async findBookingsInWindow(
    targetTime: Date, windowMs: number
  ): Promise<Array<{ userId: string; booking: DateBooking; phoneNumber: string }>> {
    // Query bookings that start within the window of the target time
    const minTime = new Date(targetTime.getTime() - windowMs / 2);
    const maxTime = new Date(targetTime.getTime() + windowMs / 2);

    const result = await this.database.query(
      `SELECT b.user_id, b.payload, u.payload->>'accountSettings' as settings
       FROM bookings b
       JOIN user_state u ON u.user_id = b.user_id
       WHERE b.payload->>'status' = 'confirmed'
         AND (b.payload->>'startAt')::timestamptz BETWEEN $1 AND $2`,
      [minTime.toISOString(), maxTime.toISOString()]
    );

    return result.rows.map((row: any) => {
      const booking = row.payload as DateBooking;
      let phoneNumber = "";
      try {
        const settings = typeof row.settings === "string" ? JSON.parse(row.settings) : row.settings;
        phoneNumber = settings?.phoneNumber || "";
      } catch { /* ignore parse errors */ }

      return { userId: row.user_id, booking, phoneNumber };
    }).filter(r => r.phoneNumber);
  }

  private formatDate(isoDate: string): string {
    try {
      return new Date(isoDate).toLocaleDateString("en-NG", {
        weekday: "short", month: "short", day: "numeric"
      });
    } catch {
      return isoDate;
    }
  }

  private formatTime(isoDate: string): string {
    try {
      return new Date(isoDate).toLocaleTimeString("en-NG", {
        hour: "2-digit", minute: "2-digit", timeZone: "Africa/Lagos"
      });
    } catch {
      return isoDate;
    }
  }
}
