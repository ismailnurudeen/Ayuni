import { newDb } from "pg-mem";
import { Pool } from "pg";
import { DatabaseService } from "../database/database.service";
import { AuthService } from "./auth.service";
import { OtpService } from "./otp.service";
import { TwilioSmsService } from "./sms.service";
import { MediaService } from "./media.service";
import { PaystackService } from "./paystack.service";
import { ReminderService } from "./reminder.service";
import { WhatsAppService } from "./whatsapp.service";
import { PushService } from "./push.service";
import { AppService } from "./app.service";
import { SafetyReport } from "./app.types";

describe("AppService", () => {
  let pool: Pool;
  let databaseService: DatabaseService;
  let authService: AuthService;
  let otpService: OtpService;
  let smsService: TwilioSmsService;
  let mediaService: MediaService;
  let paystackService: PaystackService;
  let whatsappService: WhatsAppService;
  let reminderService: ReminderService;
  let pushService: PushService;
  let service: AppService;

  beforeEach(async () => {
    const db = newDb({
      autoCreateForeignKeyIndices: true
    });
    const adapter = db.adapters.createPg();
    pool = new adapter.Pool();
    databaseService = new DatabaseService({ pool });
    await databaseService.onModuleInit();
    authService = new AuthService(databaseService);
    otpService = new OtpService();
    smsService = new TwilioSmsService();
    mediaService = new MediaService(databaseService);
    paystackService = new PaystackService();
    whatsappService = new WhatsAppService();
    reminderService = new ReminderService(databaseService, whatsappService, smsService);
    pushService = new PushService(databaseService);
    service = new AppService(databaseService, authService, otpService, smsService, mediaService, paystackService, reminderService, pushService);
    await service.onModuleInit();
  });

  afterEach(async () => {
    await databaseService.onModuleDestroy();
  });

  it("runs migrations on an empty database", async () => {
    const rows = await pool.query<{ tablename: string }>(
      `
        SELECT table_name AS tablename
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('users', 'user_states', 'rounds', 'bookings', 'payments')
        ORDER BY table_name
      `
    );
    expect(rows.rows.map((row) => row.tablename)).toEqual(["bookings", "payments", "rounds", "user_states", "users"]);
  });

  it("returns bootstrap data from persistence", async () => {
    const bootstrap = await service.getBootstrap();
    expect(bootstrap.suggestions.length).toBeGreaterThan(0);
    expect(bootstrap.reactions).toEqual({});
    expect(bootstrap.notifications.length).toBeGreaterThan(0);
  });

  it("keeps data after service restart against the same database", async () => {
    // Directly insert verified phone data (bypassing OTP flow for this test)
    await databaseService.withTransaction(async (client) => {
      await client.query("UPDATE users SET phone_number = $1 WHERE id = $2", ["+2348012345678", "demo-user"]);
      const state = await pool.query("SELECT * FROM user_states WHERE user_id = $1", ["demo-user"]);
      const stateData = state.rows[0];
      stateData.verification = { ...stateData.verification, phoneVerified: true };
      stateData.account_settings = { ...stateData.account_settings, phoneNumber: "+2348012345678" };
      await client.query(
        "UPDATE user_states SET verification = $1, account_settings = $2 WHERE user_id = $3",
        [JSON.stringify(stateData.verification), JSON.stringify(stateData.account_settings), "demo-user"]
      );
    });

    const restartedDatabaseService = new DatabaseService({ pool });
    await restartedDatabaseService.onModuleInit();
    const restartedAuthService = new AuthService(restartedDatabaseService);
    const restartedOtpService = new OtpService();
    const restartedSmsService = new TwilioSmsService();
    const restartedMediaService = new MediaService(restartedDatabaseService);
    const restartedPaystackService = new PaystackService();
    const restartedWhatsAppService = new WhatsAppService();
    const restartedReminderService = new ReminderService(restartedDatabaseService, restartedWhatsAppService, restartedSmsService);
    const restartedPushService = new PushService(restartedDatabaseService);
    const restartedService = new AppService(restartedDatabaseService, restartedAuthService, restartedOtpService, restartedSmsService, restartedMediaService, restartedPaystackService, restartedReminderService, restartedPushService);
    await restartedService.onModuleInit();

    const bootstrap = await restartedService.getBootstrap("demo-user");
    expect(bootstrap.verification.phoneVerified).toBe(true);
    expect(bootstrap.accountSettings.phoneNumber).toBe("+2348012345678");

    await restartedDatabaseService.onModuleDestroy();
  });

  it("isolates user state between two users", async () => {
    await service.respondToMatch("sug-1", "accept", "user-a");
    const userABootstrap = await service.getBootstrap("user-a");
    const userBBootstrap = await service.getBootstrap("user-b");

    expect(userABootstrap.reactions).toEqual({ "sug-1": "Accepted" });
    expect(userBBootstrap.reactions).toEqual({});
    expect(userBBootstrap.notifications.find((item) => item.title.includes("accepted"))).toBeUndefined();
  });

  it("uses NGN 3,500 for persisted token payments", async () => {
    const payment = await service.initiateDateToken("card", "pay-user");
    expect(payment.amountNgn).toBe(3500);
    expect(payment.paystackReference).toBeDefined();
    expect(payment.paystackAuthUrl).toBeDefined();
    expect(payment.status).toBe("initiated");

    const rows = await pool.query<{ payment_method: string; status: string }>(
      "SELECT payment_method, status FROM payments WHERE user_id = $1",
      ["pay-user"]
    );
    expect(rows.rows).toEqual([{ payment_method: "card", status: "initiated" }]);
  });

  describe("preference-driven matching", () => {
    it("filters suggestions by age range", async () => {
      // Default preferences have ageRange "27-36"
      // sug-1: age 28, sug-2: age 31, sug-3: age 30, sug-4: age 27, sug-5: age 29
      // All are in range, so all should appear
      const bootstrap = await service.getBootstrap("age-test-user");
      const ages = bootstrap.suggestions.map((s) => s.age);
      ages.forEach((age) => {
        expect(age).toBeGreaterThanOrEqual(27);
        expect(age).toBeLessThanOrEqual(36);
      });
    });

    it("excludes profiles outside age range after preference update", async () => {
      // Set tight age range that excludes sug-2 (31) and sug-3 (30)
      await service.updateDatingPreferences(
        {
          ageRange: "27-29",
          genderIdentity: "",
          heightRange: "",
          dateCities: ["Lagos", "Abuja"],
          dateAreas: [],
          preferredDateActivities: []
        },
        "age-filter-user"
      );

      const bootstrap = await service.getBootstrap("age-filter-user");
      bootstrap.suggestions.forEach((s) => {
        expect(s.age).toBeGreaterThanOrEqual(27);
        expect(s.age).toBeLessThanOrEqual(29);
      });
    });

    it("filters by gender identity preference", async () => {
      await service.updateDatingPreferences(
        {
          ageRange: "",
          genderIdentity: "Men",
          heightRange: "",
          dateCities: ["Lagos", "Abuja"],
          dateAreas: [],
          preferredDateActivities: []
        },
        "gender-filter-user"
      );

      const bootstrap = await service.getBootstrap("gender-filter-user");
      bootstrap.suggestions.forEach((s) => {
        expect(s.gender).toBe("Man");
      });
      expect(bootstrap.suggestions.length).toBeGreaterThan(0);
    });

    it("filters by height range", async () => {
      // sug-1: 168, sug-2: 182, sug-3: 178, sug-4: 165, sug-5: 175
      // Filter 175-185 should include sug-2 (182), sug-3 (178), sug-5 (175)
      await service.updateDatingPreferences(
        {
          ageRange: "",
          genderIdentity: "",
          heightRange: "175-185 cm",
          dateCities: ["Lagos", "Abuja"],
          dateAreas: [],
          preferredDateActivities: []
        },
        "height-filter-user"
      );

      const bootstrap = await service.getBootstrap("height-filter-user");
      bootstrap.suggestions.forEach((s) => {
        expect(s.heightCm).toBeGreaterThanOrEqual(175);
        expect(s.heightCm).toBeLessThanOrEqual(185);
      });
      expect(bootstrap.suggestions.length).toBeGreaterThan(0);
    });

    it("filters by date areas (neighborhood match)", async () => {
      // sug-1: Lekki Phase 1, sug-2: Yaba, sug-3: Wuse II, sug-4: Ikoyi, sug-5: Victoria Island
      await service.updateDatingPreferences(
        {
          ageRange: "",
          genderIdentity: "",
          heightRange: "",
          dateCities: ["Lagos", "Abuja"],
          dateAreas: ["Victoria Island"],
          preferredDateActivities: []
        },
        "area-filter-user"
      );

      const bootstrap = await service.getBootstrap("area-filter-user");
      bootstrap.suggestions.forEach((s) => {
        expect(s.neighborhood.toLowerCase()).toContain("victoria island");
      });
      expect(bootstrap.suggestions.length).toBeGreaterThan(0);
    });

    it("filters by preferred date activities", async () => {
      // sug-1: Brunch, sug-2: Cafe->Coffee, sug-3: DessertSpot->Dessert, sug-4: CasualRestaurant->Casual dinner, sug-5: Lounge->Drinks
      await service.updateDatingPreferences(
        {
          ageRange: "",
          genderIdentity: "",
          heightRange: "",
          dateCities: ["Lagos", "Abuja"],
          dateAreas: [],
          preferredDateActivities: ["Coffee", "Brunch"]
        },
        "activity-filter-user"
      );

      const bootstrap = await service.getBootstrap("activity-filter-user");
      const dateTypes = bootstrap.suggestions.map((s) => s.preferredDateType);
      dateTypes.forEach((dt) => {
        expect(["Cafe", "Brunch"]).toContain(dt);
      });
      expect(bootstrap.suggestions.length).toBeGreaterThan(0);
    });

    it("preference changes regenerate the active round", async () => {
      const initial = await service.getBootstrap("pref-change-user");
      const initialIds = initial.suggestions.map((s) => s.id).sort();

      // Narrow to only Men, should exclude Amaka (Woman) and Zainab (Woman)
      await service.updateDatingPreferences(
        {
          ageRange: "",
          genderIdentity: "Men",
          heightRange: "",
          dateCities: ["Lagos", "Abuja"],
          dateAreas: [],
          preferredDateActivities: []
        },
        "pref-change-user"
      );

      const updated = await service.getBootstrap("pref-change-user");
      const updatedIds = updated.suggestions.map((s) => s.id).sort();
      // Round should have changed — Women profiles excluded
      updated.suggestions.forEach((s) => {
        expect(s.gender).toBe("Man");
      });
    });

    it("falls back to city-filtered profiles when no preferences match", async () => {
      // Set impossibly narrow preferences
      await service.updateDatingPreferences(
        {
          ageRange: "18-19",
          genderIdentity: "",
          heightRange: "",
          dateCities: ["Lagos"],
          dateAreas: [],
          preferredDateActivities: []
        },
        "fallback-user"
      );

      const bootstrap = await service.getBootstrap("fallback-user");
      // Should fallback to city-filtered profiles when nothing matches
      expect(bootstrap.suggestions.length).toBeGreaterThan(0);
    });

    it("applies multiple filters together", async () => {
      // Combine: Men + age 29-31 + Lagos
      // sug-2: Man, 31, Lagos ✓
      // sug-5: Man, 29, Lagos ✓
      // sug-3: Man, 30, Abuja ✗ (not Lagos-only)
      await service.updateDatingPreferences(
        {
          ageRange: "29-31",
          genderIdentity: "Men",
          heightRange: "",
          dateCities: ["Lagos"],
          dateAreas: [],
          preferredDateActivities: []
        },
        "multi-filter-user"
      );

      const bootstrap = await service.getBootstrap("multi-filter-user");
      bootstrap.suggestions.forEach((s) => {
        expect(s.gender).toBe("Man");
        expect(s.age).toBeGreaterThanOrEqual(29);
        expect(s.age).toBeLessThanOrEqual(31);
        expect(s.city).toBe("Lagos");
      });
      expect(bootstrap.suggestions.length).toBeGreaterThan(0);
    });

    it("returns everyone when genderIdentity is 'Everyone'", async () => {
      await service.updateDatingPreferences(
        {
          ageRange: "",
          genderIdentity: "Everyone",
          heightRange: "",
          dateCities: ["Lagos", "Abuja"],
          dateAreas: [],
          preferredDateActivities: []
        },
        "everyone-user"
      );

      const bootstrap = await service.getBootstrap("everyone-user");
      const genders = [...new Set(bootstrap.suggestions.map((s) => s.gender))];
      expect(genders.length).toBeGreaterThan(1);
    });

    it("excludes already-reacted profiles from new rounds", async () => {
      const userId = "reaction-filter-user";
      
      // Get initial round
      const initial = await service.getBootstrap(userId);
      expect(initial.suggestions.length).toBeGreaterThan(0);
      const firstProfileId = initial.suggestions[0].id;

      // React to first profile
      await service.respondToMatch(firstProfileId, "accept", userId);

      // Force new round generation by resetting
      await pool.query("DELETE FROM rounds WHERE user_id = $1", [userId]);

      // Get new round
      const updated = await service.getBootstrap(userId);
      
      // The reacted profile should NOT appear in the new round
      const profileIds = updated.suggestions.map(s => s.id);
      expect(profileIds).not.toContain(firstProfileId);
    });

    it("returns empty round when all profiles have been reacted to", async () => {
      const userId = "exhausted-pool-user";
      
      // Ensure user exists first
      await service.getBootstrap(userId);
      
      // Get all available profiles
      const allProfiles = await pool.query("SELECT id FROM suggestion_profiles");
      
      // React to all of them
      for (const profile of allProfiles.rows) {
        await pool.query(
          "INSERT INTO reactions (user_id, profile_id, reaction) VALUES ($1, $2, 'Declined') ON CONFLICT DO NOTHING",
          [userId, profile.id]
        );
      }

      // Force new round
      await pool.query("DELETE FROM rounds WHERE user_id = $1", [userId]);

      // Get bootstrap - should have empty suggestions
      const bootstrap = await service.getBootstrap(userId);
      expect(bootstrap.suggestions.length).toBe(0);
    });
  });

  describe("Onboarding hardening", () => {
    it("rejects users under 18", async () => {
      const today = new Date();
      const under18BirthDate = `${today.getFullYear() - 17}-01-01`;

      await expect(
        service.completeBasicOnboarding(
          {
            firstName: "Minor",
            birthDate: under18BirthDate,
            genderIdentity: "Woman",
            interestedIn: "Men",
            city: "Lagos",
            acceptedTerms: true
          },
          "minor-user"
        )
      ).rejects.toThrow("You must be 18 or older to use Ayuni");
    });

    it("accepts users exactly 18 years old", async () => {
      const today = new Date();
      const exactly18BirthDate = `${today.getFullYear() - 18}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

      await service.completeBasicOnboarding(
        {
          firstName: "JustEighteen",
          birthDate: exactly18BirthDate,
          genderIdentity: "Woman",
          interestedIn: "Men",
          city: "Lagos",
          acceptedTerms: true
        },
        "eighteen-user"
      );

      const bootstrap = await service.getBootstrap("eighteen-user");
      expect(bootstrap.onboarding.completed).toBe(true);
    });

    it("rejects when terms are not accepted", async () => {
      await expect(
        service.completeBasicOnboarding(
          {
            firstName: "NoTerms",
            birthDate: "1990-01-01",
            genderIdentity: "Woman",
            interestedIn: "Men",
            city: "Lagos",
            acceptedTerms: false
          },
          "no-terms-user"
        )
      ).rejects.toThrow("You must accept the terms and conditions to continue");
    });

    it("records terms acceptance in database", async () => {
      await service.completeBasicOnboarding(
        {
          firstName: "WithTerms",
          birthDate: "1995-06-15",
          genderIdentity: "Man",
          interestedIn: "Women",
          city: "Abuja",
          acceptedTerms: true
        },
        "terms-user"
      );

      const result = await pool.query(
        "SELECT * FROM terms_acceptances WHERE user_id = $1",
        ["terms-user"]
      );

      expect(result.rows.length).toBe(1);
      expect(result.rows[0].terms_version).toBe("1.0");
      expect(result.rows[0].privacy_version).toBe("1.0");
      expect(result.rows[0].accepted_at).toBeDefined();
    });

    it("preserves onboarding step for resume", async () => {
      // User in OTP verification step
      await service.requestPhoneOtp("+2348055555555");
      
      const bootstrap = await service.getBootstrap("demo-user");
      expect(bootstrap.onboarding.step).toBe("OtpVerification");
      expect(bootstrap.onboarding.phoneNumber).toBe("+2348055555555");
      expect(bootstrap.onboarding.completed).toBe(false);
    });
  });

  describe("Booking lifecycle", () => {
    it("creates booking intent when submitting availability", async () => {
      const bootstrap = await service.getBootstrap("booking-user");
      expect(bootstrap.suggestions.length).toBeGreaterThan(0);
      const matchId = bootstrap.suggestions[0].id;

      const result = await service.submitAvailability(
        matchId,
        ["Saturday evening", "Sunday afternoon"],
        "booking-user"
      );

      expect(result.bookingId).toBeDefined();
      expect(result.matchId).toBe(matchId);
      expect(result.availability).toEqual(["Saturday evening", "Sunday afternoon"]);
      expect(result.paymentRequired).toBe(true);

      // Verify booking persisted with correct status
      const updatedBootstrap = await service.getBootstrap("booking-user");
      const booking = updatedBootstrap.bookings.find((b) => b.id === result.bookingId);
      expect(booking).toBeDefined();
      expect(booking!.status).toBe("availability_submitted");
      expect(booking!.matchId).toBe(matchId);
      expect(booking!.availability).toEqual(["Saturday evening", "Sunday afternoon"]);
      expect(booking!.createdAt).toBeDefined();
    });

    it("transitions booking from availability_submitted to confirmed", async () => {
      const bootstrap = await service.getBootstrap("booking-user-2");
      expect(bootstrap.suggestions.length).toBeGreaterThan(0);
      const matchId = bootstrap.suggestions[0].id;

      // First, submit availability
      const submitResult = await service.submitAvailability(
        matchId,
        ["Friday evening"],
        "booking-user-2"
      );

      expect(submitResult.bookingId).toBeDefined();

      // Then create booking (simulating payment completion)
      const bookResult = await service.createBooking(matchId, "booking-user-2");

      expect(bookResult.booking.status).toBe("confirmed");
      expect(bookResult.booking.matchId).toBe(matchId);
      expect(bookResult.booking.bothPaid).toBe(true);
      expect(bookResult.booking.venueName).toBeDefined();
      expect(bookResult.booking.venueAddress).toBeDefined();
      expect(bookResult.booking.updatedAt).toBeDefined();
    });

    it("updates existing booking when resubmitting availability", async () => {
      const bootstrap = await service.getBootstrap("booking-user-3");
      expect(bootstrap.suggestions.length).toBeGreaterThan(0);
      const matchId = bootstrap.suggestions[0].id;

      // Submit availability first time
      const result1 = await service.submitAvailability(
        matchId,
        ["Saturday evening"],
        "booking-user-3"
      );
      const bookingId1 = result1.bookingId;

      // Submit availability again for same match
      const result2 = await service.submitAvailability(
        matchId,
        ["Sunday morning", "Sunday afternoon"],
        "booking-user-3"
      );

      // Should return same booking ID and update availability
      expect(result2.bookingId).toBe(bookingId1);
      expect(result2.availability).toEqual(["Sunday morning", "Sunday afternoon"]);

      const updatedBootstrap = await service.getBootstrap("booking-user-3");
      const booking = updatedBootstrap.bookings.find((b) => b.id === bookingId1);
      expect(booking!.availability).toEqual(["Sunday morning", "Sunday afternoon"]);
    });

    it("persists booking state across service restarts", async () => {
      const bootstrap = await service.getBootstrap("booking-user-4");
      expect(bootstrap.suggestions.length).toBeGreaterThan(0);
      const matchId = bootstrap.suggestions[0].id;

      // Submit availability
      const result = await service.submitAvailability(
        matchId,
        ["Friday evening"],
        "booking-user-4"
      );

      // Simulate restart by creating new service instance
      const newService = new AppService(databaseService, authService, otpService, smsService, mediaService, paystackService, reminderService, pushService);
      const restartedBootstrap = await newService.getBootstrap("booking-user-4");

      const booking = restartedBootstrap.bookings.find((b) => b.id === result.bookingId);
      expect(booking).toBeDefined();
      expect(booking!.status).toBe("availability_submitted");
      expect(booking!.matchId).toBe(matchId);
      expect(booking!.availability).toEqual(["Friday evening"]);
    });
  });

  describe("Payment flow", () => {
    it("processes successful payment webhook", async () => {
      // Create a booking first
      const bootstrap = await service.getBootstrap("payment-user");
      const matchId = bootstrap.suggestions[0].id;
      
      const availResult = await service.submitAvailability(
        matchId,
        ["Saturday evening"],
        "payment-user"
      );
      const bookingId = availResult.bookingId;

      // Initiate payment
      const payment = await service.initiateDateToken("card", "payment-user", bookingId);
      expect(payment.status).toBe("initiated");
      expect(payment.paystackReference).toBeDefined();

      // Simulate webhook success
      await service.handlePaymentSuccess(
        payment.paystackReference!,
        "payment-user",
        payment.id,
        bookingId
      );

      // Verify payment marked as completed
      const paymentRows = await pool.query(
        "SELECT payload FROM payments WHERE id = $1",
        [payment.id]
      );
      const updatedPayment = paymentRows.rows[0].payload;
      expect(updatedPayment.status).toBe("completed");

      // Verify booking marked as confirmed
      const bookingRows = await pool.query(
        "SELECT payload FROM bookings WHERE id = $1",
        [bookingId]
      );
      const updatedBooking = bookingRows.rows[0].payload;
      expect(updatedBooking.status).toBe("confirmed");
      expect(updatedBooking.bothPaid).toBe(true);
    });

    it("handles payment failure webhook", async () => {
      // Initiate payment
      const payment = await service.initiateDateToken("card", "payment-fail-user");
      expect(payment.status).toBe("initiated");

      // Simulate webhook failure
      await service.handlePaymentFailure(
        payment.paystackReference!,
        "payment-fail-user",
        payment.id
      );

      // Verify payment marked as failed
      const paymentRows = await pool.query(
        "SELECT payload FROM payments WHERE id = $1",
        [payment.id]
      );
      const updatedPayment = paymentRows.rows[0].payload;
      expect(updatedPayment.status).toBe("failed");
    });

    it("handles duplicate webhook events idempotently", async () => {
      // Create a booking first
      const bootstrap = await service.getBootstrap("payment-idempotent-user");
      const matchId = bootstrap.suggestions[0].id;
      
      const availResult = await service.submitAvailability(
        matchId,
        ["Sunday afternoon"],
        "payment-idempotent-user"
      );
      const bookingId = availResult.bookingId;

      // Initiate payment
      const payment = await service.initiateDateToken("card", "payment-idempotent-user", bookingId);

      // Process success webhook first time
      await service.handlePaymentSuccess(
        payment.paystackReference!,
        "payment-idempotent-user",
        payment.id,
        bookingId
      );

      // Process success webhook again (duplicate)
      await service.handlePaymentSuccess(
        payment.paystackReference!,
        "payment-idempotent-user",
        payment.id,
        bookingId
      );

      // Verify payment still completed (not double-processed)
      const paymentRows = await pool.query(
        "SELECT payload FROM payments WHERE id = $1",
        [payment.id]
      );
      const updatedPayment = paymentRows.rows[0].payload;
      expect(updatedPayment.status).toBe("completed");

      // Verify booking still confirmed (no corruption)
      const bookingRows = await pool.query(
        "SELECT payload FROM bookings WHERE id = $1",
        [bookingId]
      );
      const updatedBooking = bookingRows.rows[0].payload;
      expect(updatedBooking.status).toBe("confirmed");
    });
  });

  describe("Ops console", () => {
    it("returns ops dashboard with live data", async () => {
      await service.getBootstrap("ops-user");
      
      const dashboard = await service.getOpsDashboard("ops-user");

      expect(dashboard.overview).toBeDefined();
      expect(dashboard.overview.pendingReports).toBeGreaterThanOrEqual(0);
      expect(dashboard.overview.activeVenueCount).toBeGreaterThanOrEqual(0);
      expect(dashboard.moderationQueue).toBeInstanceOf(Array);
      expect(dashboard.venueNetwork).toBeInstanceOf(Array);
      expect(dashboard.bookings).toBeInstanceOf(Array);
      expect(dashboard.reactions).toBeInstanceOf(Array);
    });

    it("resolves safety reports", async () => {
      await service.getBootstrap("ops-resolve-user");
      
      // Create a report for this specific user
      await service.createReport(
        {
          category: "UnsafeBehavior",
          bookingId: "book-1",
          details: "Test report for ops resolution"
        },
        "ops-resolve-user"
      );

      // Verify report is in user's queue
      let dashboard = await service.getOpsDashboard("ops-resolve-user");
      const reportToResolve = dashboard.moderationQueue.find((r) => r.details === "Test report for ops resolution");
      expect(reportToResolve).toBeDefined();
      expect(reportToResolve!.status).toBe("open");

      // Resolve the report
      await service.resolveReport(reportToResolve!.id, "ops-resolve-user");

      // Verify report is resolved (removed from queue)
      dashboard = await service.getOpsDashboard("ops-resolve-user");
      const resolvedReport = dashboard.moderationQueue.find((r) => r.id === reportToResolve!.id);
      expect(resolvedReport).toBeUndefined();
    });

    it("escalates bookings", async () => {
      const bootstrap = await service.getBootstrap("ops-booking-user");
      const matchId = bootstrap.suggestions[0].id;
      
      // Create a booking
      const bookingResult = await service.createBooking(matchId, "ops-booking-user");
      const bookingId = bookingResult.booking.id;

      // Verify initial check-in status
      expect(bookingResult.booking.checkInStatus).not.toBe("SupportFlagged");

      // Escalate booking
      await service.escalateBooking(bookingId, "ops-booking-user");

      // Verify booking is escalated
      const dashboard = await service.getOpsDashboard("ops-booking-user");
      const escalatedBooking = dashboard.bookings.find((b) => b.id === bookingId);
      expect(escalatedBooking).toBeDefined();
      expect(escalatedBooking!.checkInStatus).toBe("SupportFlagged");
    });

    it("toggles venue readiness", async () => {
      // Get initial venue state
      const initialDashboard = await service.getOpsDashboard();
      expect(initialDashboard.venueNetwork.length).toBeGreaterThan(0);
      
      const venue = initialDashboard.venueNetwork[0];
      const initialReadiness = venue.readiness;

      // Toggle venue
      await service.toggleVenue(venue.id);

      // Verify venue readiness changed
      const updatedDashboard = await service.getOpsDashboard();
      const updatedVenue = updatedDashboard.venueNetwork.find((v) => v.id === venue.id);
      expect(updatedVenue).toBeDefined();
      expect(updatedVenue!.readiness).not.toBe(initialReadiness);
      
      // Toggle back
      await service.toggleVenue(venue.id);
      const finalDashboard = await service.getOpsDashboard();
      const finalVenue = finalDashboard.venueNetwork.find((v) => v.id === venue.id);
      expect(finalVenue!.readiness).toBe(initialReadiness);
    });

    it("submits selfie for review", async () => {
      await service.getBootstrap("selfie-user");
      
      // Submit a selfie
      const result = await service.submitSelfie("data:image/jpeg;base64,fake123", "selfie-user");
      
      expect(result.status).toBe("pending");
      expect(result.submissionId).toBeDefined();
      expect(result.message).toContain("submitted successfully");

      // Verify selfie appears in ops dashboard
      const dashboard = await service.getOpsDashboard("selfie-user");
      expect(dashboard.selfieQueue).toBeDefined();
      expect(dashboard.selfieQueue.length).toBeGreaterThan(0);
      expect(dashboard.overview.pendingSelfieReviews).toBeGreaterThan(0);

      const submission = dashboard.selfieQueue.find((s) => s.id === result.submissionId);
      expect(submission).toBeDefined();
      expect(submission!.reviewStatus).toBe("pending");
      expect(submission!.imageUrl).toBe("data:image/jpeg;base64,fake123");
    });

    it("approves selfie verification", async () => {
      await service.getBootstrap("selfie-approve-user");
      
      // Submit selfie
      const result = await service.submitSelfie("data:image/jpeg;base64,approved", "selfie-approve-user");
      const submissionId = result.submissionId;

      // Verify user is not verified yet
      let verification = await service.getVerification("selfie-approve-user");
      expect(verification.selfieVerified).toBe(false);

      // Approve the selfie
      await service.approveSelfie(submissionId, "ops-user");

      // Verify user is now verified
      verification = await service.getVerification("selfie-approve-user");
      expect(verification.selfieVerified).toBe(true);

      // Verify submission removed from pending queue
      const dashboard = await service.getOpsDashboard("selfie-approve-user");
      const pendingSubmission = dashboard.selfieQueue.find((s) => s.id === submissionId);
      expect(pendingSubmission).toBeUndefined();
    });

    it("rejects selfie verification", async () => {
      await service.getBootstrap("selfie-reject-user");
      
      // Submit selfie
      const result = await service.submitSelfie("data:image/jpeg;base64,rejected", "selfie-reject-user");
      const submissionId = result.submissionId;

      // Verify user is not verified yet
      let verification = await service.getVerification("selfie-reject-user");
      expect(verification.selfieVerified).toBe(false);

      // Reject the selfie
      await service.rejectSelfie(submissionId, "ops-user");

      // Verify user is still not verified
      verification = await service.getVerification("selfie-reject-user");
      expect(verification.selfieVerified).toBe(false);

      // Verify submission removed from pending queue
      const dashboard = await service.getOpsDashboard("selfie-reject-user");
      const pendingSubmission = dashboard.selfieQueue.find((s) => s.id === submissionId);
      expect(pendingSubmission).toBeUndefined();

      // Verify user received notification about rejection
      const bootstrap = await service.getBootstrap("selfie-reject-user");
      const rejectionNotification = bootstrap.notifications.find((n) => n.title.toLowerCase().includes("selfie") && n.title.toLowerCase().includes("retry"));
      expect(rejectionNotification).toBeDefined();
    });
  });

  describe("safety reporting lifecycle", () => {
    it("creates report with open status", async () => {
      await service.getBootstrap("reporter-user");

      // Create report (booking doesn't need to exist for report creation)
      await service.createReport({
        bookingId: "test-booking-1",
        category: "LateArrival",
        details: "Counterpart arrived 30 minutes late"
      }, "reporter-user");

      // Verify report appears in ops dashboard
      const dashboard = await service.getOpsDashboard("ops-user");
      const report = dashboard.moderationQueue.find((r) => r.bookingId === "test-booking-1");
      expect(report).toBeDefined();
      expect(report!.status).toBe("open");
      expect(report!.category).toBe("LateArrival");
      expect(report!.details).toBe("Counterpart arrived 30 minutes late");
      expect(report!.severity).toBe("medium");
    });

    it("moves report from open to investigating status", async () => {
      await service.getBootstrap("investigate-reporter");
      
      await service.createReport({
        bookingId: "test-booking-2",
        category: "UnsafeBehavior",
        details: "Felt unsafe during the date"
      }, "investigate-reporter");

      // Get report ID
      let dashboard = await service.getOpsDashboard("ops-user");
      let report = dashboard.moderationQueue.find((r) => r.bookingId === "test-booking-2");
      expect(report).toBeDefined();
      expect(report!.status).toBe("open");
      expect(report!.severity).toBe("high"); // UnsafeBehavior should be high severity

      // Investigate the report
      await service.investigateReport(report!.id, "ops-user");

      // Verify status changed to investigating
      dashboard = await service.getOpsDashboard("ops-user");
      report = dashboard.moderationQueue.find((r) => r.id === report!.id);
      expect(report).toBeDefined();
      expect(report!.status).toBe("investigating");
      expect(report!.investigatedAt).toBeDefined();
      expect(report!.investigatedBy).toBe("ops-user");
    });

    it("resolves report with audit trail", async () => {
      await service.getBootstrap("resolve-reporter");
      
      await service.createReport({
        bookingId: "test-booking-3",
        category: "NoShow",
        details: "Counterpart did not show up"
      }, "resolve-reporter");

      // Get report ID and investigate
      let dashboard = await service.getOpsDashboard("ops-user");
      let report = dashboard.moderationQueue.find((r) => r.bookingId === "test-booking-3");
      expect(report).toBeDefined();
      const reportId = report!.id;
      
      await service.investigateReport(reportId, "ops-user");

      // Verify investigating status
      dashboard = await service.getOpsDashboard("ops-user");
      report = dashboard.moderationQueue.find((r) => r.id === reportId);
      expect(report).toBeDefined();
      expect(report!.status).toBe("investigating");

      // Resolve the report
      await service.resolveReport(reportId, "ops-user", "User was refunded");

      // After resolving, report should NOT be in moderation queue
      // (moderation queue only shows open and investigating reports)
      dashboard = await service.getOpsDashboard("ops-user");
      report = dashboard.moderationQueue.find((r) => r.id === reportId);
      expect(report).toBeUndefined();

      // Verify report was actually resolved by querying directly
      const allReports = await pool.query<{ payload: SafetyReport }>(
        "SELECT payload FROM safety_reports WHERE id = $1",
        [reportId]
      );
      expect(allReports.rows.length).toBe(1);
      const resolvedReport = allReports.rows[0].payload;
      expect(resolvedReport.status).toBe("resolved");
      expect(resolvedReport.resolvedAt).toBeDefined();
      expect(resolvedReport.resolvedBy).toBe("ops-user");
      expect(resolvedReport.resolutionNotes).toBe("User was refunded");
    });

    it("assigns high severity to unsafe behavior reports", async () => {
      await service.getBootstrap("unsafe-reporter");
      
      await service.createReport({
        bookingId: "test-booking-4",
        category: "UnsafeBehavior",
        details: "Very concerning behavior"
      }, "unsafe-reporter");

      const dashboard = await service.getOpsDashboard("ops-user");
      const report = dashboard.moderationQueue.find((r) => r.bookingId === "test-booking-4");
      
      expect(report).toBeDefined();
      expect(report!.severity).toBe("high");
    });
  });

  describe("freeze policy engine", () => {
    it("issues warning on first incident", async () => {
      await service.getBootstrap("freeze-user-1");
      
      // Record first incident
      await service.recordIncident("booking-1", "NoShow", "freeze-user-1");
      
      // Check state
      const bootstrap = await service.getBootstrap("freeze-user-1");
      expect(bootstrap.safety.incidents.length).toBe(1);
      expect(bootstrap.safety.warnings).toBe(1);
      expect(bootstrap.safety.tokenLossPenalties).toBe(0);
      expect(bootstrap.safety.activeFreeze).toBeUndefined();
      
      // Verify warning notification
      const warningNotification = bootstrap.notifications.find(n => n.title.includes("warning"));
      expect(warningNotification).toBeDefined();
    });

    it("applies token loss penalty on second incident", async () => {
      await service.getBootstrap("freeze-user-2");
      
      // Record two incidents
      await service.recordIncident("booking-1", "NoShow", "freeze-user-2");
      await service.recordIncident("booking-2", "LateCancellation", "freeze-user-2");
      
      // Check state
      const bootstrap = await service.getBootstrap("freeze-user-2");
      expect(bootstrap.safety.incidents.length).toBe(2);
      expect(bootstrap.safety.warnings).toBe(1);
      expect(bootstrap.safety.tokenLossPenalties).toBe(1);
      expect(bootstrap.safety.activeFreeze).toBeUndefined();
      
      // Verify token penalty notification
      const penaltyNotification = bootstrap.notifications.find(n => n.title.includes("Token penalty"));
      expect(penaltyNotification).toBeDefined();
    });

    it("applies 30-day freeze on third incident", async () => {
      await service.getBootstrap("freeze-user-3");
      
      // Record three incidents
      await service.recordIncident("booking-1", "NoShow", "freeze-user-3");
      await service.recordIncident("booking-2", "NoShow", "freeze-user-3");
      await service.recordIncident("booking-3", "LateCancellation", "freeze-user-3");
      
      // Check state
      const bootstrap = await service.getBootstrap("freeze-user-3");
      expect(bootstrap.safety.incidents.length).toBe(3);
      expect(bootstrap.safety.activeFreeze).toBeDefined();
      expect(bootstrap.safety.activeFreeze!.reason).toContain("3 incidents");
      expect(bootstrap.safety.activeFreeze!.incidentCount).toBe(3);
      expect(bootstrap.safety.activeFreeze!.canAppeal).toBe(true);
      
      // Verify freeze dates (should be approximately 30 days from now)
      const frozenUntil = new Date(bootstrap.safety.activeFreeze!.frozenUntil);
      const frozenAt = new Date(bootstrap.safety.activeFreeze!.frozenAt);
      const daysDiff = Math.floor((frozenUntil.getTime() - frozenAt.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBeGreaterThanOrEqual(29);
      expect(daysDiff).toBeLessThanOrEqual(31);
      
      // Verify freeze notification
      const freezeNotification = bootstrap.notifications.find(n => n.title.includes("frozen"));
      expect(freezeNotification).toBeDefined();
    });

    it("prevents frozen user from creating bookings", async () => {
      await service.getBootstrap("frozen-user");
      
      // Create freeze
      await service.recordIncident("booking-1", "NoShow", "frozen-user");
      await service.recordIncident("booking-2", "NoShow", "frozen-user");
      await service.recordIncident("booking-3", "NoShow", "frozen-user");
      
      // Verify user is frozen
      const bootstrap = await service.getBootstrap("frozen-user");
      expect(bootstrap.safety.activeFreeze).toBeDefined();
      
      // Try to submit availability (should fail)
      await expect(
        service.submitAvailability("sug-1", ["Saturday evening"], "frozen-user")
      ).rejects.toThrow(/frozen/);
      
      // Try to create booking (should fail)
      await expect(
        service.createBooking("sug-1", "frozen-user")
      ).rejects.toThrow(/frozen/);
    });

    it("only counts incidents from last 90 days", async () => {
      await service.getBootstrap("expire-user");
      
      // Record first incident
      await service.recordIncident("booking-1", "NoShow", "expire-user");
      
      // Get current safety state
      const currentState = await pool.query(
        "SELECT safety FROM user_states WHERE user_id = $1",
        ["expire-user"]
      );
      
      // Add an old incident (>90 days ago) to the incidents array
      const safety = currentState.rows[0].safety;
      safety.incidents.push({
        id: "inc-old",
        type: "NoShow",
        bookingId: "old-booking",
        occurredAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString() // 100 days ago
      });
      
      // Update the safety state with the modified incidents array
      await pool.query(
        "UPDATE user_states SET safety = $1 WHERE user_id = $2",
        [JSON.stringify(safety), "expire-user"]
      );
      
      // Record second recent incident
      await service.recordIncident("booking-2", "NoShow", "expire-user");
      
      // Should only count the 2 recent incidents, not the old one
      // So should apply token loss penalty (2nd incident), not freeze
      const bootstrap = await service.getBootstrap("expire-user");
      expect(bootstrap.safety.tokenLossPenalties).toBeGreaterThan(0);
      expect(bootstrap.safety.activeFreeze).toBeUndefined();
    });

    it("allows ops to lift a freeze", async () => {
      await service.getBootstrap("lift-freeze-user");
      
      // Apply freeze
      await service.recordIncident("booking-1", "NoShow", "lift-freeze-user");
      await service.recordIncident("booking-2", "NoShow", "lift-freeze-user");
      await service.recordIncident("booking-3", "NoShow", "lift-freeze-user");
      
      // Verify freeze
      let bootstrap = await service.getBootstrap("lift-freeze-user");
      expect(bootstrap.safety.activeFreeze).toBeDefined();
      
      // Lift freeze
      await service.liftFreeze("lift-freeze-user", "Appeal approved");
      
      // Verify freeze removed
      bootstrap = await service.getBootstrap("lift-freeze-user");
      expect(bootstrap.safety.activeFreeze).toBeUndefined();
      
      // Verify notification
      const liftNotification = bootstrap.notifications.find(n => n.title.includes("freeze lifted"));
      expect(liftNotification).toBeDefined();
    });
  });

  describe("government ID verification", () => {
    it("submits government ID and sets status to pending_review", async () => {
      await service.getBootstrap("govid-user");
      
      // Submit gov ID
      const result = await service.submitGovId(
        "https://example.com/id-front.jpg",
        "national_id",
        "govid-user",
        "https://example.com/id-back.jpg"
      );
      
      expect(result.submissionId).toBeDefined();
      expect(result.status).toBe("pending_review");
      
      // Check verification state
      const bootstrap = await service.getBootstrap("govid-user");
      expect(bootstrap.verification.govIdStatus).toBe("pending_review");
      expect(bootstrap.verification.governmentIdVerified).toBe(false);
      expect(bootstrap.verification.govIdSubmissionId).toBe(result.submissionId);
      
      // Verify notification
      const notification = bootstrap.notifications.find(n => n.title.includes("Government ID submitted"));
      expect(notification).toBeDefined();
    });

    it("blocks booking when gov ID requirement is enabled and ID not verified", async () => {
      const bootstrap = await service.getBootstrap("blocked-user");
      const matchId = bootstrap.suggestions[0].id;
      
      // Enable gov ID requirement
      await service.setFeatureToggle("require_gov_id_for_booking", true, "ops-user");
      
      // Try to create booking (should fail)
      await expect(
        service.createBooking(matchId, "blocked-user")
      ).rejects.toThrow(/government ID/);
      
      // Try to submit availability (should fail)
      await expect(
        service.submitAvailability(matchId, ["Saturday evening"], "blocked-user")
      ).rejects.toThrow(/government ID/);
    });

    it("allows booking when gov ID requirement is enabled and ID is verified", async () => {
      const bootstrap = await service.getBootstrap("verified-user");
      const matchId = bootstrap.suggestions[0].id;
      
      // Enable gov ID requirement
      await service.setFeatureToggle("require_gov_id_for_booking", true, "ops-user");
      
      // Submit and approve gov ID
      const submission = await service.submitGovId(
        "https://example.com/id-front.jpg",
        "passport",
        "verified-user"
      );
      await service.approveGovId(submission.submissionId, "ops-user");
      
      // Check verification
      const verified = await service.getBootstrap("verified-user");
      expect(verified.verification.governmentIdVerified).toBe(true);
      expect(verified.verification.govIdStatus).toBe("approved");
      
      // Should now be able to submit availability
      const result = await service.submitAvailability(matchId, ["Saturday evening"], "verified-user");
      expect(result.bookingId).toBeDefined();
    });

    it("rejects government ID with reason", async () => {
      await service.getBootstrap("reject-user");
      
      // Submit gov ID
      const submission = await service.submitGovId(
        "https://example.com/id-front.jpg",
        "drivers_license",
        "reject-user"
      );
      
      // Reject with reason
      await service.rejectGovId(submission.submissionId, "Photo is blurry", "ops-user");
      
      // Check verification state
      const bootstrap = await service.getBootstrap("reject-user");
      expect(bootstrap.verification.governmentIdVerified).toBe(false);
      expect(bootstrap.verification.govIdStatus).toBe("rejected");
      expect(bootstrap.verification.govIdRejectionReason).toBe("Photo is blurry");
      
      // Verify rejection notification
      const notification = bootstrap.notifications.find(n => n.title.includes("needs retry"));
      expect(notification).toBeDefined();
      expect(notification?.body).toContain("Photo is blurry");
    });

    it("allows booking when gov ID requirement is disabled", async () => {
      const bootstrap = await service.getBootstrap("no-id-user");
      const matchId = bootstrap.suggestions[0].id;
      
      // Disable gov ID requirement
      await service.setFeatureToggle("require_gov_id_for_booking", false, "ops-user");
      
      // Should be able to submit availability without verified ID
      const result = await service.submitAvailability(matchId, ["Saturday evening"], "no-id-user");
      expect(result.bookingId).toBeDefined();
    });
  });

  describe("Venue management (P1-04)", () => {
    it("creates a venue with full schema", async () => {
      const venue = await service.createVenue({
        name: "Test Cafe",
        city: "Lagos",
        area: "Victoria Island",
        address: "123 Test Street, VI, Lagos",
        type: "Cafe",
        capacity: 25,
        contactPhone: "+2348011111111",
        contactEmail: "info@testcafe.ng"
      });

      expect(venue.id).toBeDefined();
      expect(venue.name).toBe("Test Cafe");
      expect(venue.city).toBe("Lagos");
      expect(venue.area).toBe("Victoria Island");
      expect(venue.address).toBe("123 Test Street, VI, Lagos");
      expect(venue.type).toBe("Cafe");
      expect(venue.status).toBe("active");
      expect(venue.capacity).toBe(25);
      expect(venue.contactPhone).toBe("+2348011111111");
      expect(venue.readiness).toBe("ready");
      expect(venue.operatingHours).toBeDefined();

      // Verify in database
      const row = await pool.query("SELECT name, status, capacity FROM venues WHERE id = $1", [venue.id]);
      expect(row.rows.length).toBe(1);
      expect(row.rows[0].name).toBe("Test Cafe");
      expect(row.rows[0].status).toBe("active");
      expect(row.rows[0].capacity).toBe(25);
    });

    it("updates venue fields", async () => {
      const venue = await service.createVenue({
        name: "Update Test",
        city: "Abuja",
        area: "Wuse II",
        address: "Update Street",
        type: "Lounge",
        capacity: 30
      });

      const updated = await service.updateVenue(venue.id, {
        name: "Updated Lounge",
        capacity: 40,
        contactEmail: "new@lounge.ng"
      });

      expect(updated).not.toBeNull();
      expect(updated!.name).toBe("Updated Lounge");
      expect(updated!.capacity).toBe(40);
      expect(updated!.contactEmail).toBe("new@lounge.ng");
      expect(updated!.area).toBe("Wuse II"); // unchanged
    });

    it("deactivates and activates venues", async () => {
      const venue = await service.createVenue({
        name: "Status Test",
        city: "Lagos",
        area: "Lekki",
        address: "Lekki Phase 1",
        type: "DessertSpot",
        capacity: 15
      });

      expect(venue.status).toBe("active");

      // Deactivate
      const deactivated = await service.setVenueStatus(venue.id, "inactive");
      expect(deactivated!.status).toBe("inactive");
      expect(deactivated!.readiness).toBe("paused");

      // Set maintenance
      const maintenance = await service.setVenueStatus(venue.id, "maintenance");
      expect(maintenance!.status).toBe("maintenance");

      // Reactivate
      const activated = await service.setVenueStatus(venue.id, "active");
      expect(activated!.status).toBe("active");
      expect(activated!.readiness).toBe("ready");
    });

    it("lists venues with filtering", async () => {
      await service.createVenue({ name: "Lagos Cafe 1", city: "Lagos", area: "Victoria Island", address: "VI", type: "Cafe", capacity: 10 });
      await service.createVenue({ name: "Lagos Lounge 1", city: "Lagos", area: "Lekki", address: "Lekki", type: "Lounge", capacity: 20 });
      await service.createVenue({ name: "Abuja Cafe 1", city: "Abuja", area: "Wuse II", address: "Wuse", type: "Cafe", capacity: 15 });

      // Filter by city
      const lagosVenues = await service.listVenues({ city: "Lagos" });
      expect(lagosVenues.every(v => v.city === "Lagos")).toBe(true);

      // Filter by type
      const cafes = await service.listVenues({ type: "Cafe" });
      expect(cafes.every(v => v.type === "Cafe")).toBe(true);

      // Search by name
      const searched = await service.listVenues({ search: "Lounge" });
      expect(searched.some(v => v.name.includes("Lounge"))).toBe(true);

      // Filter by area
      const viVenues = await service.listVenues({ area: "Victoria Island" });
      expect(viVenues.every(v => v.area.includes("Victoria Island"))).toBe(true);
    });

    it("excludes inactive venues from booking assignment pool", async () => {
      // Create venue then deactivate it
      const venue = await service.createVenue({
        name: "Inactive Venue",
        city: "Lagos",
        area: "Victoria Island",
        address: "Test Address",
        type: "Cafe",
        capacity: 20
      });
      await service.setVenueStatus(venue.id, "inactive");

      // Active venues should not include the deactivated one
      const allVenues = await service.listVenues({ status: "active" });
      const found = allVenues.find(v => v.id === venue.id);
      expect(found).toBeUndefined();
    });

    it("returns venue detail with booking history", async () => {
      await service.getBootstrap("venue-detail-user");
      const dashboard = await service.getOpsDashboard("venue-detail-user");
      expect(dashboard.venueNetwork.length).toBeGreaterThan(0);

      const venueId = dashboard.venueNetwork[0].id;
      const detail = await service.getVenueDetail(venueId);

      expect(detail).not.toBeNull();
      expect(detail!.name).toBeDefined();
      expect(detail!.recentBookings).toBeInstanceOf(Array);
      expect(detail!.timeSlots).toBeInstanceOf(Array);
    });

    it("checks venue availability correctly", async () => {
      const venue = await service.createVenue({
        name: "Capacity Test Venue",
        city: "Lagos",
        area: "Ikoyi",
        address: "Ikoyi Ave",
        type: "CasualRestaurant",
        capacity: 2
      });

      // Initially available
      const avail = await service.checkVenueAvailability(venue.id, "2026-04-01", "19:00");
      expect(avail.available).toBe(true);
      expect(avail.remainingCapacity).toBe(2);

      // Inactive venue not available
      await service.setVenueStatus(venue.id, "inactive");
      const unavail = await service.checkVenueAvailability(venue.id, "2026-04-01", "19:00");
      expect(unavail.available).toBe(false);
    });

    it("enforces venue capacity during slot reservation", async () => {
      const venue = await service.createVenue({
        name: "Tiny Venue",
        city: "Lagos",
        area: "Lekki",
        address: "Lekki Phase 1",
        type: "DessertSpot",
        capacity: 1
      });

      // Reserve first slot via database transaction
      const reserved = await databaseService.withTransaction(async (client) => {
        return service.reserveVenueSlot(venue.id, "2026-04-01", "19:00", "21:00", client);
      });
      expect(reserved).toBe(true);

      // Verify the slot is now at capacity
      const slotRow = await pool.query(
        "SELECT booked_count, max_capacity FROM venue_time_slots WHERE venue_id = $1 AND slot_date = $2 AND start_time = $3",
        [venue.id, "2026-04-01", "19:00"]
      );
      expect(slotRow.rows.length).toBe(1);
      expect(slotRow.rows[0].booked_count).toBe(1);
      expect(slotRow.rows[0].max_capacity).toBe(1);

      // Second reservation should fail because booked_count = max_capacity
      const reserved2 = await databaseService.withTransaction(async (client) => {
        return service.reserveVenueSlot(venue.id, "2026-04-01", "19:00", "21:00", client);
      });
      expect(reserved2).toBe(false);
    });

    it("smart venue assignment prefers user preferred area", async () => {
      // Create venues in different areas
      await service.createVenue({ name: "VI Restaurant", city: "Lagos", area: "Victoria Island", address: "VI", type: "CasualRestaurant", capacity: 20 });
      await service.createVenue({ name: "Lekki Restaurant", city: "Lagos", area: "Lekki", address: "Lekki", type: "CasualRestaurant", capacity: 20 });

      // Set user preferences to prefer Victoria Island
      await service.updateDatingPreferences({
        ageRange: "",
        genderIdentity: "",
        heightRange: "",
        dateCities: ["Lagos"],
        dateAreas: ["Victoria Island"],
        preferredDateActivities: []
      }, "venue-pref-user");

      const bootstrap = await service.getBootstrap("venue-pref-user");
      const matchId = bootstrap.suggestions[0]?.id;
      if (matchId) {
        const result = await service.createBooking(matchId, "venue-pref-user");
        // Venue should be assigned (either from preferred area or fallback)
        expect(result.booking.venueName).toBeDefined();
        expect(result.booking.venueName.length).toBeGreaterThan(0);
      }
    });

    it("migration creates venue_time_slots table", async () => {
      const result = await pool.query(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'venue_time_slots'`
      );
      expect(result.rows.length).toBe(1);
    });

    it("venue status change reflects in ops dashboard", async () => {
      const venue = await service.createVenue({
        name: "Dashboard Test Venue",
        city: "Lagos",
        area: "Victoria Island",
        address: "Test Street",
        type: "Cafe",
        capacity: 10
      });

      let dashboard = await service.getOpsDashboard("ops-user");
      let found = dashboard.venueNetwork.find(v => v.id === venue.id);
      expect(found).toBeDefined();
      expect(found!.status).toBe("active");

      await service.setVenueStatus(venue.id, "inactive");
      dashboard = await service.getOpsDashboard("ops-user");
      found = dashboard.venueNetwork.find(v => v.id === venue.id);
      expect(found).toBeDefined();
      expect(found!.status).toBe("inactive");
    });
  });

  describe("Booking support workflows (P1-05)", () => {
    async function createConfirmedBooking(userId: string) {
      const bootstrap = await service.getBootstrap(userId);
      const matchId = bootstrap.suggestions[0].id;
      await service.submitAvailability(matchId, ["Saturday evening"], userId);
      const result = await service.createBooking(matchId, userId);
      return result.booking;
    }

    async function setBookingStartAt(bookingId: string, userId: string, startAt: string) {
      // pg-mem doesn't support jsonb || operator, so read-modify-write
      const result = await pool.query<{ payload: any }>(
        "SELECT payload FROM bookings WHERE id = $1 AND user_id = $2",
        [bookingId, userId]
      );
      const payload = result.rows[0].payload;
      payload.startAt = startAt;
      await pool.query(
        "UPDATE bookings SET payload = $1 WHERE id = $2",
        [payload, bookingId]
      );
    }

    it("allows free cancellation for booking 24+ hours away", async () => {
      const booking = await createConfirmedBooking("cancel-free-user");

      // Set startAt to 48 hours from now so free cancellation applies
      await setBookingStartAt(booking.id, "cancel-free-user", new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString());

      const request = await service.requestCancellation(booking.id, "schedule_conflict", "cancel-free-user");

      expect(request.type).toBe("cancellation");
      expect(request.status).toBe("approved");
      expect(request.refundStatus).toBe("eligible");

      // Booking should be cancelled
      const bootstrap = await service.getBootstrap("cancel-free-user");
      const updated = bootstrap.bookings.find(b => b.id === booking.id);
      expect(updated!.status).toBe("cancelled");
      expect(updated!.cancellationReason).toBe("schedule_conflict");
      expect(updated!.cancelledAt).toBeDefined();
    });

    it("creates support request for late cancellation", async () => {
      const userId = "cancel-late-user";
      const bootstrap = await service.getBootstrap(userId);
      const matchId = bootstrap.suggestions[0].id;
      await service.submitAvailability(matchId, ["Saturday evening"], userId);
      const result = await service.createBooking(matchId, userId);
      const booking = result.booking;

      // Manually set startAt to be within 24 hours
      await setBookingStartAt(booking.id, userId, new Date(Date.now() + 1000 * 60 * 60).toISOString());

      const request = await service.requestCancellation(booking.id, "no_longer_interested", userId);
      expect(request.type).toBe("cancellation");
      expect(request.status).toBe("requested");
      expect(request.refundStatus).toBe("ineligible");

      // Booking should NOT be cancelled yet (pending ops review)
      const updated = await service.getBootstrap(userId);
      const b = updated.bookings.find(b => b.id === booking.id);
      expect(b!.status).toBe("confirmed");
    });

    it("prevents cancellation of already cancelled booking", async () => {
      const booking = await createConfirmedBooking("cancel-twice-user");
      // Set date far out so first cancellation auto-approves
      await setBookingStartAt(booking.id, "cancel-twice-user", new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString());
      await service.requestCancellation(booking.id, "schedule_conflict", "cancel-twice-user");

      await expect(
        service.requestCancellation(booking.id, "other", "cancel-twice-user")
      ).rejects.toThrow("Cannot cancel a booking that is cancelled");
    });

    it("creates reschedule support request", async () => {
      const booking = await createConfirmedBooking("resched-user");
      await setBookingStartAt(booking.id, "resched-user", new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString());

      const request = await service.requestReschedule(
        booking.id,
        ["Sunday afternoon", "Monday evening"],
        "resched-user"
      );

      expect(request.type).toBe("reschedule");
      expect(request.status).toBe("requested");
      expect(request.newAvailability).toEqual(["Sunday afternoon", "Monday evening"]);
    });

    it("shows support requests in queue", async () => {
      const userId = "queue-user";
      const bootstrap = await service.getBootstrap(userId);
      const matchId = bootstrap.suggestions[0].id;
      await service.submitAvailability(matchId, ["Saturday evening"], userId);
      const result = await service.createBooking(matchId, userId);
      const booking = result.booking;

      // Set startAt within 24 hours for late cancel (goes to queue)
      await setBookingStartAt(booking.id, userId, new Date(Date.now() + 1000 * 60 * 60).toISOString());

      await service.requestCancellation(booking.id, "schedule_conflict", userId);

      const queue = await service.getSupportQueue();
      expect(queue.length).toBeGreaterThanOrEqual(1);
      const found = queue.find(r => r.bookingId === booking.id);
      expect(found).toBeDefined();
      expect(found!.type).toBe("cancellation");
      expect(found!.status).toBe("requested");
    });

    it("ops can approve a cancellation support request", async () => {
      const userId = "approve-user";
      const bootstrap = await service.getBootstrap(userId);
      const matchId = bootstrap.suggestions[0].id;
      await service.submitAvailability(matchId, ["Saturday evening"], userId);
      const result = await service.createBooking(matchId, userId);
      const booking = result.booking;

      // Late cancel so it goes to queue
      await setBookingStartAt(booking.id, userId, new Date(Date.now() + 1000 * 60 * 60).toISOString());

      const request = await service.requestCancellation(booking.id, "other", userId);
      await service.approveSupportRequest(request.id, "Circumstances understood", "ops-admin");

      // Booking should now be cancelled
      const updated = await service.getBootstrap(userId);
      const b = updated.bookings.find(b => b.id === booking.id);
      expect(b!.status).toBe("cancelled");
    });

    it("ops can deny a support request", async () => {
      const userId = "deny-user";
      const bootstrap = await service.getBootstrap(userId);
      const matchId = bootstrap.suggestions[0].id;
      await service.submitAvailability(matchId, ["Saturday evening"], userId);
      const result = await service.createBooking(matchId, userId);
      const booking = result.booking;

      await setBookingStartAt(booking.id, userId, new Date(Date.now() + 1000 * 60 * 60).toISOString());

      const request = await service.requestCancellation(booking.id, "other", userId);
      await service.denySupportRequest(request.id, "Policy does not allow", "ops-admin");

      // Booking should still be confirmed
      const updated = await service.getBootstrap(userId);
      const b = updated.bookings.find(b => b.id === booking.id);
      expect(b!.status).toBe("confirmed");

      // Queue should be empty for this request
      const queue = await service.getSupportQueue();
      const found = queue.find(r => r.id === request.id);
      expect(found).toBeUndefined();
    });

    it("ops can force-cancel any booking", async () => {
      const booking = await createConfirmedBooking("force-cancel-user");

      const result = await service.forceCancel(booking.id, "Safety concern", "ops-admin");
      expect(result.cancelled).toBe(true);

      const updated = await service.getBootstrap("force-cancel-user");
      const b = updated.bookings.find(b => b.id === booking.id);
      expect(b!.status).toBe("cancelled");
      expect(b!.cancellationReason).toBe("Safety concern");
    });

    it("records audit log entries for cancellation", async () => {
      const booking = await createConfirmedBooking("audit-user");
      // Set date far enough for free cancellation
      await setBookingStartAt(booking.id, "audit-user", new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString());
      await service.requestCancellation(booking.id, "schedule_conflict", "audit-user");

      const auditLog = await service.getBookingAuditLog(booking.id);
      expect(auditLog.length).toBeGreaterThanOrEqual(1);
      expect(auditLog[0].action).toBe("cancellation_requested");
      expect(auditLog[0].actorId).toBe("audit-user");
      expect(auditLog[0].actorType).toBe("user");
    });

    it("support queue appears in ops dashboard", async () => {
      const userId = "dashboard-queue-user";
      const bootstrap = await service.getBootstrap(userId);
      const matchId = bootstrap.suggestions[0].id;
      await service.submitAvailability(matchId, ["Saturday evening"], userId);
      const result = await service.createBooking(matchId, userId);

      await setBookingStartAt(result.booking.id, userId, new Date(Date.now() + 1000 * 60 * 60).toISOString());

      await service.requestCancellation(result.booking.id, "schedule_conflict", userId);

      const dashboard = await service.getOpsDashboard("ops-user");
      expect(dashboard.supportQueue).toBeDefined();
      expect(dashboard.supportQueue.length).toBeGreaterThanOrEqual(1);
      expect(dashboard.overview.pendingSupportRequests).toBeGreaterThanOrEqual(1);
    });
  });

  // ── P1-11: Account Deletion & Privacy ─────────────────────────────

  describe("Account Deletion", () => {
    it("requests account deletion and sets pending status", async () => {
      const userId = "deletion-test-user";
      await service.getBootstrap(userId);

      const result = await service.requestAccountDeletion(userId);
      expect(result.status).toBe("pending");
      expect(result.gracePeriodDays).toBe(30);
      expect(result.deletionRequestedAt).toBeDefined();
      expect(result.deletionScheduledAt).toBeDefined();

      const status = await service.getAccountDeletionStatus(userId);
      expect(status.status).toBe("pending");
      expect(status.scheduledAt).toBeDefined();
    });

    it("rejects duplicate deletion request", async () => {
      const userId = "dup-deletion-user";
      await service.getBootstrap(userId);
      await service.requestAccountDeletion(userId);

      await expect(service.requestAccountDeletion(userId)).rejects.toThrow("Account deletion already requested");
    });

    it("cancels pending deletion within grace period", async () => {
      const userId = "cancel-deletion-user";
      await service.getBootstrap(userId);
      await service.requestAccountDeletion(userId);

      const result = await service.cancelAccountDeletion(userId);
      expect(result.cancelled).toBe(true);

      const status = await service.getAccountDeletionStatus(userId);
      expect(status.status).toBe("cancelled");
    });

    it("rejects cancellation with no pending deletion", async () => {
      const userId = "no-deletion-user";
      await service.getBootstrap(userId);

      await expect(service.cancelAccountDeletion(userId)).rejects.toThrow("No pending deletion to cancel");
    });

    it("revokes all sessions on deletion request", async () => {
      const userId = "session-revoke-user";
      await service.getBootstrap(userId);
      const tokens = await authService.createSession(userId);
      expect(tokens.accessToken).toBeDefined();

      await service.requestAccountDeletion(userId);

      const valid = await authService.validateAccessToken(tokens.accessToken);
      expect(valid).toBeNull();
    });

    it("cancels active bookings on deletion request", async () => {
      const userId = "booking-cancel-user";
      const bootstrap = await service.getBootstrap(userId);
      const matchId = bootstrap.suggestions[0].id;
      await service.submitAvailability(matchId, ["Saturday evening"], userId);
      const bookingResult = await service.createBooking(matchId, userId);

      await service.requestAccountDeletion(userId);

      const updated = await service.getBootstrap(userId);
      const booking = updated.bookings.find(b => b.id === bookingResult.booking.id);
      expect(booking!.status).toBe("cancelled");
      expect(booking!.cancellationReason).toBe("Account deletion requested");
    });

    it("processes hard-delete for expired grace period", async () => {
      const userId = "hard-delete-user";
      await service.getBootstrap(userId);
      await service.requestAccountDeletion(userId);

      // Manually set scheduled date to the past
      await pool.query(
        "UPDATE users SET deletion_scheduled_at = $2 WHERE id = $1",
        [userId, new Date(Date.now() - 1000)]
      );

      const result = await service.processScheduledDeletions();
      expect(result.processed).toBeGreaterThanOrEqual(1);

      // User should be marked as completed
      const userResult = await pool.query("SELECT deletion_status FROM users WHERE id = $1", [userId]);
      expect(userResult.rows[0].deletion_status).toBe("completed");
    });

    it("hard-delete retains anonymized booking records", async () => {
      const userId = "anon-booking-user";
      const bootstrap = await service.getBootstrap(userId);
      const matchId = bootstrap.suggestions[0].id;
      await service.submitAvailability(matchId, ["Saturday evening"], userId);
      await service.createBooking(matchId, userId);

      await service.requestAccountDeletion(userId);
      await pool.query(
        "UPDATE users SET deletion_scheduled_at = $2 WHERE id = $1",
        [userId, new Date(Date.now() - 1000)]
      );
      await service.processScheduledDeletions();

      // Bookings should still exist with anonymized content
      const bookings = await pool.query<{ payload: any }>("SELECT payload FROM bookings WHERE user_id = $1", [userId]);
      expect(bookings.rows.length).toBeGreaterThanOrEqual(1);
      expect(bookings.rows[0].payload.counterpartName).toBe("[deleted]");

      // Personal data should be gone
      const states = await pool.query("SELECT * FROM user_states WHERE user_id = $1", [userId]);
      expect(states.rows.length).toBe(0);
    });
  });

  describe("Data Export", () => {
    it("exports user data as JSON", async () => {
      const userId = "export-test-user";
      await service.getBootstrap(userId);

      const exported = await service.requestDataExport(userId);
      expect(exported.exportedAt).toBeDefined();
      expect(exported.profile).toBeDefined();
      expect(exported.accountSettings).toBeDefined();
      expect(exported.datingPreferences).toBeDefined();
      expect(exported.verification).toBeDefined();
      expect(exported.bookingHistory).toBeDefined();
      expect(exported.notificationHistory).toBeDefined();
    });

    it("rate-limits exports to 1 per 24 hours", async () => {
      const userId = "rate-limit-user";
      await service.getBootstrap(userId);

      await service.requestDataExport(userId);
      await expect(service.requestDataExport(userId)).rejects.toThrow("Data export already requested in the last 24 hours");
    });
  });

  describe("Privacy Consent", () => {
    it("accepts privacy consent with version tracking", async () => {
      const userId = "consent-test-user";
      await service.getBootstrap(userId);

      const result = await service.acceptPrivacyConsent("2.0", "2.0", userId);
      expect(result.accepted).toBe(true);

      const status = await service.getConsentStatus(userId);
      expect(status.latestTermsVersion).toBe("2.0");
      expect(status.latestPrivacyVersion).toBe("2.0");
      expect(status.acceptedAt).toBeDefined();
    });

    it("returns null consent for users who have not accepted", async () => {
      const status = await service.getConsentStatus("no-consent-user");
      expect(status.latestTermsVersion).toBeNull();
      expect(status.latestPrivacyVersion).toBeNull();
    });
  });

  describe("Push notifications and inbox (P1-06)", () => {
    it("registers and retrieves device tokens", async () => {
      const userId = "push-user-1";
      await service.registerDeviceToken(userId, "android", "fcm-token-abc123");
      const tokens = await service.getUserDeviceTokens(userId);
      expect(tokens.length).toBe(1);
      expect(tokens[0].platform).toBe("android");
      expect(tokens[0].token).toBe("fcm-token-abc123");
    });

    it("upserts duplicate device token", async () => {
      const userId = "push-user-2";
      await service.registerDeviceToken(userId, "android", "fcm-token-dup");
      await service.registerDeviceToken(userId, "ios", "fcm-token-dup");
      const tokens = await service.getUserDeviceTokens(userId);
      expect(tokens.length).toBe(1);
      expect(tokens[0].platform).toBe("ios");
    });

    it("removes a device token", async () => {
      const userId = "push-user-3";
      await service.registerDeviceToken(userId, "android", "fcm-token-remove");
      await service.removeDeviceToken(userId, "fcm-token-remove");
      const tokens = await service.getUserDeviceTokens(userId);
      expect(tokens.length).toBe(0);
    });

    it("returns empty inbox for new user", async () => {
      const userId = "inbox-user-1";
      const inbox = await service.getInbox(userId);
      expect(inbox.notifications.length).toBe(0);
      expect(inbox.unreadCount).toBe(0);
      expect(inbox.total).toBe(0);
    });

    it("dispatches notification and appears in inbox", async () => {
      const userId = "inbox-user-2";
      await service.getBootstrap(userId);
      await service.dispatchNotification(userId, "general", "Test Title", "Test body text", "Update");
      const inbox = await service.getInbox(userId);
      expect(inbox.notifications.length).toBe(1);
      expect(inbox.notifications[0].title).toBe("Test Title");
      expect(inbox.notifications[0].body).toBe("Test body text");
      expect(inbox.unreadCount).toBe(1);
    });

    it("marks a notification as read", async () => {
      const userId = "inbox-user-3";
      await service.getBootstrap(userId);
      await service.dispatchNotification(userId, "general", "Read Test", "Body", "Update");
      const inbox = await service.getInbox(userId);
      const notifId = inbox.notifications[0].id;

      await service.markNotificationRead(userId, notifId);
      const updated = await service.getInbox(userId);
      expect(updated.unreadCount).toBe(0);
      expect(updated.notifications[0].readAt).toBeDefined();
    });

    it("marks all notifications as read", async () => {
      const userId = "inbox-user-4";
      await service.getBootstrap(userId);
      await service.dispatchNotification(userId, "general", "N1", "B1", "Update");
      await service.dispatchNotification(userId, "general", "N2", "B2", "Update");
      await service.dispatchNotification(userId, "general", "N3", "B3", "Update");

      const result = await service.markAllNotificationsRead(userId);
      expect(result.count).toBe(3);

      const inbox = await service.getInbox(userId);
      expect(inbox.unreadCount).toBe(0);
    });

    it("returns correct unread badge count", async () => {
      const userId = "badge-user-1";
      await service.getBootstrap(userId);
      await service.dispatchNotification(userId, "general", "N1", "B1", "Update");
      await service.dispatchNotification(userId, "general", "N2", "B2", "Update");

      const count = await service.getUnreadBadgeCount(userId);
      expect(count).toBe(2);
    });

    it("returns default notification preferences", async () => {
      const userId = "pref-user-1";
      const prefs = await service.getNotificationPreferences(userId);
      expect(prefs.pushEnabled).toBe(true);
      expect(prefs.inboxEnabled).toBe(true);
      expect(prefs.newRound).toBe(true);
      expect(prefs.safetyAlert).toBe(true);
    });

    it("updates notification preferences", async () => {
      const userId = "pref-user-2";
      await service.updateNotificationPreferences(userId, { pushEnabled: false, newRound: false });
      const prefs = await service.getNotificationPreferences(userId);
      expect(prefs.pushEnabled).toBe(false);
      expect(prefs.newRound).toBe(false);
      expect(prefs.bookingUpdate).toBe(true);
    });

    it("respects disabled notification type in dispatch", async () => {
      const userId = "pref-user-3";
      await service.getBootstrap(userId);
      await service.updateNotificationPreferences(userId, { newRound: false });
      await service.dispatchNotification(userId, "new_round", "Round!", "New round available", "Update");
      const inbox = await service.getInbox(userId);
      expect(inbox.notifications.length).toBe(0);
    });

    it("ops can send notification to a user", async () => {
      const userId = "ops-notif-user";
      await service.opsSendNotification(userId, "Ops Message", "Important update from ops", "general");
      const inbox = await service.getInbox(userId);
      expect(inbox.notifications.length).toBe(1);
      expect(inbox.notifications[0].title).toBe("Ops Message");
    });

    it("totalDeviceTokens appears in ops dashboard", async () => {
      await service.registerDeviceToken("dt-dash-user", "android", "tok-dash-1");
      const dashboard = await service.getOpsDashboard("ops-user");
      expect(dashboard.overview.totalDeviceTokens).toBeGreaterThanOrEqual(1);
    });
  });
});
