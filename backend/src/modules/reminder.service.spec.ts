import { newDb } from "pg-mem";
import { Pool } from "pg";
import { DatabaseService } from "../database/database.service";
import { ReminderService } from "./reminder.service";
import { WhatsAppService } from "./whatsapp.service";
import { TwilioSmsService } from "./sms.service";
import { DateBooking } from "./app.types";

function makeMockBooking(overrides?: Partial<DateBooking>): DateBooking {
  return {
    id: "booking-1",
    matchId: "match-1",
    status: "confirmed",
    venueName: "Cafe Nero",
    city: "Lagos",
    dateType: "Cafe",
    startAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    logisticsChatOpensBeforeHours: 2,
    checkInStatus: "Pending",
    tokenAmountNgn: 5000,
    bothPaid: true,
    counterpartName: "Amina",
    venueAddress: "12 Victoria Island",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  };
}

describe("ReminderService", () => {
  let pool: Pool;
  let databaseService: DatabaseService;
  let reminderService: ReminderService;
  let whatsAppService: WhatsAppService;
  let smsService: TwilioSmsService;
  const testUserId = "test-reminder-user";
  const testPhone = "+2348012345678";

  beforeEach(async () => {
    const db = newDb({ autoCreateForeignKeyIndices: true });
    const adapter = db.adapters.createPg();
    pool = new adapter.Pool();
    databaseService = new DatabaseService({ pool });
    await databaseService.onModuleInit();

    whatsAppService = new WhatsAppService();
    smsService = new TwilioSmsService();
    reminderService = new ReminderService(databaseService, whatsAppService, smsService);
  });

  afterEach(async () => {
    await databaseService.onModuleDestroy();
  });

  describe("preferences", () => {
    it("returns default preferences for unknown user", async () => {
      const prefs = await reminderService.getPreferences(testUserId);

      expect(prefs.userId).toBe(testUserId);
      expect(prefs.bookingConfirmations).toBe(true);
      expect(prefs.reminders).toBe(true);
      expect(prefs.paymentNudges).toBe(true);
      expect(prefs.cancellationNotices).toBe(true);
    });

    it("saves and retrieves updated preferences", async () => {
      await reminderService.updatePreferences(testUserId, { reminders: false });

      const prefs = await reminderService.getPreferences(testUserId);
      expect(prefs.reminders).toBe(false);
      expect(prefs.bookingConfirmations).toBe(true);
    });

    it("upserts preferences on repeat update", async () => {
      await reminderService.updatePreferences(testUserId, { reminders: false });
      await reminderService.updatePreferences(testUserId, { paymentNudges: false });

      const prefs = await reminderService.getPreferences(testUserId);
      expect(prefs.reminders).toBe(false);
      expect(prefs.paymentNudges).toBe(false);
    });
  });

  describe("sendBookingConfirmation", () => {
    it("sends a WhatsApp message and creates a log entry", async () => {
      const booking = makeMockBooking();
      await reminderService.sendBookingConfirmation(testUserId, booking, testPhone, "Chidi");

      const logs = await reminderService.getDeliveryLogs({ userId: testUserId });
      expect(logs.length).toBe(1);
      expect(logs[0].templateId).toBe("booking_confirmed");
      expect(logs[0].channel).toBe("whatsapp");
      expect(logs[0].status).toBe("sent");
      expect(logs[0].phoneNumber).toBe(testPhone);
    });

    it("respects opt-out preference", async () => {
      await reminderService.updatePreferences(testUserId, { bookingConfirmations: false });

      const booking = makeMockBooking();
      await reminderService.sendBookingConfirmation(testUserId, booking, testPhone, "Chidi");

      const logs = await reminderService.getDeliveryLogs({ userId: testUserId });
      expect(logs.length).toBe(0);
    });
  });

  describe("sendReminder24h", () => {
    it("sends 24h reminder and logs it", async () => {
      const booking = makeMockBooking();
      await reminderService.sendReminder24h(testUserId, booking, testPhone);

      const logs = await reminderService.getDeliveryLogs({ userId: testUserId });
      expect(logs.length).toBe(1);
      expect(logs[0].templateId).toBe("reminder_24h");
    });

    it("skips when reminders opt-out", async () => {
      await reminderService.updatePreferences(testUserId, { reminders: false });

      const booking = makeMockBooking();
      await reminderService.sendReminder24h(testUserId, booking, testPhone);

      const logs = await reminderService.getDeliveryLogs({ userId: testUserId });
      expect(logs.length).toBe(0);
    });
  });

  describe("sendReminder2h", () => {
    it("sends 2h reminder and logs it", async () => {
      const booking = makeMockBooking();
      await reminderService.sendReminder2h(testUserId, booking, testPhone);

      const logs = await reminderService.getDeliveryLogs({ userId: testUserId });
      expect(logs.length).toBe(1);
      expect(logs[0].templateId).toBe("reminder_2h");
    });
  });

  describe("sendPaymentNudge", () => {
    it("sends payment nudge and logs it", async () => {
      const booking = makeMockBooking({ status: "payment_pending" });
      await reminderService.sendPaymentNudge(testUserId, booking, testPhone, "Chidi");

      const logs = await reminderService.getDeliveryLogs({ userId: testUserId });
      expect(logs.length).toBe(1);
      expect(logs[0].templateId).toBe("payment_nudge");
    });

    it("skips when payment nudges opt-out", async () => {
      await reminderService.updatePreferences(testUserId, { paymentNudges: false });

      const booking = makeMockBooking({ status: "payment_pending" });
      await reminderService.sendPaymentNudge(testUserId, booking, testPhone, "Chidi");

      const logs = await reminderService.getDeliveryLogs({ userId: testUserId });
      expect(logs.length).toBe(0);
    });
  });

  describe("sendCancellationNotice", () => {
    it("sends cancellation notice and logs it", async () => {
      const booking = makeMockBooking({ status: "cancelled" });
      await reminderService.sendCancellationNotice(testUserId, booking, testPhone);

      const logs = await reminderService.getDeliveryLogs({ userId: testUserId });
      expect(logs.length).toBe(1);
      expect(logs[0].templateId).toBe("cancellation_notice");
    });

    it("skips when cancellation notices opt-out", async () => {
      await reminderService.updatePreferences(testUserId, { cancellationNotices: false });

      const booking = makeMockBooking({ status: "cancelled" });
      await reminderService.sendCancellationNotice(testUserId, booking, testPhone);

      const logs = await reminderService.getDeliveryLogs({ userId: testUserId });
      expect(logs.length).toBe(0);
    });
  });

  describe("getDeliveryLogs", () => {
    it("returns logs ordered by sent_at descending", async () => {
      const booking = makeMockBooking();
      await reminderService.sendBookingConfirmation(testUserId, booking, testPhone, "Chidi");
      await reminderService.sendReminder24h(testUserId, booking, testPhone);

      const logs = await reminderService.getDeliveryLogs();
      expect(logs.length).toBe(2);
      // Most recent first
      expect(logs[0].templateId).toBe("reminder_24h");
      expect(logs[1].templateId).toBe("booking_confirmed");
    });

    it("filters by status", async () => {
      const booking = makeMockBooking();
      await reminderService.sendBookingConfirmation(testUserId, booking, testPhone, "Chidi");

      const logs = await reminderService.getDeliveryLogs({ status: "failed" });
      expect(logs.length).toBe(0);

      const sentLogs = await reminderService.getDeliveryLogs({ status: "sent" });
      expect(sentLogs.length).toBe(1);
    });

    it("filters by userId", async () => {
      const booking = makeMockBooking();
      await reminderService.sendBookingConfirmation(testUserId, booking, testPhone, "Chidi");

      const logs = await reminderService.getDeliveryLogs({ userId: "other-user" });
      expect(logs.length).toBe(0);
    });

    it("respects limit", async () => {
      const booking = makeMockBooking();
      await reminderService.sendBookingConfirmation(testUserId, booking, testPhone, "Chidi");
      await reminderService.sendReminder24h(testUserId, booking, testPhone);
      await reminderService.sendReminder2h(testUserId, booking, testPhone);

      const logs = await reminderService.getDeliveryLogs({ limit: 2 });
      expect(logs.length).toBe(2);
    });
  });

  describe("updateDeliveryStatus", () => {
    it("updates status to delivered", async () => {
      const booking = makeMockBooking();
      // WhatsApp in test mode returns null SID, so we manually insert a log with known ID
      await (reminderService as any).insertLog(
        "test-sid-123", testUserId, booking.id, "whatsapp", "booking_confirmed", testPhone, "sent"
      );

      await reminderService.updateDeliveryStatus("test-sid-123", "delivered");

      const logs = await reminderService.getDeliveryLogs({ userId: testUserId });
      expect(logs.length).toBe(1);
      expect(logs[0].status).toBe("delivered");
    });

    it("updates status to failed with reason", async () => {
      const booking = makeMockBooking();
      await (reminderService as any).insertLog(
        "test-sid-456", testUserId, booking.id, "whatsapp", "reminder_24h", testPhone, "sent"
      );

      await reminderService.updateDeliveryStatus("test-sid-456", "undelivered");

      const logs = await reminderService.getDeliveryLogs({ userId: testUserId });
      expect(logs.length).toBe(1);
      expect(logs[0].status).toBe("failed");
    });

    it("ignores intermediate statuses like queued", async () => {
      const booking = makeMockBooking();
      await (reminderService as any).insertLog(
        "test-sid-789", testUserId, booking.id, "whatsapp", "reminder_2h", testPhone, "sent"
      );

      await reminderService.updateDeliveryStatus("test-sid-789", "queued");

      const logs = await reminderService.getDeliveryLogs({ userId: testUserId });
      expect(logs[0].status).toBe("sent"); // unchanged
    });
  });

  describe("SMS fallback", () => {
    it("falls back to SMS when WhatsApp throws", async () => {
      // Override WhatsApp service to throw
      const originalSend = whatsAppService.sendTemplate.bind(whatsAppService);
      whatsAppService.sendTemplate = async () => { throw new Error("WhatsApp unavailable"); };

      const booking = makeMockBooking();
      await reminderService.sendBookingConfirmation(testUserId, booking, testPhone, "Chidi");

      const logs = await reminderService.getDeliveryLogs({ userId: testUserId });
      expect(logs.length).toBe(1);
      expect(logs[0].channel).toBe("sms");
      expect(logs[0].status).toBe("sent");

      // Restore
      whatsAppService.sendTemplate = originalSend;
    });
  });

  describe("rate limiting", () => {
    it("enforces per-user rate limit", async () => {
      const booking = makeMockBooking();

      // Send 10 messages (the limit)
      for (let i = 0; i < 10; i++) {
        await (reminderService as any).insertLog(
          `rate-${i}`, testUserId, booking.id, "whatsapp", "booking_confirmed", testPhone, "sent"
        );
      }

      // Next message should be rate-limited (silently skipped)
      await reminderService.sendBookingConfirmation(testUserId, booking, testPhone, "Chidi");

      const logs = await reminderService.getDeliveryLogs({ userId: testUserId });
      // Should still be 10, not 11
      expect(logs.length).toBe(10);
    });
  });
});
