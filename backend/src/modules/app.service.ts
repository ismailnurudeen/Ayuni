import { Injectable, OnModuleInit } from "@nestjs/common";
import { PoolClient } from "pg";
import { QueryResult, QueryResultRow } from "pg";
import { DatabaseService } from "../database/database.service";
import { AuthService } from "./auth.service";
import { OtpService } from "./otp.service";
import { TwilioSmsService } from "./sms.service";
import { FirebaseAuthService } from "./firebase-auth.service";
import { MediaService } from "./media.service";
import { PaystackService } from "./paystack.service";
import { ReminderService } from "./reminder.service";
import { PushService } from "./push.service";
import { AnalyticsService } from "./analytics.service";
import {
  AccountSettings,
  AppPreferences,
  BasicOnboardingPayload,
  BookingAuditEntry,
  BookingSupportRequest,
  BootstrapPayload,
  City,
  CreateVenuePayload,
  DateBooking,
  DatingPreferences,
  DeviceToken,
  EditableProfile,
  InboxNotification,
  MatchroundState,
  NotificationCategory,
  NotificationPreferences,
  NotificationType,
  OpsDashboard,
  OperatingHours,
  PaymentMethod,
  PaymentRecord,
  ProfileMedia,
  RoundReaction,
  SafetyReport,
  SafetyIncident,
  AccountFreeze,
  SuggestionProfile,
  SupportRequestStatus,
  UpdateVenuePayload,
  UserStateRecord,
  VenueDetail,
  VenueListFilter,
  VenuePartner,
  VenueStatus,
  VenueTimeSlot,
  VerificationStatus,
  AccountDeletionRequest,
  DataExportPayload,
  DataExportRequest
} from "./app.types";
import { createInitialUserState, suggestionFixtures, venueFixtures } from "./demo-data";

type SqlClient = {
  query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<T>>;
};

type Queryable = SqlClient;

type UserStateRow = {
  onboarding: UserStateRecord["onboarding"];
  verification: UserStateRecord["verification"];
  safety: UserStateRecord["safety"];
  matchround: UserStateRecord["matchround"];
  user_summary: UserStateRecord["userSummary"];
  editable_profile: UserStateRecord["editableProfile"];
  dating_preferences: UserStateRecord["datingPreferences"];
  account_settings: UserStateRecord["accountSettings"];
  app_preferences: UserStateRecord["appPreferences"];
  pending_phone_number: string;
  next_notification_id: number;
  next_booking_id: number;
  next_report_id: number;
  next_payment_id: number;
  next_incident_id: number;
};

type RoundRow = {
  id: string;
  payload: MatchroundState;
};

type Aggregate = {
  state: UserStateRecord;
  suggestions: SuggestionProfile[];
  bookings: DateBooking[];
  notifications: InboxNotification[];
  reports: SafetyReport[];
  reactions: Record<string, RoundReaction>;
  venues: VenuePartner[];
  media: ProfileMedia[];
};

@Injectable()
export class AppService implements OnModuleInit {
  constructor(
    private readonly database: DatabaseService,
    private readonly authService: AuthService,
    private readonly otpService: OtpService,
    private readonly smsService: TwilioSmsService,
    private readonly firebaseAuthService: FirebaseAuthService,
    private readonly mediaService: MediaService,
    private readonly paystackService: PaystackService,
    private readonly reminderService: ReminderService,
    private readonly pushService: PushService,
    private readonly analyticsService: AnalyticsService
  ) {}

  async onModuleInit() {
    await this.seedCatalogData();
  }

  health() {
    return {
      ok: true,
      product: "ayuni",
      dropHourWAT: 20,
      persistence: this.database.isPersistent() ? "postgres" : "pg-mem"
    };
  }

  async getBootstrap(rawUserId?: string): Promise<BootstrapPayload> {
    const aggregate = await this.loadAggregate(this.resolveUserId(rawUserId));
    return this.buildBootstrap(aggregate);
  }

  async requestPhoneOtp(phoneNumber: string) {
    const normalizedPhone = this.otpService.normalizeNigerianPhone(phoneNumber);
    const userId = normalizedPhone;
    await this.ensureUser(userId);

    const result = await this.database.withTransaction(async (client) => {
      // Request OTP through OTP service
      const otpResult = await this.otpService.requestOtp(
        phoneNumber,
        client,
        async (phone: string, code: string) => {
          await this.smsService.sendOtp(phone, code);
        }
      );

      if (!otpResult.success) {
        return otpResult;
      }

      // Update user state with pending phone number
      const state = await this.loadState(userId, client);
      const normalizedPhone = this.otpService.normalizeNigerianPhone(phoneNumber);
      state.onboarding = {
        ...state.onboarding,
        step: "OtpVerification",
        phoneNumber: normalizedPhone
      };
      state.pendingPhoneNumber = normalizedPhone;
      await this.saveState(userId, state, client);

      return otpResult;
    });

    if (!result.success) {
      // Return error information
      return {
        phoneNumber,
        otpSent: false,
        error: result.reason,
        retryAfterSeconds: result.retryAfterSeconds,
        blockedUntil: result.blockedUntil
      };
    }

    return {
      phoneNumber: this.otpService.normalizeNigerianPhone(phoneNumber),
      otpSent: true,
      deliveryChannel: "SMS",
      country: "NG",
      retryAfterSeconds: result.retryAfterSeconds
    };
  }

  async verifyPhoneOtp(phoneNumber: string, code: string, deviceInfo?: string) {
    const normalizedPhone = this.otpService.normalizeNigerianPhone(phoneNumber);
    const userId = normalizedPhone;
    await this.ensureUser(userId);

    const result = await this.database.withTransaction(async (client) => {
      const state = await this.loadState(userId, client);
      
      // Verify OTP through OTP service
      const verificationResult = await this.otpService.verifyOtp(phoneNumber, code, client);

      if (!verificationResult.success) {
        return { success: false, reason: verificationResult.reason, tokens: null };
      }

      // OTP verified successfully
      const normalizedPhone = this.otpService.normalizeNigerianPhone(phoneNumber);
      
      state.verification.phoneVerified = true;
      state.accountSettings = {
        ...state.accountSettings,
        phoneNumber: normalizedPhone
      };
      state.onboarding = {
        ...state.onboarding,
        step: "BasicProfile",
        phoneNumber: normalizedPhone
      };
      state.pendingPhoneNumber = "";
      await client.query("UPDATE users SET phone_number = $2, updated_at = NOW() WHERE id = $1", [userId, normalizedPhone]);
      await this.saveState(userId, state, client);

      // Create authenticated session and return tokens
      const tokens = await this.authService.createSession(userId, deviceInfo, client);
      return { success: true, tokens };
    });

    if (!result.success) {
      return {
        verified: false,
        error: result.reason,
        bootstrap: await this.getBootstrap(userId)
      };
    }

    return {
      verified: true,
      ...result.tokens,
      bootstrap: await this.getBootstrap(userId)
    };
  }

  /**
   * Verify phone number via Firebase Phone Auth.
   * The mobile app handles OTP send/verify via Firebase SDK,
   * then sends the resulting Firebase ID token here.
   */
  async verifyFirebasePhone(firebaseIdToken: string, deviceInfo?: string) {

    const firebaseResult = await this.firebaseAuthService.verifyIdToken(firebaseIdToken);
    if (!firebaseResult) {
      return {
        verified: false,
        error: "invalid_token",
      };
    }

    const normalizedPhone = this.otpService.normalizeNigerianPhone(firebaseResult.phoneNumber);

    if (!this.otpService.validateNigerianPhone(normalizedPhone)) {
      return {
        verified: false,
        error: "invalid_phone",
      };
    }

    const userId = normalizedPhone;
    await this.ensureUser(userId);

    const result = await this.database.withTransaction(async (client) => {
      const state = await this.loadState(userId, client);

      state.verification.phoneVerified = true;
      state.accountSettings = {
        ...state.accountSettings,
        phoneNumber: normalizedPhone
      };
      state.onboarding = {
        ...state.onboarding,
        step: "BasicProfile",
        phoneNumber: normalizedPhone
      };
      state.pendingPhoneNumber = "";
      await client.query("UPDATE users SET phone_number = $2, updated_at = NOW() WHERE id = $1", [userId, normalizedPhone]);
      await this.saveState(userId, state, client);

      const tokens = await this.authService.createSession(userId, deviceInfo, client);
      return { success: true, tokens };
    });

    return {
      verified: true,
      ...result.tokens,
      bootstrap: await this.getBootstrap(userId)
    };
  }

  /**
   * Returns the active auth provider based on AUTH_PROVIDER env var.
   */
  getAuthProvider(): "firebase" | "twilio" {
    return process.env.AUTH_PROVIDER === "firebase" ? "firebase" : "twilio";
  }

  async completeBasicOnboarding(body: BasicOnboardingPayload, rawUserId?: string) {
    const userId = this.resolveUserId(rawUserId);
    await this.ensureUser(userId);

    if (!body.acceptedTerms) {
      throw new Error("You must accept the terms and conditions to continue");
    }

    // Validate age (must be 18+)
    const age = this.calculateAge(body.birthDate);
    if (age < 18) {
      throw new Error("You must be 18 or older to use Ayuni");
    }

    await this.database.withTransaction(async (client) => {
      const state = await this.loadState(userId, client);
      
      // Record terms acceptance
      await client.query(
        `INSERT INTO terms_acceptances (id, user_id, accepted_at, terms_version, privacy_version)
         VALUES ($1, $2, NOW(), $3, $4)`,
        [this.generateId(), userId, "1.0", "1.0"]
      );

      state.userSummary.firstName = body.firstName;
      state.userSummary.completionLabel = "Profile started";
      state.accountSettings = {
        ...state.accountSettings,
        name: body.firstName,
        gender: body.genderIdentity,
        birthDate: body.birthDate,
        residence: body.city
      };
      state.datingPreferences = {
        ...state.datingPreferences,
        genderIdentity: body.interestedIn,
        dateCities: [body.city]
      };
      state.editableProfile = {
        ...state.editableProfile,
        datingIntention: "Intentional dating"
      };
      state.onboarding = {
        ...state.onboarding,
        step: "Complete",
        completed: true
      };
      this.refreshCompletion(state);
      await this.pushNotification(
        userId,
        state,
        "Welcome to Ayuni",
        "Your account is live. You can finish the rest of your profile and verification later.",
        "Update",
        client
      );
      await this.saveState(userId, state, client);
    });

    await this.analyticsService.trackEvent(userId, "onboarding_basic_profile_completed", { city: body.city });

    return this.getBootstrap(userId);
  }

  /**
   * Calculate age from birth date string (YYYY-MM-DD format)
   */
  private calculateAge(birthDate: string): number {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    // Adjust if birthday hasn't occurred yet this year
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Generate a unique ID for database records
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  async getVerification(rawUserId?: string): Promise<VerificationStatus> {
    const userId = this.resolveUserId(rawUserId);
    await this.ensureUser(userId);
    return (await this.loadState(userId)).verification;
  }

  async submitSelfie(imageUrl: string, rawUserId?: string) {
    const userId = this.resolveUserId(rawUserId);
    await this.ensureUser(userId);

    const result = await this.database.withTransaction(async (client) => {
      const submissionId = this.generateId();
      
      // Create selfie submission in pending state
      await client.query(
        `INSERT INTO selfie_submissions 
         (id, user_id, image_url, review_status, submitted_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [submissionId, userId, imageUrl, "pending"]
      );

      // Notify user
      const state = await this.loadState(userId, client);
      await this.pushNotification(
        userId,
        state,
        "Selfie submitted for review",
        "We'll review your selfie verification shortly. This usually takes a few minutes.",
        "Update",
        client
      );
      await this.saveState(userId, state, client);

      return {
        submissionId,
        status: "pending",
        message: "Selfie submitted successfully and is awaiting review"
      };
    });
    await this.analyticsService.trackEvent(userId, "selfie_submitted", {});
    return result;
  }

  async verifySelfie(rawUserId?: string) {
    // Legacy method for backward compatibility - auto-approve
    const userId = this.resolveUserId(rawUserId);
    await this.ensureUser(userId);

    await this.database.withTransaction(async (client) => {
      const state = await this.loadState(userId, client);
      state.verification.selfieVerified = true;
      await this.pushNotification(
        userId,
        state,
        "Selfie verification approved",
        "Your liveness check passed. You are one step closer to booking.",
        "Update",
        client
      );
      await this.saveState(userId, state, client);
    });

    return {
      status: "approved",
      reviewMode: "liveness"
    };
  }

  async verifyId(rawUserId?: string) {
    const userId = this.resolveUserId(rawUserId);
    await this.ensureUser(userId);

    await this.database.withTransaction(async (client) => {
      const state = await this.loadState(userId, client);
      state.verification.governmentIdVerified = true;
      await this.pushNotification(
        userId,
        state,
        "Government ID received",
        "Your ID is now pending a quick trust review before your next date.",
        "Update",
        client
      );
      await this.saveState(userId, state, client);
    });

    return {
      status: "pending_manual_review"
    };
  }

  async submitGovId(
    frontImageUrl: string,
    idType: "national_id" | "drivers_license" | "passport" | "voters_card",
    rawUserId?: string,
    backImageUrl?: string
  ) {
    const userId = this.resolveUserId(rawUserId);
    await this.ensureUser(userId);

    const result = await this.database.withTransaction(async (client) => {
      const submissionId = this.generateId();
      
      // Create gov ID submission in pending state
      await client.query(
        `INSERT INTO gov_id_submissions 
         (id, user_id, front_image_url, back_image_url, id_type, review_status, submitted_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [submissionId, userId, frontImageUrl, backImageUrl || null, idType, "pending"]
      );

      // Update verification status
      const state = await this.loadState(userId, client);
      state.verification.govIdStatus = "pending_review";
      state.verification.govIdSubmissionId = submissionId;
      
      // Notify user
      await this.pushNotification(
        userId,
        state,
        "Government ID submitted for review",
        "We'll review your ID shortly. This usually takes a few hours.",
        "Update",
        client
      );
      await this.saveState(userId, state, client);

      return {
        submissionId,
        status: "pending_review",
        message: "Government ID submitted successfully and is awaiting review"
      };
    });
    await this.analyticsService.trackEvent(userId, "gov_id_submitted", { idType });
    return result;
  }

  async getDailySuggestions(city: City, rawUserId?: string) {
    const aggregate = await this.loadAggregate(this.resolveUserId(rawUserId));
    return aggregate.suggestions.filter((profile) => profile.city === city && !aggregate.reactions[profile.id]).slice(0, 5);
  }

  async respondToMatch(matchId: string, response: "accept" | "reject", rawUserId?: string) {
    const userId = this.resolveUserId(rawUserId);
    await this.ensureUser(userId);

    const result = await this.database.withTransaction(async (client) => {
      const aggregate = await this.loadAggregate(userId, client);
      const reaction: RoundReaction = response === "accept" ? "Accepted" : "Declined";
      const existingReaction = aggregate.reactions[matchId];
      const acceptedCount = Object.values(aggregate.reactions).filter((item) => item === "Accepted").length;

      if (reaction === "Accepted" && existingReaction !== "Accepted" && acceptedCount >= 5) {
        return {
          success: false,
          reason: "accepted_limit_reached" as const
        };
      }

      await client.query(
        `
          INSERT INTO reactions (user_id, profile_id, reaction, updated_at)
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT (user_id, profile_id)
          DO UPDATE SET reaction = EXCLUDED.reaction, updated_at = NOW()
        `,
        [userId, matchId, reaction]
      );

      const profile = aggregate.suggestions.find((item) => item.id === matchId);
      if (profile) {
        await this.pushNotification(
          userId,
          aggregate.state,
          reaction === "Accepted" ? `You accepted ${profile.displayName}` : `You declined ${profile.displayName}`,
          reaction === "Accepted"
            ? "Nice. If they like you too, we will move straight into date planning."
            : "No worries. We removed them from your active round and kept the activity in your 24-hour page.",
          reaction === "Accepted" ? "Update" : "Cancellation",
          client
        );
        await this.saveState(userId, aggregate.state, client);
      }

      return {
        success: true,
        nextStep: reaction === "Accepted" ? "availability" : "closed"
      };
    });

    if (!result.success) {
      return {
        ...result,
        bootstrap: await this.getBootstrap(userId)
      };
    }

    await this.analyticsService.trackEvent(userId, "round_reaction_submitted", { matchId, reaction: result.nextStep === "availability" ? "accept" : "reject" });
    if (result.nextStep === "availability") {
      await this.analyticsService.trackEvent(userId, "match_accepted", { matchId });
    }

    return {
      ...result,
      bootstrap: await this.getBootstrap(userId)
    };
  }

  async submitAvailability(matchId: string, availability: string[], rawUserId?: string) {
    const userId = this.resolveUserId(rawUserId);
    await this.ensureUser(userId);

    return this.database.withTransaction(async (client) => {
      const aggregate = await this.loadAggregate(userId, client);
      const state = aggregate.state;
      
      // Check if user is frozen
      if (this.isFrozen(state)) {
        throw new Error(`Account is frozen until ${state.safety.activeFreeze!.frozenUntil}. Please contact support.`);
      }
      
      // Check if gov ID verification is required
      const toggleRows = await client.query<{ enabled: boolean }>(
        "SELECT enabled FROM feature_toggles WHERE name = $1",
        ["require_gov_id_for_booking"]
      );
      const requireGovId = toggleRows.rows[0]?.enabled || false;
      
      if (requireGovId && !state.verification.governmentIdVerified) {
        const statusMsg = state.verification.govIdStatus === "pending_review"
          ? "Your government ID is being reviewed. You'll be able to submit availability once it's approved."
          : state.verification.govIdStatus === "rejected"
          ? `Your ID was rejected: ${state.verification.govIdRejectionReason || "Please resubmit a clear photo."}`
          : "Please submit your government ID before booking your first date.";
        throw new Error(statusMsg);
      }
      
      const profile = aggregate.suggestions.find((s) => s.id === matchId);
      
      if (!profile) {
        throw new Error("Match not found");
      }

      // Check if booking intent already exists
      const existingBooking = aggregate.bookings.find(b => b.matchId === matchId);
      
      let booking: DateBooking;
      
      if (existingBooking) {
        // Update existing booking with availability
        existingBooking.availability = availability;
        existingBooking.status = "availability_submitted";
        existingBooking.updatedAt = new Date().toISOString();
        booking = existingBooking;
        await this.saveBooking(userId, booking, client);
      } else {
        // Create new booking intent
        booking = {
          id: `book-${state.nextBookingId++}`,
          matchId: matchId,
          status: "availability_submitted",
          venueName: "", // Will be assigned later
          city: profile.city,
          dateType: profile.preferredDateType,
          startAt: "", // Will be scheduled later
          logisticsChatOpensBeforeHours: 2,
          checkInStatus: "Pending",
          tokenAmountNgn: 3500,
          bothPaid: false,
          counterpartName: profile.displayName,
          venueAddress: "",
          availability: availability,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        await client.query(
          `INSERT INTO bookings (id, user_id, payload, created_at, updated_at)
           VALUES ($1, $2, $3, NOW(), NOW())`,
          [booking.id, userId, booking]
        );
        await this.saveState(userId, state, client);
      }

      await this.pushNotification(
        userId,
        state,
        "Availability submitted",
        `We received your availability for ${profile.displayName}. Payment is required to confirm.`,
        "Update",
        client
      );

      await this.saveState(userId, state, client);

      return {
        matchId,
        bookingId: booking.id,
        availability,
        paymentRequired: true
      };
    });

    await this.analyticsService.trackEvent(userId, "availability_submitted", { matchId });
  }

  async initiateDateToken(paymentMethod: PaymentMethod, rawUserId?: string, bookingId?: string) {
    const userId = this.resolveUserId(rawUserId);
    await this.ensureUser(userId);

    const payment = await this.database.withTransaction(async (client) => {
      const state = await this.loadState(userId, client);
      
      // Generate email for Paystack (we don't store email in users table yet)
      const userEmail = `${userId}@ayuni.app`;
      
      // Generate payment reference
      const paymentId = `pay-${state.nextPaymentId++}`;
      const reference = `ayuni_${paymentId}_${Date.now()}`;
      
      // Determine channels based on payment method
      let channels: string[] = [];
      if (paymentMethod === "card") {
        channels = ["card"];
      } else if (paymentMethod === "bank_transfer") {
        channels = ["bank_transfer", "bank"];
      } else if (paymentMethod === "ussd") {
        channels = ["ussd"];
      }
      
      // Initialize payment with Paystack
      const paystackResult = await this.paystackService.initializeTransaction({
        email: userEmail,
        amount: 3500,
        reference: reference,
        metadata: {
          userId: userId,
          paymentId: paymentId,
          bookingId: bookingId,
          paymentMethod: paymentMethod
        },
        channels: channels
      });
      
      const record: PaymentRecord = {
        id: paymentId,
        paymentMethod,
        amountNgn: 3500,
        expiresInMinutes: paymentMethod === "ussd" ? 360 : 30,
        status: "initiated",
        paystackReference: paystackResult.data.reference,
        paystackAuthUrl: paystackResult.data.authorization_url,
        bookingId: bookingId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await client.query(
        `INSERT INTO payments (id, user_id, status, payment_method, payload, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [record.id, userId, record.status, paymentMethod, record]
      );
      await this.saveState(userId, state, client);
      return record;
    });

    await this.analyticsService.trackEvent(userId, "payment_initiated", { paymentMethod, bookingId: bookingId || "" });

    return payment;
  }

  async handlePaymentSuccess(reference: string, userId?: string, paymentId?: string, bookingId?: string) {
    // Make this idempotent - check if payment already processed
    if (!paymentId || !userId) {
      console.error("⚠️  Payment success webhook missing userId or paymentId");
      return;
    }

    return this.database.withTransaction(async (client) => {
      // Load payment record
      const paymentResult = await client.query(
        "SELECT payload FROM payments WHERE id = $1 AND user_id = $2",
        [paymentId, userId]
      );

      if (paymentResult.rows.length === 0) {
        console.error(`⚠️  Payment ${paymentId} not found for user ${userId}`);
        return;
      }

      const payment = paymentResult.rows[0].payload as PaymentRecord;

      // Idempotency check - if already completed, skip
      if (payment.status === "completed") {
        console.log(`✓ Payment ${paymentId} already processed, skipping`);
        return;
      }

      // Verify with Paystack
      const verification = await this.paystackService.verifyTransaction(reference);
      
      if (!this.paystackService.isPaymentSuccessful(verification.data.status)) {
        console.error(`⚠️  Payment ${paymentId} verification failed: ${verification.data.status}`);
        await this.handlePaymentFailure(reference, userId, paymentId);
        return;
      }

      // Update payment status
      payment.status = "completed";
      payment.updatedAt = new Date().toISOString();
      await client.query(
        "UPDATE payments SET status = $1, payload = $2, updated_at = NOW() WHERE id = $3",
        [payment.status, payment, paymentId]
      );

      // If linked to booking, transition booking to payment_pending or confirmed
      if (bookingId) {
        const bookingResult = await client.query(
          "SELECT payload FROM bookings WHERE id = $1 AND user_id = $2",
          [bookingId, userId]
        );

        if (bookingResult.rows.length > 0) {
          const booking = bookingResult.rows[0].payload as DateBooking;
          if (booking.status === "availability_submitted" || booking.status === "payment_pending") {
            booking.status = "confirmed";
            booking.bothPaid = true;
            booking.updatedAt = new Date().toISOString();
            await client.query(
              "UPDATE bookings SET payload = $1, updated_at = NOW() WHERE id = $2",
              [booking, bookingId]
            );
          }
        }
      }

      // Send notification
      const state = await this.loadState(userId, client);
      await this.pushNotification(
        userId,
        state,
        "Payment successful",
        bookingId ? "Your date is confirmed! Check the Dates tab for details." : "Your date token payment was successful.",
        "Update",
        client
      );

      // Send WhatsApp/SMS booking confirmation reminder
      if (bookingId) {
        try {
          const bookingResult2 = await client.query(
            "SELECT payload FROM bookings WHERE id = $1 AND user_id = $2",
            [bookingId, userId]
          );
          if (bookingResult2.rows.length > 0) {
            const confirmedBooking = bookingResult2.rows[0].payload as DateBooking;
            const phoneNumber = state.accountSettings?.phoneNumber || "";
            const userName = state.userSummary?.firstName || "there";
            if (phoneNumber) {
              await this.reminderService.sendBookingConfirmation(userId, confirmedBooking, phoneNumber, userName);
            }
          }
        } catch (reminderErr) {
          console.error("⚠️  Failed to send booking confirmation reminder:", reminderErr);
        }
      }

      console.log(`✓ Payment ${paymentId} completed for user ${userId}`);
    });

    await this.analyticsService.trackEvent(userId!, "payment_completed", { bookingId: bookingId || "" });
  }

  async handlePaymentFailure(reference: string, userId?: string, paymentId?: string) {
    if (!paymentId || !userId) {
      console.error("⚠️  Payment failure webhook missing userId or paymentId");
      return;
    }

    return this.database.withTransaction(async (client) => {
      const paymentResult = await client.query(
        "SELECT payload FROM payments WHERE id = $1 AND user_id = $2",
        [paymentId, userId]
      );

      if (paymentResult.rows.length === 0) {
        console.error(`⚠️  Payment ${paymentId} not found for user ${userId}`);
        return;
      }

      const payment = paymentResult.rows[0].payload as PaymentRecord;

      // Update payment status to failed
      payment.status = "failed";
      payment.updatedAt = new Date().toISOString();
      await client.query(
        "UPDATE payments SET status = $1, payload = $2, updated_at = NOW() WHERE id = $3",
        [payment.status, payment, paymentId]
      );

      // Send notification
      const state = await this.loadState(userId, client);
      await this.pushNotification(
        userId,
        state,
        "Payment failed",
        "Your payment could not be completed. Please try again.",
        "Update",
        client
      );

      console.log(`✗ Payment ${paymentId} failed for user ${userId}`);
    });
  }

  async getBookings(rawUserId?: string) {
    const userId = this.resolveUserId(rawUserId);
    await this.ensureUser(userId);
    return this.loadBookings(userId);
  }

  async createBooking(matchId: string, rawUserId?: string) {
    const userId = this.resolveUserId(rawUserId);
    await this.ensureUser(userId);

    const booking = await this.database.withTransaction(async (client) => {
      const aggregate = await this.loadAggregate(userId, client);
      const profile = aggregate.suggestions.find((item) => item.id === matchId) ?? aggregate.suggestions[0];
      const state = aggregate.state;
      
      // Check if user is frozen
      if (this.isFrozen(state)) {
        throw new Error(`Account is frozen until ${state.safety.activeFreeze!.frozenUntil}. Please contact support.`);
      }
      
      // Check if gov ID verification is required
      const toggleRows = await client.query<{ enabled: boolean }>(
        "SELECT enabled FROM feature_toggles WHERE name = $1",
        ["require_gov_id_for_booking"]
      );
      const requireGovId = toggleRows.rows[0]?.enabled || false;
      
      if (requireGovId && !state.verification.governmentIdVerified) {
        const statusMsg = state.verification.govIdStatus === "pending_review"
          ? "Your government ID is being reviewed. You'll be able to book once it's approved."
          : state.verification.govIdStatus === "rejected"
          ? `Your ID was rejected: ${state.verification.govIdRejectionReason || "Please resubmit a clear photo."}`
          : "Please submit your government ID before booking your first date.";
        throw new Error(statusMsg);
      }
      
      // Find existing booking for this match
      const existingBooking = aggregate.bookings.find(b => b.matchId === matchId);
      
      let finalBooking: DateBooking;
      
      // Smart venue assignment: prefer user's area preferences, check capacity
      const preferredAreas = state.datingPreferences.dateAreas || [];
      
      if (existingBooking && (existingBooking.status === "availability_submitted" || existingBooking.status === "payment_pending")) {
        // Update existing booking to confirmed status with smart venue assignment
        const assignedVenue = await this.assignVenueForBooking(existingBooking, preferredAreas, client);
        existingBooking.status = "confirmed";
        existingBooking.bothPaid = true;
        if (assignedVenue) {
          existingBooking.venueName = assignedVenue.name;
          existingBooking.venueAddress = assignedVenue.address;
        } else {
          existingBooking.venueName = profile.city === "Abuja" ? "Maple Cafe, Wuse II" : "Cocoa Rooms, Lekki";
          existingBooking.venueAddress = profile.city === "Abuja" ? "Aminu Kano Crescent, Wuse II" : "Admiralty Way, Lekki";
        }
        existingBooking.startAt = existingBooking.startAt || "2026-03-24T19:00:00+01:00";
        existingBooking.updatedAt = new Date().toISOString();
        finalBooking = existingBooking;
        await this.saveBooking(userId, finalBooking, client);
      } else {
        // Create new booking directly with smart venue assignment
        const tempBooking: DateBooking = {
          id: `book-${state.nextBookingId++}`,
          matchId: matchId,
          status: "confirmed",
          venueName: "",
          city: profile.city,
          dateType: profile.preferredDateType,
          startAt: "2026-03-24T19:00:00+01:00",
          logisticsChatOpensBeforeHours: 2,
          checkInStatus: "Pending",
          tokenAmountNgn: 3500,
          bothPaid: true,
          counterpartName: profile.displayName,
          venueAddress: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const assignedVenue = await this.assignVenueForBooking(tempBooking, preferredAreas, client);
        if (assignedVenue) {
          tempBooking.venueName = assignedVenue.name;
          tempBooking.venueAddress = assignedVenue.address;
        } else {
          tempBooking.venueName = profile.city === "Abuja" ? "Maple Cafe, Wuse II" : "Cocoa Rooms, Lekki";
          tempBooking.venueAddress = profile.city === "Abuja" ? "Aminu Kano Crescent, Wuse II" : "Admiralty Way, Lekki";
        }

        await client.query(
          `INSERT INTO bookings (id, user_id, payload, created_at, updated_at)
           VALUES ($1, $2, $3, NOW(), NOW())`,
          [tempBooking.id, userId, tempBooking]
        );
        finalBooking = tempBooking;
      }
      
      await this.pushNotification(
        userId,
        state,
        `Date booked with ${profile.displayName}`,
        `Your date is scheduled at ${finalBooking.venueName}. Logistics chat opens ${finalBooking.logisticsChatOpensBeforeHours} hours before.`,
        "Booking",
        client
      );
      await this.saveState(userId, state, client);
      return finalBooking;
    });

    await this.analyticsService.trackEvent(userId, "booking_confirmed", { matchId, bookingId: booking.id });

    return {
      matchId,
      booking,
      bootstrap: await this.getBootstrap(userId)
    };
  }

  async confirmCheckIn(bookingId: string, rawUserId?: string) {
    const userId = this.resolveUserId(rawUserId);
    await this.ensureUser(userId);
    return this.database.withTransaction(async (client) => {
      const booking = await this.loadBookingById(userId, bookingId, client);
      if (!booking) {
        return null;
      }
      booking.checkInStatus = "Confirmed";
      await this.saveBooking(userId, booking, client);
      return booking;
    });
  }

  async createReport(
    report: Omit<SafetyReport, "id" | "severity" | "status" | "createdAt">,
    rawUserId?: string
  ) {
    const userId = this.resolveUserId(rawUserId);
    await this.ensureUser(userId);

    const created = await this.database.withTransaction(async (client) => {
      const state = await this.loadState(userId, client);
      const nextReport: SafetyReport = {
        id: `rep-${state.nextReportId++}`,
        ...report,
        severity: report.category === "UnsafeBehavior" ? "high" : "medium",
        status: "open",
        createdAt: new Date().toISOString()
      };
      await client.query(
        `
          INSERT INTO safety_reports (id, user_id, status, payload, created_at, updated_at)
          VALUES ($1, $2, $3, $4, NOW(), NOW())
        `,
        [nextReport.id, userId, nextReport.status, nextReport]
      );
      await this.pushNotification(
        userId,
        state,
        "Support report received",
        "Our ops team has your report and will review it within the active support window.",
        "Update",
        client
      );
      await this.saveState(userId, state, client);
      return nextReport;
    });

    return {
      queued: true,
      severity: created.severity
    };
  }

  async getLogisticsChat(bookingId: string, rawUserId?: string) {
    const booking = await this.loadBookingById(this.resolveUserId(rawUserId), bookingId);
    return {
      bookingId,
      channelType: "logistics_only",
      opensAt: booking ? booking.startAt : null,
      opensBeforeHours: booking?.logisticsChatOpensBeforeHours ?? null
    };
  }

  async updateEditableProfile(profile: EditableProfile, rawUserId?: string) {
    const userId = this.resolveUserId(rawUserId);
    await this.ensureUser(userId);

    await this.database.withTransaction(async (client) => {
      const state = await this.loadState(userId, client);
      state.editableProfile = {
        ...profile,
        mediaSlots: profile.mediaSlots.slice(0, 6)
      };
      this.refreshCompletion(state);
      await this.pushNotification(userId, state, "Profile updated", "Your profile changes are now live for new rounds.", "Update", client);
      await this.saveState(userId, state, client);
    });

    return this.getBootstrap(userId);
  }

  async updateDatingPreferences(preferences: DatingPreferences, rawUserId?: string) {
    const userId = this.resolveUserId(rawUserId);
    await this.ensureUser(userId);

    await this.database.withTransaction(async (client) => {
      const state = await this.loadState(userId, client);
      state.datingPreferences = preferences;
      await this.pushNotification(
        userId,
        state,
        "Dating preferences updated",
        "We will use your latest age, city, and date activity choices in future rounds.",
        "Update",
        client
      );
      await this.saveState(userId, state, client);
      await this.ensureActiveRound(userId, state, client, true);
    });

    return this.getBootstrap(userId);
  }

  async updateAccountSettings(settings: AccountSettings, rawUserId?: string) {
    const userId = this.resolveUserId(rawUserId);
    await this.ensureUser(userId);

    await this.database.withTransaction(async (client) => {
      const state = await this.loadState(userId, client);
      state.accountSettings = settings;
      state.userSummary.firstName = settings.name.split(" ")[0] || settings.name || state.userSummary.firstName;
      await this.pushNotification(userId, state, "Account settings updated", "Your account details have been saved.", "Update", client);
      await this.saveState(userId, state, client);
      await client.query("UPDATE users SET phone_number = $2, updated_at = NOW() WHERE id = $1", [userId, settings.phoneNumber ?? ""]);
    });

    return this.getBootstrap(userId);
  }

  async updateAppPreferences(preferences: AppPreferences, rawUserId?: string) {
    const userId = this.resolveUserId(rawUserId);
    await this.ensureUser(userId);

    await this.database.withTransaction(async (client) => {
      const state = await this.loadState(userId, client);
      state.appPreferences = preferences;
      await this.pushNotification(userId, state, "App settings updated", "Your app language and notification preferences were saved.", "Update", client);
      await this.saveState(userId, state, client);
    });

    return this.getBootstrap(userId);
  }

  async getOpsOverview(rawUserId?: string) {
    const dashboard = await this.getOpsDashboard(rawUserId);
    return dashboard.overview;
  }

  async getOpsDashboard(rawUserId?: string): Promise<OpsDashboard> {
    const opsUserId = rawUserId?.trim() || "ops-system";
    
    // Load ALL reports for ops dashboard (not filtered by user)
    const reportRows = await this.database.query<{ payload: SafetyReport }>(
      "SELECT payload FROM safety_reports ORDER BY created_at DESC LIMIT 100"
    );
    const reports = reportRows.rows.map((row: { payload: SafetyReport }) => row.payload);
    
    // Load global aggregate data for ops dashboard
    const [venues, supportQueue, deviceTokenCount, totalReactionsRows, allBookings] = await Promise.all([
      this.loadAllVenues(),
      this.getSupportQueue(),
      this.database.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM device_tokens"),
      this.database.query<{ reaction: string; count: string }>("SELECT reaction, COUNT(*)::text AS count FROM reactions GROUP BY reaction"),
      this.database.query<{ payload: any }>("SELECT payload FROM bookings ORDER BY created_at DESC LIMIT 100"),
    ]);

    // Fetch pending selfie submissions
    const selfieRows = await this.database.query<{
      id: string;
      user_id: string;
      image_url: string;
      review_status: "pending" | "approved" | "rejected";
      submitted_at: string;
      phone_number?: string;
      user_summary?: any;
    }>(
      `SELECT s.id, s.user_id, s.image_url, s.review_status, s.submitted_at,
              u.phone_number, us.user_summary
       FROM selfie_submissions s
       JOIN users u ON s.user_id = u.id
       LEFT JOIN user_states us ON s.user_id = us.user_id
       WHERE s.review_status = $1
       ORDER BY s.submitted_at ASC
       LIMIT 50`,
      ["pending"]
    );

    const selfieQueue = selfieRows.rows.map((row) => {
      const userSummary = row.user_summary as any;
      return {
        id: row.id,
        userId: row.user_id,
        imageUrl: row.image_url,
        reviewStatus: row.review_status,
        submittedAt: row.submitted_at,
        userName: userSummary?.firstName || "Unknown",
        userPhone: row.phone_number || ""
      };
    });

    // Fetch pending gov ID submissions
    const govIdRows = await this.database.query<{
      id: string;
      user_id: string;
      front_image_url: string;
      back_image_url?: string;
      id_type: string;
      review_status: "pending" | "approved" | "rejected";
      submitted_at: string;
      phone_number?: string;
      user_summary?: any;
    }>(
      `SELECT g.id, g.user_id, g.front_image_url, g.back_image_url, g.id_type, 
              g.review_status, g.submitted_at, u.phone_number, us.user_summary
       FROM gov_id_submissions g
       JOIN users u ON g.user_id = u.id
       LEFT JOIN user_states us ON g.user_id = us.user_id
       WHERE g.review_status = $1
       ORDER BY g.submitted_at ASC
       LIMIT 50`,
      ["pending"]
    );

    const govIdQueue = govIdRows.rows.map((row) => {
      const userSummary = row.user_summary as any;
      return {
        id: row.id,
        userId: row.user_id,
        frontImageUrl: row.front_image_url,
        backImageUrl: row.back_image_url,
        idType: row.id_type as "national_id" | "drivers_license" | "passport" | "voters_card",
        reviewStatus: row.review_status,
        submittedAt: row.submitted_at,
        userName: userSummary?.firstName || "Unknown",
        userPhone: row.phone_number || ""
      };
    });

    // Fetch feature toggles
    const toggleRows = await this.database.query<{
      name: string;
      enabled: boolean;
    }>("SELECT name, enabled FROM feature_toggles");
    
    const requireGovIdToggle = toggleRows.rows.find(r => r.name === "require_gov_id_for_booking");

    const reactionCounts: Record<string, number> = {};
    for (const row of totalReactionsRows.rows) {
      reactionCounts[row.reaction] = parseInt(row.count, 10);
    }
    const bookings = allBookings.rows.map((row: { payload: any }) => row.payload);

    return {
      overview: {
        pendingReports: reports.filter((item) => item.status === "open").length,
        activeVenueCount: venues.filter((item) => item.status === "active" || item.readiness === "ready").length,
        totalAcceptedThisRound: reactionCounts["Accepted"] || 0,
        totalDeclinedThisRound: reactionCounts["Declined"] || 0,
        onboardingCompleted: false,
        supportWindow: "16:00-23:00 WAT",
        pendingSelfieReviews: selfieQueue.length,
        pendingGovIdReviews: govIdQueue.length,
        activeFreezes: 0,
        pendingSupportRequests: supportQueue.length,
        totalDeviceTokens: parseInt(deviceTokenCount.rows[0]?.count || "0", 10)
      },
      featureToggles: {
        requireGovIdForBooking: requireGovIdToggle?.enabled || false
      },
      moderationQueue: reports.filter((item) => item.status === "open" || item.status === "investigating"),
      selfieQueue,
      govIdQueue,
      supportQueue,
      venueNetwork: venues,
      bookings,
      verification: { phoneVerified: false, selfieVerified: false, governmentIdVerified: false, idRequiredBeforeDate: true, govIdStatus: "not_submitted" },
      profile: { mediaSlots: [], interests: [], traits: [], bio: "", qas: [], religion: [], smoking: "", drinking: "", education: "", job: "", datingIntention: "", sexualOrientation: "", languages: [] },
      datingPreferences: { ageRange: "", genderIdentity: "", heightRange: "", dateCities: [], dateAreas: [], preferredDateActivities: [] },
      accountSettings: { name: "", gender: "", birthDate: "", height: "", residence: "", educationLevel: "", email: "", phoneNumber: "" },
      safety: { trustedContactName: "", trustedContactChannel: "WhatsApp", incidents: [], warnings: 0, tokenLossPenalties: 0 },
      notifications: [],
      reactions: []
    };
  }

  async resolveReport(reportId: string, rawUserId?: string, resolutionNotes?: string) {
    const opsUserId = rawUserId?.trim() || "ops-system";

    await this.database.withTransaction(async (client) => {
      const row = await client.query<{ payload: SafetyReport }>(
        "SELECT payload FROM safety_reports WHERE id = $1",
        [reportId]
      );
      
      if (row.rows.length > 0) {
        const report = row.rows[0].payload;
        report.status = "resolved";
        report.resolvedAt = new Date().toISOString();
        report.resolvedBy = opsUserId;
        report.resolutionNotes = resolutionNotes || "Resolved by ops";
        
        await client.query(
          "UPDATE safety_reports SET status = $1, payload = $2, updated_at = NOW() WHERE id = $3",
          ["resolved", report, reportId]
        );
      }
    });

    return this.getOpsDashboard(opsUserId);
  }

  async investigateReport(reportId: string, rawUserId?: string) {
    const opsUserId = rawUserId?.trim() || "ops-system";

    await this.database.withTransaction(async (client) => {
      const row = await client.query<{ payload: SafetyReport }>(
        "SELECT payload FROM safety_reports WHERE id = $1",
        [reportId]
      );
      
      if (row.rows.length > 0) {
        const report = row.rows[0].payload;
        report.status = "investigating";
        report.investigatedAt = new Date().toISOString();
        report.investigatedBy = opsUserId;
        
        await client.query(
          "UPDATE safety_reports SET status = $1, payload = $2, updated_at = NOW() WHERE id = $3",
          ["investigating", report, reportId]
        );
      }
    });

    return this.getOpsDashboard(opsUserId);
  }

  async escalateBooking(bookingId: string, rawUserId?: string) {
    const opsUserId = rawUserId?.trim() || "ops-system";

    await this.database.withTransaction(async (client) => {
      const result = await client.query<{ user_id: string; payload: any }>(
        "SELECT user_id, payload FROM bookings WHERE id = $1 LIMIT 1",
        [bookingId]
      );
      if (result.rows.length > 0) {
        const booking = result.rows[0].payload;
        const bookingUserId = result.rows[0].user_id;
        booking.checkInStatus = "SupportFlagged";
        await client.query("UPDATE bookings SET payload = $2, updated_at = NOW() WHERE id = $1 AND user_id = $3", [bookingId, booking, bookingUserId]);
      }
    });

    return this.getOpsDashboard(opsUserId);
  }

  async toggleVenue(venueId: string) {
    await this.database.withTransaction(async (client) => {
      const row = await client.query<{ status: string; payload: VenuePartner }>("SELECT status, payload FROM venues WHERE id = $1", [venueId]);
      const venue = row.rows[0]?.payload;
      const currentStatus = row.rows[0]?.status;
      if (!venue) {
        return;
      }
      const newStatus = currentStatus === "active" ? "inactive" : "active";
      const newReadiness = newStatus === "active" ? "ready" : "paused";
      venue.readiness = newReadiness;
      venue.status = newStatus as VenueStatus;
      await client.query(
        "UPDATE venues SET status = $2, readiness = $3, payload = $4, updated_at = NOW() WHERE id = $1",
        [venueId, newStatus, newReadiness, venue]
      );
    });

    return this.getOpsDashboard();
  }

  // ── Venue Management (P1-04) ──────────────────────────────────────────

  async createVenue(payload: CreateVenuePayload): Promise<VenuePartner> {
    const venueId = `venue-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const defaultHours: OperatingHours = payload.operatingHours || {
      monday: { open: "10:00", close: "22:00" },
      tuesday: { open: "10:00", close: "22:00" },
      wednesday: { open: "10:00", close: "22:00" },
      thursday: { open: "10:00", close: "22:00" },
      friday: { open: "10:00", close: "23:00" },
      saturday: { open: "10:00", close: "23:00" },
      sunday: { open: "12:00", close: "21:00" }
    };

    const venue: VenuePartner = {
      id: venueId,
      name: payload.name,
      city: payload.city,
      area: payload.area,
      address: payload.address,
      type: payload.type,
      status: "active",
      capacity: payload.capacity,
      contactPhone: payload.contactPhone || "",
      contactEmail: payload.contactEmail || "",
      operatingHours: defaultHours,
      blackoutDates: [],
      readiness: "ready"
    };

    await this.database.withTransaction(async (client) => {
      await client.query(
        `INSERT INTO venues (id, city, readiness, payload, name, address, area, venue_type, status, capacity, contact_phone, contact_email, operating_hours, blackout_dates, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())`,
        [
          venueId, payload.city, "ready", venue,
          payload.name, payload.address, payload.area, payload.type,
          "active", payload.capacity,
          payload.contactPhone || "", payload.contactEmail || "",
          defaultHours, JSON.stringify([])
        ]
      );
    });

    return venue;
  }

  async updateVenue(venueId: string, updates: UpdateVenuePayload): Promise<VenuePartner | null> {
    return this.database.withTransaction(async (client) => {
      const row = await client.query<{ payload: VenuePartner }>("SELECT payload FROM venues WHERE id = $1", [venueId]);
      if (row.rows.length === 0) return null;

      const venue = row.rows[0].payload;

      if (updates.name !== undefined) venue.name = updates.name;
      if (updates.address !== undefined) venue.address = updates.address;
      if (updates.area !== undefined) venue.area = updates.area;
      if (updates.type !== undefined) venue.type = updates.type;
      if (updates.capacity !== undefined) venue.capacity = updates.capacity;
      if (updates.contactPhone !== undefined) venue.contactPhone = updates.contactPhone;
      if (updates.contactEmail !== undefined) venue.contactEmail = updates.contactEmail;
      if (updates.operatingHours !== undefined) venue.operatingHours = updates.operatingHours;
      if (updates.blackoutDates !== undefined) venue.blackoutDates = updates.blackoutDates;
      if (updates.status !== undefined) {
        venue.status = updates.status;
        venue.readiness = updates.status === "active" ? "ready" : "paused";
      }

      await client.query(
        `UPDATE venues SET
           payload = $2, name = $3, address = $4, area = $5, venue_type = $6,
           status = $7, readiness = $8, capacity = $9, contact_phone = $10,
           contact_email = $11, operating_hours = $12, blackout_dates = $13,
           updated_at = NOW()
         WHERE id = $1`,
        [
          venueId, venue, venue.name, venue.address, venue.area, venue.type,
          venue.status, venue.readiness, venue.capacity, venue.contactPhone,
          venue.contactEmail, venue.operatingHours, JSON.stringify(venue.blackoutDates)
        ]
      );

      return venue;
    });
  }

  async getVenueDetail(venueId: string): Promise<VenueDetail | null> {
    const row = await this.database.query<{ payload: VenuePartner }>(
      "SELECT payload FROM venues WHERE id = $1",
      [venueId]
    );
    if (row.rows.length === 0) return null;

    const venue = row.rows[0].payload;

    // Load recent bookings at this venue
    const bookingRows = await this.database.query<{ payload: DateBooking }>(
      `SELECT b.payload FROM bookings b
       WHERE b.payload->>'venueName' ILIKE $1
       ORDER BY b.created_at DESC LIMIT 20`,
      [`%${venue.name}%`]
    );
    const recentBookings = bookingRows.rows.map(r => r.payload);

    // Load time slots
    const slotRows = await this.database.query<{
      id: string; venue_id: string; slot_date: string; start_time: string;
      end_time: string; max_capacity: number; booked_count: number;
    }>(
      `SELECT id, venue_id, slot_date, start_time, end_time, max_capacity, booked_count
       FROM venue_time_slots WHERE venue_id = $1 AND slot_date >= CURRENT_DATE
       ORDER BY slot_date, start_time LIMIT 50`,
      [venueId]
    );
    const timeSlots: VenueTimeSlot[] = slotRows.rows.map(r => ({
      id: r.id,
      venueId: r.venue_id,
      slotDate: r.slot_date,
      startTime: r.start_time,
      endTime: r.end_time,
      maxCapacity: r.max_capacity,
      bookedCount: r.booked_count
    }));

    return { ...venue, recentBookings, timeSlots };
  }

  async listVenues(filters: VenueListFilter = {}): Promise<VenuePartner[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (filters.status) {
      conditions.push(`status = $${paramIdx++}`);
      params.push(filters.status);
    }
    if (filters.area) {
      conditions.push(`area ILIKE $${paramIdx++}`);
      params.push(`%${filters.area}%`);
    }
    if (filters.type) {
      conditions.push(`venue_type = $${paramIdx++}`);
      params.push(filters.type);
    }
    if (filters.city) {
      conditions.push(`city = $${paramIdx++}`);
      params.push(filters.city);
    }
    if (filters.search) {
      conditions.push(`(name ILIKE $${paramIdx} OR address ILIKE $${paramIdx} OR area ILIKE $${paramIdx})`);
      params.push(`%${filters.search}%`);
      paramIdx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await this.database.query<{ payload: VenuePartner }>(
      `SELECT payload FROM venues ${whereClause} ORDER BY created_at ASC`,
      params
    );
    return result.rows.map(r => r.payload);
  }

  async setVenueStatus(venueId: string, status: VenueStatus): Promise<VenuePartner | null> {
    return this.updateVenue(venueId, { status });
  }

  async checkVenueAvailability(venueId: string, slotDate: string, startTime: string): Promise<{ available: boolean; remainingCapacity: number }> {
    const venueRow = await this.database.query<{ status: string; capacity: number }>(
      "SELECT status, capacity FROM venues WHERE id = $1",
      [venueId]
    );
    if (venueRow.rows.length === 0) return { available: false, remainingCapacity: 0 };
    const { status, capacity } = venueRow.rows[0];
    if (status !== "active") return { available: false, remainingCapacity: 0 };

    // Check blackout dates
    const blackoutRow = await this.database.query<{ blackout_dates: string[] }>(
      "SELECT blackout_dates FROM venues WHERE id = $1",
      [venueId]
    );
    const blackoutDates: string[] = blackoutRow.rows[0]?.blackout_dates || [];
    if (blackoutDates.includes(slotDate)) return { available: false, remainingCapacity: 0 };

    // Check time slot capacity
    const slotRow = await this.database.query<{ booked_count: number; max_capacity: number }>(
      `SELECT booked_count, max_capacity FROM venue_time_slots
       WHERE venue_id = $1 AND slot_date = $2 AND start_time = $3`,
      [venueId, slotDate, startTime]
    );

    if (slotRow.rows.length === 0) {
      // No slot exists yet — full capacity available
      return { available: true, remainingCapacity: capacity };
    }

    const remaining = slotRow.rows[0].max_capacity - slotRow.rows[0].booked_count;
    return { available: remaining > 0, remainingCapacity: Math.max(0, remaining) };
  }

  async reserveVenueSlot(
    venueId: string, slotDate: string, startTime: string, endTime: string,
    client: PoolClient
  ): Promise<boolean> {
    const venueRow = await client.query<{ capacity: number; status: string }>(
      "SELECT capacity, status FROM venues WHERE id = $1",
      [venueId]
    );
    if (venueRow.rows.length === 0 || venueRow.rows[0].status !== "active") return false;
    const maxCap = venueRow.rows[0].capacity;

    const slotId = `slot-${venueId}-${slotDate}-${startTime}`;

    // Check if slot exists
    const existing = await client.query<{ booked_count: number; max_capacity: number }>(
      "SELECT booked_count, max_capacity FROM venue_time_slots WHERE venue_id = $1 AND slot_date = $2 AND start_time = $3",
      [venueId, slotDate, startTime]
    );

    if (existing.rows.length === 0) {
      // Create new slot with first booking
      await client.query(
        `INSERT INTO venue_time_slots (id, venue_id, slot_date, start_time, end_time, max_capacity, booked_count)
         VALUES ($1, $2, $3, $4, $5, $6, 1)`,
        [slotId, venueId, slotDate, startTime, endTime, maxCap]
      );
      return true;
    }

    // Slot exists — check capacity before incrementing
    const { booked_count, max_capacity } = existing.rows[0];
    if (booked_count >= max_capacity) {
      return false;
    }

    await client.query(
      `UPDATE venue_time_slots SET booked_count = booked_count + 1, updated_at = NOW()
       WHERE venue_id = $1 AND slot_date = $2 AND start_time = $3`,
      [venueId, slotDate, startTime]
    );
    return true;
  }

  async assignVenueForBooking(
    booking: DateBooking,
    preferredAreas: string[],
    client: PoolClient
  ): Promise<VenuePartner | null> {
    // Find active venues matching city and date type, preferring user's preferred areas
    const venueRows = await client.query<{ payload: VenuePartner }>(
      `SELECT payload FROM venues
       WHERE city = $1 AND status = 'active'
       ORDER BY
         CASE WHEN area = ANY($2::text[]) THEN 0 ELSE 1 END,
         created_at ASC`,
      [booking.city, preferredAreas.length > 0 ? preferredAreas : [""]]
    );

    const slotDate = booking.startAt ? booking.startAt.substring(0, 10) : new Date().toISOString().substring(0, 10);
    const startTime = booking.startAt ? booking.startAt.substring(11, 16) : "19:00";
    const endTime = "21:00"; // Default 2-hour slot

    for (const row of venueRows.rows) {
      const venue = row.payload;
      // Skip venues on blackout
      if (venue.blackoutDates?.includes(slotDate)) continue;

      // Try to reserve a slot
      const reserved = await this.reserveVenueSlot(venue.id, slotDate, startTime, endTime, client);
      if (reserved) {
        return venue;
      }
    }

    return null;
  }

  async approveSelfie(submissionId: string, opsUserId?: string) {
    let targetUserId: string | undefined;
    await this.database.withTransaction(async (client) => {
      // Get submission
      const row = await client.query<{ user_id: string }>(
        "SELECT user_id FROM selfie_submissions WHERE id = $1 AND review_status = $2",
        [submissionId, "pending"]
      );

      if (row.rows.length === 0) {
        return { error: "Submission not found or already reviewed" };
      }

      const userId = row.rows[0].user_id;
      targetUserId = userId;

      // Update submission to approved
      await client.query(
        `UPDATE selfie_submissions 
         SET review_status = $1, reviewed_at = NOW(), reviewed_by = $2 
         WHERE id = $3`,
        ["approved", opsUserId || "ops-user", submissionId]
      );

      // Update user verification status
      const state = await this.loadState(userId, client);
      state.verification.selfieVerified = true;
      await this.pushNotification(
        userId,
        state,
        "Selfie verification approved",
        "Your selfie has been verified. You are one step closer to booking.",
        "Update",
        client
      );
      await this.saveState(userId, state, client);
    });

    if (targetUserId) {
      await this.analyticsService.trackEvent(targetUserId, "selfie_approved", {});
    }

    return this.getOpsDashboard(opsUserId);
  }

  async rejectSelfie(submissionId: string, opsUserId?: string) {
    let targetUserId: string | undefined;
    await this.database.withTransaction(async (client) => {
      // Get submission
      const row = await client.query<{ user_id: string }>(
        "SELECT user_id FROM selfie_submissions WHERE id = $1 AND review_status = $2",
        [submissionId, "pending"]
      );

      if (row.rows.length === 0) {
        return { error: "Submission not found or already reviewed" };
      }

      const userId = row.rows[0].user_id;
      targetUserId = userId;

      // Update submission to rejected
      await client.query(
        `UPDATE selfie_submissions 
         SET review_status = $1, reviewed_at = NOW(), reviewed_by = $2, rejection_reason = $3 
         WHERE id = $4`,
        ["rejected", opsUserId || "ops-user", "Photo quality or liveness check failed", submissionId]
      );

      // Notify user
      const state = await this.loadState(userId, client);
      await this.pushNotification(
        userId,
        state,
        "Selfie verification needs retry",
        "We couldn't verify your selfie. Please try again with better lighting and make sure your face is clearly visible.",
        "Update",
        client
      );
      await this.saveState(userId, state, client);
    });

    if (targetUserId) {
      await this.analyticsService.trackEvent(targetUserId, "selfie_rejected", {});
    }

    return this.getOpsDashboard(opsUserId);
  }

  async approveGovId(submissionId: string, opsUserId?: string) {
    let targetUserId: string | undefined;
    await this.database.withTransaction(async (client) => {
      // Get submission
      const row = await client.query<{ user_id: string }>(
        "SELECT user_id FROM gov_id_submissions WHERE id = $1 AND review_status = $2",
        [submissionId, "pending"]
      );

      if (row.rows.length === 0) {
        return { error: "Submission not found or already reviewed" };
      }

      const userId = row.rows[0].user_id;
      targetUserId = userId;

      // Update submission to approved
      await client.query(
        `UPDATE gov_id_submissions 
         SET review_status = $1, reviewed_at = NOW(), reviewed_by = $2 
         WHERE id = $3`,
        ["approved", opsUserId || "ops-user", submissionId]
      );

      // Update user verification status
      const state = await this.loadState(userId, client);
      state.verification.governmentIdVerified = true;
      state.verification.govIdStatus = "approved";
      await this.pushNotification(
        userId,
        state,
        "✓ Government ID verified",
        "Your ID has been verified. You can now book dates!",
        "Update",
        client
      );
      await this.saveState(userId, state, client);
    });

    if (targetUserId) {
      await this.analyticsService.trackEvent(targetUserId, "gov_id_approved", {});
    }

    return this.getOpsDashboard(opsUserId);
  }

  async rejectGovId(submissionId: string, reason?: string, opsUserId?: string) {
    let targetUserId: string | undefined;
    await this.database.withTransaction(async (client) => {
      // Get submission
      const row = await client.query<{ user_id: string }>(
        "SELECT user_id FROM gov_id_submissions WHERE id = $1 AND review_status = $2",
        [submissionId, "pending"]
      );

      if (row.rows.length === 0) {
        return { error: "Submission not found or already reviewed" };
      }

      const userId = row.rows[0].user_id;
      targetUserId = userId;
      const rejectionReason = reason || "ID image quality or document validity could not be verified";

      // Update submission to rejected
      await client.query(
        `UPDATE gov_id_submissions 
         SET review_status = $1, reviewed_at = NOW(), reviewed_by = $2, rejection_reason = $3 
         WHERE id = $4`,
        ["rejected", opsUserId || "ops-user", rejectionReason, submissionId]
      );

      // Update user verification status
      const state = await this.loadState(userId, client);
      state.verification.govIdStatus = "rejected";
      state.verification.govIdRejectionReason = rejectionReason;
      
      // Notify user
      await this.pushNotification(
        userId,
        state,
        "Government ID needs retry",
        `We couldn't verify your ID: ${rejectionReason}. Please submit a clear photo of a valid government-issued ID.`,
        "Update",
        client
      );
      await this.saveState(userId, state, client);
    });

    if (targetUserId) {
      await this.analyticsService.trackEvent(targetUserId, "gov_id_rejected", {});
    }

    return this.getOpsDashboard(opsUserId);
  }

  async setFeatureToggle(name: string, enabled: boolean, opsUserId?: string) {
    await this.database.withTransaction(async (client) => {
      await client.query(
        `INSERT INTO feature_toggles (name, enabled, updated_at, updated_by)
         VALUES ($1, $2, NOW(), $3)
         ON CONFLICT (name) DO UPDATE 
         SET enabled = $2, updated_at = NOW(), updated_by = $3`,
        [name, enabled, opsUserId || "ops-user"]
      );
    });

    return this.getOpsDashboard(opsUserId);
  }

  // ── Push Notifications & Inbox (P1-06) ───────────────────────────

  async registerDeviceToken(userId: string, platform: "android" | "ios", token: string) {
    // Upsert: if same token exists for this user, just update timestamp
    const existing = await this.database.query<{ id: string }>(
      "SELECT id FROM device_tokens WHERE user_id = $1 AND token = $2",
      [userId, token]
    );

    if (existing.rows.length > 0) {
      await this.database.query(
        "UPDATE device_tokens SET platform = $1, updated_at = NOW() WHERE id = $2",
        [platform, existing.rows[0].id]
      );
      return { id: existing.rows[0].id, registered: true };
    }

    const id = `dt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await this.database.query(
      "INSERT INTO device_tokens (id, user_id, platform, token, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())",
      [id, userId, platform, token]
    );

    return { id, registered: true };
  }

  async removeDeviceToken(userId: string, token: string) {
    await this.database.query(
      "DELETE FROM device_tokens WHERE user_id = $1 AND token = $2",
      [userId, token]
    );
    return { removed: true };
  }

  async getUserDeviceTokens(userId: string): Promise<DeviceToken[]> {
    const result = await this.database.query<{
      id: string; user_id: string; platform: string; token: string; created_at: string; updated_at: string;
    }>(
      "SELECT id, user_id, platform, token, created_at, updated_at FROM device_tokens WHERE user_id = $1 ORDER BY updated_at DESC",
      [userId]
    );
    return result.rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      platform: r.platform as "android" | "ios",
      token: r.token,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  }

  async getInbox(userId: string) {
    const result = await this.database.query<{
      id: string; payload: InboxNotification; read_at: string | null; deep_link_target: string | null; deep_link_id: string | null; notification_type: string | null; created_at: string;
    }>(
      "SELECT id, payload, read_at, deep_link_target, deep_link_id, notification_type, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100",
      [userId]
    );

    const notifications = result.rows.map(r => ({
      ...r.payload,
      readAt: r.read_at || undefined,
      deepLinkTarget: r.deep_link_target || r.payload.deepLinkTarget || undefined,
      deepLinkId: r.deep_link_id || r.payload.deepLinkId || undefined,
      notificationType: (r.notification_type || r.payload.notificationType || "general") as NotificationType
    }));

    const unreadCount = result.rows.filter(r => !r.read_at).length;

    return {
      notifications,
      unreadCount,
      total: result.rows.length
    };
  }

  async markNotificationRead(userId: string, notificationId: string) {
    await this.database.query(
      "UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_id = $2 AND read_at IS NULL",
      [notificationId, userId]
    );
    return { read: true };
  }

  async markAllNotificationsRead(userId: string) {
    const result = await this.database.query(
      "UPDATE notifications SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL",
      [userId]
    );
    return { read: true, count: result.rowCount || 0 };
  }

  async getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    const result = await this.database.query<{
      user_id: string; new_round: boolean; booking_update: boolean; payment_required: boolean;
      reminder: boolean; verification_update: boolean; safety_alert: boolean;
      push_enabled: boolean; inbox_enabled: boolean;
    }>(
      "SELECT * FROM notification_preferences WHERE user_id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      // Return defaults (all enabled)
      return {
        userId,
        newRound: true,
        bookingUpdate: true,
        paymentRequired: true,
        reminder: true,
        verificationUpdate: true,
        safetyAlert: true,
        pushEnabled: true,
        inboxEnabled: true
      };
    }

    const r = result.rows[0];
    return {
      userId: r.user_id,
      newRound: r.new_round,
      bookingUpdate: r.booking_update,
      paymentRequired: r.payment_required,
      reminder: r.reminder,
      verificationUpdate: r.verification_update,
      safetyAlert: r.safety_alert,
      pushEnabled: r.push_enabled,
      inboxEnabled: r.inbox_enabled
    };
  }

  async updateNotificationPreferences(userId: string, prefs: Partial<NotificationPreferences>) {
    const current = await this.getNotificationPreferences(userId);
    const merged = { ...current, ...prefs, userId };

    await this.database.query(
      `INSERT INTO notification_preferences (user_id, new_round, booking_update, payment_required, reminder, verification_update, safety_alert, push_enabled, inbox_enabled, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         new_round = $2, booking_update = $3, payment_required = $4, reminder = $5,
         verification_update = $6, safety_alert = $7, push_enabled = $8, inbox_enabled = $9, updated_at = NOW()`,
      [userId, merged.newRound, merged.bookingUpdate, merged.paymentRequired, merged.reminder,
       merged.verificationUpdate, merged.safetyAlert, merged.pushEnabled, merged.inboxEnabled]
    );

    return merged;
  }

  async dispatchNotification(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    category: NotificationCategory,
    deepLinkTarget?: string,
    deepLinkId?: string
  ) {
    // Check user preferences
    const prefs = await this.getNotificationPreferences(userId);
    const typeEnabled = this.isNotificationTypeEnabled(prefs, type);

    // Always write to inbox (unless inbox disabled)
    if (prefs.inboxEnabled && typeEnabled) {
      const state = await this.loadState(userId);
      const notification: InboxNotification = {
        id: `note-${state.nextNotificationId++}`,
        title,
        body,
        timestampLabel: "Just now",
        category,
        notificationType: type,
        deepLinkTarget,
        deepLinkId
      };
      await this.database.query(
        "INSERT INTO notifications (id, user_id, payload, deep_link_target, deep_link_id, notification_type, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())",
        [notification.id, userId, notification, deepLinkTarget || null, deepLinkId || null, type]
      );
      await this.saveState(userId, state);
    }

    // Send push if enabled
    if (prefs.pushEnabled && typeEnabled) {
      const data: Record<string, string> = {};
      if (deepLinkTarget) data.screen = deepLinkTarget;
      if (deepLinkId) data.id = deepLinkId;
      data.type = type;

      await this.pushService.sendToUser(userId, { title, body, data });
    }

    return { dispatched: true, type };
  }

  private isNotificationTypeEnabled(prefs: NotificationPreferences, type: NotificationType): boolean {
    switch (type) {
      case "new_round": return prefs.newRound;
      case "booking_update": return prefs.bookingUpdate;
      case "payment_required": return prefs.paymentRequired;
      case "reminder": return prefs.reminder;
      case "verification_update": return prefs.verificationUpdate;
      case "safety_alert": return prefs.safetyAlert;
      case "general": return true;
      default: return true;
    }
  }

  async opsSendNotification(targetUserId: string, title: string, body: string, type: NotificationType = "general", deepLinkTarget?: string, deepLinkId?: string) {
    await this.ensureUser(targetUserId);
    return this.dispatchNotification(targetUserId, type, title, body, "Update", deepLinkTarget, deepLinkId);
  }

  async getUnreadBadgeCount(userId: string): Promise<number> {
    const result = await this.database.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM notifications WHERE user_id = $1 AND read_at IS NULL",
      [userId]
    );
    return parseInt(result.rows[0]?.count || "0", 10);
  }

  // ── Booking Support Workflows (P1-05) ────────────────────────────

  private async appendAuditLog(
    bookingId: string,
    actorId: string,
    actorType: "user" | "ops" | "system",
    action: string,
    details?: Record<string, unknown>,
    queryable: Queryable = this.database as Queryable
  ) {
    const id = `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const entry: BookingAuditEntry = {
      id,
      bookingId,
      actorId,
      actorType,
      action,
      details,
      createdAt: new Date().toISOString()
    };
    await queryable.query(
      "INSERT INTO booking_audit_log (id, booking_id, actor_id, actor_type, action, details, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())",
      [entry.id, entry.bookingId, entry.actorId, entry.actorType, entry.action, entry.details ? JSON.stringify(entry.details) : null]
    );
    return entry;
  }

  private isCancellationFree(booking: DateBooking): boolean {
    // Free cancellation if 24+ hours before startAt
    const startTime = new Date(booking.startAt).getTime();
    const now = Date.now();
    const hoursUntilDate = (startTime - now) / (1000 * 60 * 60);
    return hoursUntilDate >= 24;
  }

  async requestCancellation(bookingId: string, reason: string, rawUserId?: string) {
    const userId = this.resolveUserId(rawUserId);
    await this.ensureUser(userId);

    return this.database.withTransaction(async (client) => {
      const booking = await this.loadBookingById(userId, bookingId, client);
      if (!booking) {
        throw new Error("Booking not found");
      }

      if (booking.status === "cancelled" || booking.status === "completed") {
        throw new Error(`Cannot cancel a booking that is ${booking.status}`);
      }

      const isFree = this.isCancellationFree(booking);
      const refundStatus = isFree ? "eligible" : "ineligible";

      const requestId = `sr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const request: BookingSupportRequest = {
        id: requestId,
        bookingId,
        userId,
        type: "cancellation",
        reason,
        status: isFree ? "approved" : "requested",
        refundStatus,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await client.query(
        `INSERT INTO booking_support_requests (id, booking_id, user_id, type, reason, status, refund_status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
        [request.id, request.bookingId, request.userId, request.type, request.reason, request.status, request.refundStatus]
      );

      await this.appendAuditLog(bookingId, userId, "user", "cancellation_requested", { reason, isFree, refundStatus }, client);

      if (isFree) {
        // Auto-approve free cancellation
        booking.status = "cancelled";
        booking.cancellationReason = reason;
        booking.cancelledAt = new Date().toISOString();
        booking.updatedAt = new Date().toISOString();
        await this.saveBooking(userId, booking, client);

        await this.appendAuditLog(bookingId, "system", "system", "cancellation_auto_approved", { refundStatus: "eligible" }, client);

        // Process refund if payment was completed
        const paymentResult = await client.query<{ payload: PaymentRecord }>(
          "SELECT payload FROM payments WHERE user_id = $1 AND payload->>'bookingId' = $2 AND status = 'completed' LIMIT 1",
          [userId, bookingId]
        );
        if (paymentResult.rows.length > 0) {
          const payment = paymentResult.rows[0].payload;
          if (payment.paystackReference) {
            await this.paystackService.refundTransaction(payment.paystackReference);
            payment.status = "refunded";
            payment.updatedAt = new Date().toISOString();
            await client.query(
              "UPDATE payments SET status = $1, payload = $2, updated_at = NOW() WHERE id = $3",
              [payment.status, payment, payment.id]
            );
            request.refundStatus = "processed";
            await client.query(
              "UPDATE booking_support_requests SET refund_status = $1, updated_at = NOW() WHERE id = $2",
              ["processed", request.id]
            );
          }
        }

        const state = await this.loadState(userId, client);
        await this.pushNotification(userId, state, "Booking cancelled", "Your booking has been cancelled and a refund is being processed.", "Cancellation", client);
        await this.saveState(userId, state, client);

        // Send WhatsApp/SMS cancellation notice
        try {
          const phoneNumber = state.accountSettings?.phoneNumber || "";
          if (phoneNumber) {
            await this.reminderService.sendCancellationNotice(userId, booking, phoneNumber);
          }
        } catch (reminderErr) {
          console.error("⚠️  Failed to send cancellation reminder:", reminderErr);
        }
      } else {
        // Late cancellation — needs ops review
        const state = await this.loadState(userId, client);
        await this.pushNotification(userId, state, "Cancellation submitted", "Your cancellation request is under review. Late cancellations may forfeit the date token.", "Cancellation", client);
        await this.saveState(userId, state, client);
      }

      return request;
    });
  }

  async requestReschedule(bookingId: string, newAvailability: string[], rawUserId?: string) {
    const userId = this.resolveUserId(rawUserId);
    await this.ensureUser(userId);

    return this.database.withTransaction(async (client) => {
      const booking = await this.loadBookingById(userId, bookingId, client);
      if (!booking) {
        throw new Error("Booking not found");
      }

      if (booking.status === "cancelled" || booking.status === "completed") {
        throw new Error(`Cannot reschedule a booking that is ${booking.status}`);
      }

      const requestId = `sr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const request: BookingSupportRequest = {
        id: requestId,
        bookingId,
        userId,
        type: "reschedule",
        status: "requested",
        newAvailability,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await client.query(
        `INSERT INTO booking_support_requests (id, booking_id, user_id, type, status, new_availability, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [request.id, request.bookingId, request.userId, request.type, request.status, JSON.stringify(newAvailability)]
      );

      await this.appendAuditLog(bookingId, userId, "user", "reschedule_requested", { newAvailability }, client);

      const state = await this.loadState(userId, client);
      await this.pushNotification(userId, state, "Reschedule submitted", "Your reschedule request is under review.", "Update", client);
      await this.saveState(userId, state, client);

      return request;
    });
  }

  async getSupportQueue(opsUserId?: string) {
    const rows = await this.database.query<{
      id: string;
      booking_id: string;
      user_id: string;
      type: string;
      reason: string;
      status: string;
      refund_status: string;
      new_availability: string[] | null;
      resolution_notes: string;
      resolved_by: string;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT id, booking_id, user_id, type, reason, status, refund_status, new_availability, resolution_notes, resolved_by, created_at, updated_at
       FROM booking_support_requests
       WHERE status IN ('requested', 'under_review')
       ORDER BY created_at ASC
       LIMIT 100`
    );

    return rows.rows.map((r) => ({
      id: r.id,
      bookingId: r.booking_id,
      userId: r.user_id,
      type: r.type as "cancellation" | "reschedule",
      reason: r.reason,
      status: r.status as SupportRequestStatus,
      refundStatus: r.refund_status,
      newAvailability: r.new_availability,
      resolutionNotes: r.resolution_notes,
      resolvedBy: r.resolved_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    } as BookingSupportRequest));
  }

  async approveSupportRequest(requestId: string, notes?: string, opsUserId?: string) {
    const opsId = opsUserId || "ops-user";

    return this.database.withTransaction(async (client) => {
      const result = await client.query<{
        id: string;
        booking_id: string;
        user_id: string;
        type: string;
        status: string;
        refund_status: string;
      }>(
        "SELECT id, booking_id, user_id, type, status, refund_status FROM booking_support_requests WHERE id = $1",
        [requestId]
      );

      if (result.rows.length === 0) {
        throw new Error("Support request not found");
      }

      const row = result.rows[0];
      if (row.status === "approved" || row.status === "denied") {
        throw new Error(`Support request already ${row.status}`);
      }

      await client.query(
        "UPDATE booking_support_requests SET status = $1, resolution_notes = $2, resolved_by = $3, updated_at = NOW() WHERE id = $4",
        ["approved", notes || "Approved by ops", opsId, requestId]
      );

      if (row.type === "cancellation") {
        // Cancel the booking
        const bookingResult = await client.query<{ payload: DateBooking; user_id: string }>(
          "SELECT payload, user_id FROM bookings WHERE id = $1",
          [row.booking_id]
        );
        if (bookingResult.rows.length > 0) {
          const booking = bookingResult.rows[0].payload;
          const bookingUserId = bookingResult.rows[0].user_id;
          booking.status = "cancelled";
          booking.cancellationReason = "Approved by ops";
          booking.cancelledAt = new Date().toISOString();
          booking.updatedAt = new Date().toISOString();
          await client.query(
            "UPDATE bookings SET payload = $1, updated_at = NOW() WHERE id = $2",
            [booking, booking.id]
          );

          // Process refund
          const paymentResult = await client.query<{ payload: PaymentRecord }>(
            "SELECT payload FROM payments WHERE user_id = $1 AND payload->>'bookingId' = $2 AND status = 'completed' LIMIT 1",
            [bookingUserId, row.booking_id]
          );
          if (paymentResult.rows.length > 0) {
            const payment = paymentResult.rows[0].payload;
            if (payment.paystackReference) {
              await this.paystackService.refundTransaction(payment.paystackReference);
              payment.status = "refunded";
              payment.updatedAt = new Date().toISOString();
              await client.query(
                "UPDATE payments SET status = $1, payload = $2, updated_at = NOW() WHERE id = $3",
                [payment.status, payment, payment.id]
              );
              await client.query(
                "UPDATE booking_support_requests SET refund_status = 'processed', updated_at = NOW() WHERE id = $1",
                [requestId]
              );
            }
          }

          // Record late cancellation incident
          await this.appendAuditLog(row.booking_id, opsId, "ops", "cancellation_approved", { notes, refundProcessed: true }, client);

          // Notify user
          const state = await this.loadState(bookingUserId, client);
          await this.pushNotification(bookingUserId, state, "Cancellation approved", "Your cancellation request has been approved. A refund is being processed.", "Cancellation", client);
          await this.saveState(bookingUserId, state, client);
        }
      } else if (row.type === "reschedule") {
        await this.appendAuditLog(row.booking_id, opsId, "ops", "reschedule_approved", { notes }, client);
        
        const state = await this.loadState(row.user_id, client);
        await this.pushNotification(row.user_id, state, "Reschedule approved", "Your reschedule request has been approved. New dates will be assigned shortly.", "Update", client);
        await this.saveState(row.user_id, state, client);
      }
    });
  }

  async denySupportRequest(requestId: string, notes?: string, opsUserId?: string) {
    const opsId = opsUserId || "ops-user";

    return this.database.withTransaction(async (client) => {
      const result = await client.query<{
        id: string;
        booking_id: string;
        user_id: string;
        type: string;
        status: string;
      }>(
        "SELECT id, booking_id, user_id, type, status FROM booking_support_requests WHERE id = $1",
        [requestId]
      );

      if (result.rows.length === 0) {
        throw new Error("Support request not found");
      }

      const row = result.rows[0];
      if (row.status === "approved" || row.status === "denied") {
        throw new Error(`Support request already ${row.status}`);
      }

      await client.query(
        "UPDATE booking_support_requests SET status = $1, resolution_notes = $2, resolved_by = $3, updated_at = NOW() WHERE id = $4",
        ["denied", notes || "Denied by ops", opsId, requestId]
      );

      await this.appendAuditLog(row.booking_id, opsId, "ops", `${row.type}_denied`, { notes }, client);

      const state = await this.loadState(row.user_id, client);
      await this.pushNotification(
        row.user_id,
        state,
        `${row.type === "cancellation" ? "Cancellation" : "Reschedule"} denied`,
        notes || "Your request has been reviewed and denied. Please contact support for details.",
        "Update",
        client
      );
      await this.saveState(row.user_id, state, client);
    });
  }

  async forceCancel(bookingId: string, reason?: string, opsUserId?: string) {
    const opsId = opsUserId || "ops-user";

    return this.database.withTransaction(async (client) => {
      const bookingResult = await client.query<{ payload: DateBooking; user_id: string }>(
        "SELECT payload, user_id FROM bookings WHERE id = $1",
        [bookingId]
      );
      if (bookingResult.rows.length === 0) {
        throw new Error("Booking not found");
      }

      const booking = bookingResult.rows[0].payload;
      const bookingUserId = bookingResult.rows[0].user_id;

      if (booking.status === "cancelled") {
        throw new Error("Booking is already cancelled");
      }

      booking.status = "cancelled";
      booking.cancellationReason = reason || "Force-cancelled by ops";
      booking.cancelledAt = new Date().toISOString();
      booking.updatedAt = new Date().toISOString();
      await client.query(
        "UPDATE bookings SET payload = $1, updated_at = NOW() WHERE id = $2",
        [booking, bookingId]
      );

      await this.appendAuditLog(bookingId, opsId, "ops", "force_cancelled", { reason }, client);

      const state = await this.loadState(bookingUserId, client);
      await this.pushNotification(bookingUserId, state, "Booking cancelled", reason || "Your booking has been cancelled by support.", "Cancellation", client);
      await this.saveState(bookingUserId, state, client);

      // Send WhatsApp/SMS cancellation notice
      try {
        const phoneNumber = state.accountSettings?.phoneNumber || "";
        if (phoneNumber) {
          await this.reminderService.sendCancellationNotice(bookingUserId, booking, phoneNumber);
        }
      } catch (reminderErr) {
        console.error("⚠️  Failed to send cancellation reminder:", reminderErr);
      }

      return { cancelled: true, bookingId };
    });
  }

  async getBookingAuditLog(bookingId: string) {
    const result = await this.database.query<{
      id: string;
      booking_id: string;
      actor_id: string;
      actor_type: string;
      action: string;
      details: Record<string, unknown> | null;
      created_at: string;
    }>(
      "SELECT id, booking_id, actor_id, actor_type, action, details, created_at FROM booking_audit_log WHERE booking_id = $1 ORDER BY created_at ASC",
      [bookingId]
    );

    return result.rows.map((r) => ({
      id: r.id,
      bookingId: r.booking_id,
      actorId: r.actor_id,
      actorType: r.actor_type as "user" | "ops" | "system",
      action: r.action,
      details: r.details,
      createdAt: r.created_at
    } as BookingAuditEntry));
  }

  // Freeze Policy Engine

  async recordIncident(
    bookingId: string,
    incidentType: "NoShow" | "LateCancellation",
    rawUserId?: string,
    reportId?: string
  ) {
    const userId = this.resolveUserId(rawUserId);
    await this.ensureUser(userId);

    await this.database.withTransaction(async (client) => {
      const state = await this.loadState(userId, client);
      
      // Create incident record
      const incident: SafetyIncident = {
        id: `inc-${state.nextIncidentId || state.safety.incidents.length + 1}`,
        type: incidentType,
        bookingId,
        occurredAt: new Date().toISOString(),
        reportId
      };

      state.safety.incidents.push(incident);
      state.nextIncidentId = (state.nextIncidentId || state.safety.incidents.length) + 1;
      
      // Evaluate freeze policy
      await this.evaluateFreezePolicy(userId, state, client);
      
      await this.saveState(userId, state, client);
    });

    return { recorded: true };
  }

  private async evaluateFreezePolicy(userId: string, state: UserStateRecord, client: PoolClient) {
    // Get incidents from last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const recentIncidents = state.safety.incidents.filter(
      (inc) => new Date(inc.occurredAt) >= ninetyDaysAgo
    );

    const incidentCount = recentIncidents.length;

    // Progressive penalty system:
    // 1st incident: Warning
    // 2nd incident: Token loss (₦3,500)
    // 3rd+ incident: 30-day freeze

    if (incidentCount === 1) {
      state.safety.warnings += 1;
      await this.pushNotification(
        userId,
        state,
        "⚠️ First incident warning",
        "We've recorded a booking issue. Future incidents may result in token loss or account freeze.",
        "Update",
        client
      );
    } else if (incidentCount === 2) {
      state.safety.tokenLossPenalties += 1;
      await this.pushNotification(
        userId,
        state,
        "Token penalty applied",
        "Due to repeated incidents, you've lost your ₦3,500 booking token. Please maintain good booking practices.",
        "Update",
        client
      );
    } else if (incidentCount >= 3 && !state.safety.activeFreeze) {
      // Apply 30-day freeze
      const freezeStart = new Date();
      const freezeEnd = new Date();
      freezeEnd.setDate(freezeEnd.getDate() + 30);

      state.safety.activeFreeze = {
        id: `freeze-${Date.now()}`,
        reason: `${incidentCount} incidents in 90 days (no-shows or late cancellations)`,
        incidentCount,
        frozenAt: freezeStart.toISOString(),
        frozenUntil: freezeEnd.toISOString(),
        canAppeal: true
      };

      await this.pushNotification(
        userId,
        state,
        "🔒 Account temporarily frozen",
        `Your account is frozen until ${freezeEnd.toLocaleDateString()} due to ${incidentCount} booking incidents. Contact support to appeal.`,
        "Cancellation",
        client
      );
    }
  }

  async liftFreeze(rawUserId?: string, reason?: string) {
    const userId = this.resolveUserId(rawUserId);
    await this.ensureUser(userId);

    await this.database.withTransaction(async (client) => {
      const state = await this.loadState(userId, client);
      
      if (state.safety.activeFreeze) {
        const freezeId = state.safety.activeFreeze.id;
        state.safety.activeFreeze = undefined;
        
        await this.pushNotification(
          userId,
          state,
          "Account freeze lifted",
          reason || "Your account freeze has been removed by support.",
          "Update",
          client
        );

        await this.saveState(userId, state, client);
      }
    });

    return { lifted: true };
  }

  private isFrozen(state: UserStateRecord): boolean {
    if (!state.safety.activeFreeze) {
      return false;
    }

    const freezeEnd = new Date(state.safety.activeFreeze.frozenUntil);
    const now = new Date();

    // Auto-expire freeze if time has passed
    if (now >= freezeEnd) {
      state.safety.activeFreeze = undefined;
      return false;
    }

    return true;
  }

  // ── P1-11: Account Deletion & Privacy ─────────────────────────────

  private readonly DELETION_GRACE_PERIOD_DAYS = 30;

  /**
   * Request account deletion — soft-deletes the account with a 30-day grace period.
   * Revokes all sessions immediately.
   */
  async requestAccountDeletion(rawUserId?: string): Promise<AccountDeletionRequest> {
    const userId = this.resolveUserId(rawUserId);
    await this.ensureUser(userId);

    return this.database.withTransaction(async (client) => {
      // Check if already pending
      const existing = await client.query<{ deletion_status: string }>(
        "SELECT deletion_status FROM users WHERE id = $1",
        [userId]
      );
      if (existing.rows[0]?.deletion_status === "pending") {
        throw new Error("Account deletion already requested");
      }

      const now = new Date();
      const scheduledAt = new Date(now.getTime() + this.DELETION_GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

      await client.query(
        `UPDATE users 
         SET deletion_requested_at = $2, deletion_scheduled_at = $3, deletion_status = 'pending', updated_at = NOW()
         WHERE id = $1`,
        [userId, now, scheduledAt]
      );

      // Cancel active bookings
      const activeBookings = await client.query<{ id: string; payload: DateBooking }>(
        "SELECT id, payload FROM bookings WHERE user_id = $1",
        [userId]
      );
      for (const row of activeBookings.rows) {
        const booking = row.payload;
        if (booking.status !== "cancelled" && booking.status !== "completed") {
          booking.status = "cancelled";
          booking.cancellationReason = "Account deletion requested";
          booking.cancelledAt = now.toISOString();
          booking.updatedAt = now.toISOString();
          await client.query(
            "UPDATE bookings SET payload = $2, updated_at = NOW() WHERE id = $1",
            [row.id, booking]
          );
        }
      }

      // Revoke all sessions
      await this.authService.invalidateAllUserSessions(userId);

      // Notify user
      const state = await this.loadState(userId, client);
      await this.pushNotification(
        userId,
        state,
        "Account deletion requested",
        `Your account will be permanently deleted on ${scheduledAt.toLocaleDateString("en-NG")}. You can cancel this from Settings within ${this.DELETION_GRACE_PERIOD_DAYS} days.`,
        "Update",
        client
      );
      await this.saveState(userId, state, client);

      return {
        deletionRequestedAt: now.toISOString(),
        deletionScheduledAt: scheduledAt.toISOString(),
        status: "pending" as const,
        gracePeriodDays: this.DELETION_GRACE_PERIOD_DAYS
      };
    });
  }

  /**
   * Cancel a pending account deletion within the grace period.
   */
  async cancelAccountDeletion(rawUserId?: string): Promise<{ cancelled: boolean }> {
    const userId = this.resolveUserId(rawUserId);

    return this.database.withTransaction(async (client) => {
      const result = await client.query<{ deletion_status: string; deletion_scheduled_at: string }>(
        "SELECT deletion_status, deletion_scheduled_at FROM users WHERE id = $1",
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error("User not found");
      }

      if (result.rows[0].deletion_status !== "pending") {
        throw new Error("No pending deletion to cancel");
      }

      await client.query(
        `UPDATE users 
         SET deletion_requested_at = NULL, deletion_scheduled_at = NULL, deletion_status = 'cancelled', updated_at = NOW()
         WHERE id = $1`,
        [userId]
      );

      const state = await this.loadState(userId, client);
      await this.pushNotification(
        userId,
        state,
        "Account deletion cancelled",
        "Your account deletion has been cancelled. Your account is fully restored.",
        "Update",
        client
      );
      await this.saveState(userId, state, client);

      return { cancelled: true };
    });
  }

  /**
   * Get account deletion status for the current user.
   */
  async getAccountDeletionStatus(rawUserId?: string): Promise<{ status: string | null; scheduledAt: string | null }> {
    const userId = this.resolveUserId(rawUserId);

    const result = await this.database.query<{ deletion_status: string | null; deletion_scheduled_at: string | null }>(
      "SELECT deletion_status, deletion_scheduled_at FROM users WHERE id = $1",
      [userId]
    );

    if (result.rows.length === 0) {
      return { status: null, scheduledAt: null };
    }

    return {
      status: result.rows[0].deletion_status,
      scheduledAt: result.rows[0].deletion_scheduled_at
    };
  }

  /**
   * Hard-delete: permanently removes/anonymizes user data.
   * Called by a scheduled job for accounts past their grace period.
   */
  async processScheduledDeletions(): Promise<{ processed: number }> {
    const now = new Date();
    const pendingResult = await this.database.query<{ id: string }>(
      "SELECT id FROM users WHERE deletion_status = 'pending' AND deletion_scheduled_at <= $1",
      [now]
    );

    let processed = 0;
    for (const row of pendingResult.rows) {
      await this.hardDeleteUser(row.id);
      processed++;
    }

    return { processed };
  }

  /**
   * Hard-delete a single user: anonymize financial records, remove personal data and media.
   */
  async hardDeleteUser(userId: string): Promise<void> {
    await this.database.withTransaction(async (client) => {
      const anonymizedId = `deleted-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      // Anonymize bookings (keep for financial audit trail)
      const bookingRows = await client.query<{ id: string; payload: DateBooking }>(
        "SELECT id, payload FROM bookings WHERE user_id = $1",
        [userId]
      );
      for (const row of bookingRows.rows) {
        const booking = row.payload;
        booking.counterpartName = "[deleted]";
        booking.matchId = anonymizedId;
        await client.query(
          "UPDATE bookings SET payload = $2, updated_at = NOW() WHERE id = $1",
          [row.id, booking]
        );
      }

      // Anonymize payments (keep for financial audit trail — keep user_id FK intact)
      // Payments already don't contain personal data in their payload

      // Delete personal data tables
      await client.query("DELETE FROM user_states WHERE user_id = $1", [userId]);
      await client.query("DELETE FROM sessions WHERE user_id = $1", [userId]);
      await client.query("DELETE FROM notifications WHERE user_id = $1", [userId]);
      await client.query("DELETE FROM reactions WHERE user_id = $1", [userId]);
      await client.query("DELETE FROM rounds WHERE user_id = $1", [userId]);
      await client.query("DELETE FROM safety_reports WHERE user_id = $1", [userId]);
      await client.query("DELETE FROM selfie_submissions WHERE user_id = $1", [userId]);
      await client.query("DELETE FROM gov_id_submissions WHERE user_id = $1", [userId]);
      await client.query("DELETE FROM terms_acceptances WHERE user_id = $1", [userId]);
      await client.query("DELETE FROM booking_support_requests WHERE user_id = $1", [userId]);
      await client.query("DELETE FROM device_tokens WHERE user_id = $1", [userId]);
      await client.query("DELETE FROM data_export_requests WHERE user_id = $1", [userId]);

      // Delete media files from storage
      try {
        const mediaResult = await client.query<{ storage_url: string }>(
          "SELECT storage_url FROM profile_media WHERE user_id = $1",
          [userId]
        );
        const fs = await import("fs/promises");
        const path = await import("path");
        for (const media of mediaResult.rows) {
          try {
            const filepath = path.join(process.cwd(), media.storage_url);
            await fs.unlink(filepath);
          } catch {
            // File may already be gone
          }
        }
      } catch {
        // Media deletion is best-effort
      }

      await client.query("DELETE FROM profile_media WHERE user_id = $1", [userId]);

      // Remove the user record (or anonymize it)
      await client.query(
        `UPDATE users 
         SET phone_number = $2, deletion_status = 'completed', updated_at = NOW()
         WHERE id = $1`,
        [userId, `deleted-${anonymizedId}`]
      );
    });
  }

  /**
   * Request a data export — rate-limited to 1 per 24 hours.
   */
  async requestDataExport(rawUserId?: string): Promise<DataExportPayload> {
    const userId = this.resolveUserId(rawUserId);
    await this.ensureUser(userId);

    return this.database.withTransaction(async (client) => {
      // Rate limit check: 1 per 24 hours
      const recentExport = await client.query<{ id: string }>(
        "SELECT id FROM data_export_requests WHERE user_id = $1 AND created_at > NOW() - INTERVAL '24 hours' LIMIT 1",
        [userId]
      );
      if (recentExport.rows.length > 0) {
        throw new Error("Data export already requested in the last 24 hours. Please try again later.");
      }

      const exportId = this.generateId();
      const state = await this.loadState(userId, client);

      // Collect all user data
      const bookings = await this.loadBookings(userId, client);
      const notifications = await this.loadNotifications(userId, client);
      const termsResult = await client.query<{ terms_version: string; privacy_version: string; accepted_at: string }>(
        "SELECT terms_version, privacy_version, accepted_at FROM terms_acceptances WHERE user_id = $1 ORDER BY accepted_at DESC",
        [userId]
      );

      const exportData: DataExportPayload = {
        exportedAt: new Date().toISOString(),
        profile: state.editableProfile,
        accountSettings: state.accountSettings,
        datingPreferences: state.datingPreferences,
        verification: {
          phoneVerified: state.verification.phoneVerified,
          selfieVerified: state.verification.selfieVerified,
          governmentIdVerified: state.verification.governmentIdVerified
        },
        bookingHistory: bookings.map(b => ({
          id: b.id,
          status: b.status,
          venueName: b.venueName,
          city: b.city,
          startAt: b.startAt,
          createdAt: b.createdAt
        })),
        notificationHistory: notifications.map(n => ({
          title: n.title,
          body: n.body,
          category: n.category
        })),
        termsAcceptances: termsResult.rows.map(r => ({
          termsVersion: r.terms_version,
          privacyVersion: r.privacy_version,
          acceptedAt: r.accepted_at
        }))
      };

      // Store export record
      await client.query(
        "INSERT INTO data_export_requests (id, user_id, status, export_data, created_at, completed_at) VALUES ($1, $2, 'completed', $3, NOW(), NOW())",
        [exportId, userId, exportData]
      );

      return exportData;
    });
  }

  /**
   * Update privacy/terms consent with version tracking.
   */
  async acceptPrivacyConsent(termsVersion: string, privacyVersion: string, rawUserId?: string): Promise<{ accepted: boolean }> {
    const userId = this.resolveUserId(rawUserId);
    await this.ensureUser(userId);

    await this.database.withTransaction(async (client) => {
      await client.query(
        `INSERT INTO terms_acceptances (id, user_id, accepted_at, terms_version, privacy_version, consent_type)
         VALUES ($1, $2, NOW(), $3, $4, 'policy_update')`,
        [this.generateId(), userId, termsVersion, privacyVersion]
      );
    });

    return { accepted: true };
  }

  /**
   * Get the latest consent version for a user.
   */
  async getConsentStatus(rawUserId?: string): Promise<{ latestTermsVersion: string | null; latestPrivacyVersion: string | null; acceptedAt: string | null }> {
    const userId = this.resolveUserId(rawUserId);

    const result = await this.database.query<{ terms_version: string; privacy_version: string; accepted_at: string }>(
      "SELECT terms_version, privacy_version, accepted_at FROM terms_acceptances WHERE user_id = $1 ORDER BY accepted_at DESC LIMIT 1",
      [userId]
    );

    if (result.rows.length === 0) {
      return { latestTermsVersion: null, latestPrivacyVersion: null, acceptedAt: null };
    }

    return {
      latestTermsVersion: result.rows[0].terms_version,
      latestPrivacyVersion: result.rows[0].privacy_version,
      acceptedAt: result.rows[0].accepted_at
    };
  }

  private resolveUserId(rawUserId?: string) {
    const uid = rawUserId?.trim();
    if (!uid) throw new Error("User ID is required");
    return uid;
  }

  private async seedCatalogData() {
    const existingSuggestions = await this.database.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM suggestion_profiles");
    if (existingSuggestions.rows[0]?.count === "0") {
      await this.database.withTransaction(async (client) => {
        for (const suggestion of suggestionFixtures) {
          await client.query("INSERT INTO suggestion_profiles (id, city, payload) VALUES ($1, $2, $3)", [suggestion.id, suggestion.city, suggestion]);
        }
      });
    }

    const existingVenues = await this.database.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM venues");
    if (existingVenues.rows[0]?.count === "0") {
      await this.database.withTransaction(async (client) => {
        for (const venue of venueFixtures) {
          await client.query(
            `INSERT INTO venues (id, city, readiness, payload, name, address, area, venue_type, status, capacity, contact_phone, contact_email, operating_hours, blackout_dates)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [
              venue.id, venue.city, venue.readiness, venue,
              venue.name, venue.address || "", venue.area, venue.type,
              venue.status || "active", venue.capacity || 20,
              venue.contactPhone || "", venue.contactEmail || "",
              venue.operatingHours || {}, JSON.stringify(venue.blackoutDates || [])
            ]
          );
        }
      });
    }
  }

  private async ensureUser(userId: string) {
    await this.seedCatalogData();

    await this.database.withTransaction(async (client) => {
      const existingUser = await client.query<{ id: string }>("SELECT id FROM users WHERE id = $1", [userId]);
      if (existingUser.rowCount) {
        const state = await this.loadState(userId, client);
        await this.ensureActiveRound(userId, state, client);
        return;
      }

      const state = createInitialUserState(false);
      await client.query("INSERT INTO users (id, phone_number) VALUES ($1, $2)", [userId, state.accountSettings.phoneNumber]);
      await this.insertState(userId, state, client);

      await this.ensureActiveRound(userId, state, client);
    });
  }

  private async loadAggregate(userId: string, client?: PoolClient): Promise<Aggregate> {
    if (!client) {
      await this.ensureUser(userId);
    }
    const queryable: Queryable = (client ?? this.database) as Queryable;
    const state = await this.loadState(userId, client);
    await this.ensureActiveRound(userId, state, client);

    const [suggestions, bookings, notifications, reports, reactions, venues, media] = await Promise.all([
      this.loadRoundSuggestions(userId, queryable),
      this.loadBookings(userId, queryable),
      this.loadNotifications(userId, queryable),
      this.loadReports(userId, queryable),
      this.loadReactions(userId, queryable),
      this.loadVenues(queryable),
      this.mediaService.getUserMedia(userId, client)
    ]);

    // Populate mediaSlots with actual media URLs
    state.editableProfile.mediaSlots = media.map(m => m.storageUrl);

    return {
      state,
      suggestions,
      bookings,
      notifications,
      reports,
      reactions,
      venues,
      media
    };
  }

  private buildBootstrap(aggregate: Aggregate): BootstrapPayload {
    const remainingProfiles = aggregate.suggestions.filter((profile) => !aggregate.reactions[profile.id]).length;
    return {
      onboarding: aggregate.state.onboarding,
      verification: aggregate.state.verification,
      suggestions: aggregate.suggestions,
      bookings: aggregate.bookings,
      safety: aggregate.state.safety,
      matchround: {
        ...aggregate.state.matchround,
        usersLeftToday: remainingProfiles
      },
      userSummary: aggregate.state.userSummary,
      notifications: aggregate.notifications,
      editableProfile: aggregate.state.editableProfile,
      datingPreferences: aggregate.state.datingPreferences,
      accountSettings: aggregate.state.accountSettings,
      appPreferences: aggregate.state.appPreferences,
      reactions: aggregate.reactions,
      media: aggregate.media
    };
  }

  private async loadState(userId: string, queryable: Queryable = this.database as Queryable): Promise<UserStateRecord> {
    const result = await queryable.query<UserStateRow>(
      `
        SELECT onboarding,
               verification,
               safety,
               matchround,
               user_summary,
               editable_profile,
               dating_preferences,
               account_settings,
               app_preferences,
               pending_phone_number,
               next_notification_id,
               next_booking_id,
               next_report_id,
               next_payment_id,
               next_incident_id
        FROM user_states
        WHERE user_id = $1
      `,
      [userId]
    );
    const row = result.rows[0];

    return {
      onboarding: row.onboarding,
      verification: row.verification,
      safety: row.safety,
      matchround: row.matchround,
      userSummary: row.user_summary,
      editableProfile: row.editable_profile,
      datingPreferences: row.dating_preferences,
      accountSettings: row.account_settings,
      appPreferences: row.app_preferences,
      pendingPhoneNumber: row.pending_phone_number,
      nextNotificationId: row.next_notification_id,
      nextBookingId: row.next_booking_id,
      nextReportId: row.next_report_id,
      nextPaymentId: row.next_payment_id,
      nextIncidentId: row.next_incident_id || 1
    };
  }

  private async insertState(userId: string, state: UserStateRecord, queryable: Queryable) {
    await queryable.query(
      `
        INSERT INTO user_states (
          user_id,
          onboarding,
          verification,
          safety,
          matchround,
          user_summary,
          editable_profile,
          dating_preferences,
          account_settings,
          app_preferences,
          pending_phone_number,
          next_notification_id,
          next_booking_id,
          next_report_id,
          next_payment_id,
          next_incident_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      `,
      [
        userId,
        state.onboarding,
        state.verification,
        state.safety,
        state.matchround,
        state.userSummary,
        state.editableProfile,
        state.datingPreferences,
        state.accountSettings,
        state.appPreferences,
        state.pendingPhoneNumber,
        state.nextNotificationId,
        state.nextBookingId,
        state.nextReportId,
        state.nextPaymentId,
        state.nextIncidentId || 1
      ]
    );
  }

  private async saveState(userId: string, state: UserStateRecord, queryable: Queryable = this.database as Queryable) {
    await queryable.query(
      `
        UPDATE user_states
        SET onboarding = $2,
            verification = $3,
            safety = $4,
            matchround = $5,
            user_summary = $6,
            editable_profile = $7,
            dating_preferences = $8,
            account_settings = $9,
            app_preferences = $10,
            pending_phone_number = $11,
            next_notification_id = $12,
            next_booking_id = $13,
            next_report_id = $14,
            next_payment_id = $15,
            next_incident_id = $16,
            updated_at = NOW()
        WHERE user_id = $1
      `,
      [
        userId,
        state.onboarding,
        state.verification,
        state.safety,
        state.matchround,
        state.userSummary,
        state.editableProfile,
        state.datingPreferences,
        state.accountSettings,
        state.appPreferences,
        state.pendingPhoneNumber,
        state.nextNotificationId,
        state.nextBookingId,
        state.nextReportId,
        state.nextPaymentId,
        state.nextIncidentId || 1
      ]
    );
  }

  private async ensureActiveRound(userId: string, state: UserStateRecord, queryable: Queryable = this.database as Queryable, reset = false) {
    const existing = await queryable.query<RoundRow>(
      "SELECT id, payload FROM rounds WHERE user_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1",
      [userId]
    );

    if (existing.rowCount && !reset) {
      return existing.rows[0];
    }

    if (existing.rowCount && reset) {
      await queryable.query("DELETE FROM rounds WHERE id = $1", [existing.rows[0].id]);
    }

    // Get profiles the user has already reacted to
    const reactedProfiles = await queryable.query<{ profile_id: string }>(
      "SELECT profile_id FROM reactions WHERE user_id = $1",
      [userId]
    );
    const reactedProfileIds = reactedProfiles.rows.map(r => r.profile_id);

    const preferredCities = state.datingPreferences.dateCities.length > 0 ? state.datingPreferences.dateCities : ["Lagos", "Abuja"];
    
    // Query candidates excluding already-reacted profiles
    const result = await queryable.query<{ id: string; payload: SuggestionProfile }>(
      `
        SELECT id, payload
        FROM suggestion_profiles
        WHERE city = ANY($1::text[])
        ${reactedProfileIds.length > 0 ? 'AND id NOT IN (' + reactedProfileIds.map((_, i) => `$${i + 2}`).join(', ') + ')' : ''}
        ORDER BY created_at ASC
      `,
      [preferredCities, ...reactedProfileIds]
    );

    let candidates = result.rows;
    const filtered = this.filterByPreferences(candidates.map((r) => r.payload), state.datingPreferences);
    candidates = candidates.filter((r) => filtered.some((f) => f.id === r.payload.id));

    // Fallback 1: Try all cities if preferred cities yield no candidates
    if (candidates.length === 0) {
      const allResult = await queryable.query<{ id: string; payload: SuggestionProfile }>(
        `
        SELECT id, payload 
        FROM suggestion_profiles
        ${reactedProfileIds.length > 0 ? 'WHERE id NOT IN (' + reactedProfileIds.map((_, i) => `$${i + 1}`).join(', ') + ')' : ''}
        ORDER BY created_at ASC
        `,
        reactedProfileIds
      );
      const allFiltered = this.filterByPreferences(allResult.rows.map((r) => r.payload), state.datingPreferences);
      candidates = allResult.rows.filter((r) => allFiltered.some((f) => f.id === r.payload.id));
    }

    // Fallback 2: If still no candidates after preference filtering, use any unreacted profiles
    if (candidates.length === 0) {
      const fallbackResult = await queryable.query<{ id: string; payload: SuggestionProfile }>(
        `
          SELECT id, payload
          FROM suggestion_profiles
          WHERE city = ANY($1::text[])
          ${reactedProfileIds.length > 0 ? 'AND id NOT IN (' + reactedProfileIds.map((_, i) => `$${i + 2}`).join(', ') + ')' : ''}
          ORDER BY created_at ASC
          LIMIT 5
        `,
        [preferredCities, ...reactedProfileIds]
      );
      candidates = fallbackResult.rowCount
        ? fallbackResult.rows
        : (await queryable.query<{ id: string; payload: SuggestionProfile }>(
          `SELECT id, payload FROM suggestion_profiles 
          ${reactedProfileIds.length > 0 ? 'WHERE id NOT IN (' + reactedProfileIds.map((_, i) => `$${i + 1}`).join(', ') + ')' : ''}
          ORDER BY created_at ASC LIMIT 5`,
          reactedProfileIds
        )).rows;
    }

    candidates = candidates.slice(0, 5);

    const roundId = `round-${userId}-${Date.now()}`;
    await queryable.query(
      `
        INSERT INTO rounds (id, user_id, city, status, scheduled_for, payload, created_at, updated_at)
        VALUES ($1, $2, $3, 'active', NOW(), $4, NOW(), NOW())
      `,
      [roundId, userId, preferredCities[0] ?? "Lagos", state.matchround]
    );

    for (const [index, profile] of candidates.entries()) {
      await queryable.query("INSERT INTO round_profiles (round_id, profile_id, position) VALUES ($1, $2, $3)", [roundId, profile.id, index]);
    }

    return {
      id: roundId,
      payload: state.matchround
    };
  }

  private filterByPreferences(profiles: SuggestionProfile[], preferences: DatingPreferences): SuggestionProfile[] {
    return profiles.filter((profile) => {
      if (!this.matchesAgeRange(profile.age, preferences.ageRange)) return false;
      if (!this.matchesGender(profile.gender, preferences.genderIdentity)) return false;
      if (!this.matchesHeightRange(profile.heightCm, preferences.heightRange)) return false;
      if (!this.matchesAreas(profile.neighborhood, preferences.dateAreas)) return false;
      if (!this.matchesActivities(profile.preferredDateType, preferences.preferredDateActivities)) return false;
      return true;
    });
  }

  private matchesAgeRange(age: number, ageRange: string): boolean {
    if (!ageRange) return true;
    const match = ageRange.match(/^(\d+)\s*-\s*(\d+)$/);
    if (!match) return true;
    const min = parseInt(match[1], 10);
    const max = parseInt(match[2], 10);
    return age >= min && age <= max;
  }

  private matchesGender(profileGender: string | undefined, preferredGender: string): boolean {
    if (!preferredGender || !profileGender) return true;
    const normalized = preferredGender.toLowerCase();
    const profileNormalized = profileGender.toLowerCase();
    if (normalized === "men" && profileNormalized === "man") return true;
    if (normalized === "women" && profileNormalized === "woman") return true;
    if (normalized === "everyone") return true;
    return normalized === profileNormalized;
  }

  private matchesHeightRange(heightCm: number | undefined, heightRange: string): boolean {
    if (!heightRange || heightCm == null) return true;
    const match = heightRange.match(/^(\d+)\s*-\s*(\d+)/);
    if (!match) return true;
    const min = parseInt(match[1], 10);
    const max = parseInt(match[2], 10);
    return heightCm >= min && heightCm <= max;
  }

  private matchesAreas(neighborhood: string, dateAreas: string[]): boolean {
    if (!dateAreas || dateAreas.length === 0) return true;
    if (!neighborhood) return true;
    const normalizedNeighborhood = neighborhood.toLowerCase();
    return dateAreas.some((area) => {
      const normalizedArea = area.toLowerCase();
      return normalizedNeighborhood.includes(normalizedArea) || normalizedArea.includes(normalizedNeighborhood);
    });
  }

  private matchesActivities(preferredDateType: string, activities: string[]): boolean {
    if (!activities || activities.length === 0) return true;
    if (!preferredDateType) return true;
    const activityMap: Record<string, string[]> = {
      Cafe: ["coffee", "cafe"],
      Lounge: ["drinks", "lounge"],
      DessertSpot: ["dessert"],
      Brunch: ["brunch"],
      CasualRestaurant: ["casual dinner", "casual restaurant", "dinner"],
      HotelLobby: ["drinks", "hotel lobby"]
    };
    const mapped = activityMap[preferredDateType] ?? [preferredDateType.toLowerCase()];
    return activities.some((activity) => mapped.includes(activity.toLowerCase()));
  }

  private async loadRoundSuggestions(userId: string, queryable: Queryable = this.database as Queryable) {
    const result = await queryable.query<{ payload: SuggestionProfile }>(
      `
        SELECT suggestion_profiles.payload
        FROM rounds
        JOIN round_profiles ON round_profiles.round_id = rounds.id
        JOIN suggestion_profiles ON suggestion_profiles.id = round_profiles.profile_id
        WHERE rounds.user_id = $1 AND rounds.status = 'active'
        ORDER BY round_profiles.position ASC
      `,
      [userId]
    );

    return result.rows.map((row: { payload: SuggestionProfile }) => row.payload);
  }

  private async loadBookings(userId: string, queryable: Queryable = this.database as Queryable) {
    const result = await queryable.query<{ payload: DateBooking }>(
      "SELECT payload FROM bookings WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    return result.rows.map((row: { payload: DateBooking }) => row.payload);
  }

  private async loadBookingById(userId: string, bookingId: string, queryable: Queryable = this.database as Queryable) {
    const result = await queryable.query<{ payload: DateBooking }>(
      "SELECT payload FROM bookings WHERE id = $1 AND user_id = $2 LIMIT 1",
      [bookingId, userId]
    );
    return result.rows[0]?.payload ?? null;
  }

  private async saveBooking(userId: string, booking: DateBooking, queryable: Queryable = this.database as Queryable) {
    await queryable.query("UPDATE bookings SET payload = $3, updated_at = NOW() WHERE id = $1 AND user_id = $2", [booking.id, userId, booking]);
  }

  private async loadNotifications(userId: string, queryable: Queryable = this.database as Queryable) {
    const result = await queryable.query<{ payload: InboxNotification }>(
      "SELECT payload FROM notifications WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    return result.rows.map((row: { payload: InboxNotification }) => row.payload);
  }

  private async loadReports(userId: string, queryable: Queryable = this.database as Queryable) {
    const result = await queryable.query<{ payload: SafetyReport }>(
      "SELECT payload FROM safety_reports WHERE user_id = $1 ORDER BY created_at DESC",
      [userId]
    );
    return result.rows.map((row: { payload: SafetyReport }) => row.payload);
  }

  private async loadReactions(userId: string, queryable: Queryable = this.database as Queryable) {
    const result = await queryable.query<{ profile_id: string; reaction: RoundReaction }>(
      "SELECT profile_id, reaction FROM reactions WHERE user_id = $1",
      [userId]
    );
    return Object.fromEntries(
      result.rows.map((row: { profile_id: string; reaction: RoundReaction }) => [row.profile_id, row.reaction])
    ) as Record<string, RoundReaction>;
  }

  private async loadVenues(queryable: Queryable = this.database as Queryable) {
    const result = await queryable.query<{ payload: VenuePartner }>("SELECT payload FROM venues WHERE status = 'active' OR status IS NULL ORDER BY created_at ASC");
    return result.rows.map((row: { payload: VenuePartner }) => row.payload);
  }

  private async loadAllVenues(queryable: Queryable = this.database as Queryable) {
    const result = await queryable.query<{ payload: VenuePartner }>("SELECT payload FROM venues ORDER BY created_at ASC");
    return result.rows.map((row: { payload: VenuePartner }) => row.payload);
  }

  private async pushNotification(
    userId: string,
    state: UserStateRecord,
    title: string,
    body: string,
    category: NotificationCategory,
    queryable: Queryable = this.database as Queryable
  ) {
    const notification: InboxNotification = {
      id: `note-${state.nextNotificationId++}`,
      title,
      body,
      timestampLabel: "Just now",
      category
    };
    await queryable.query("INSERT INTO notifications (id, user_id, payload, created_at) VALUES ($1, $2, $3, NOW())", [
      notification.id,
      userId,
      notification
    ]);
  }

  private refreshCompletion(state: UserStateRecord) {
    const filledFields = [
      state.editableProfile.mediaSlots.filter((item) => item.trim().length > 0).length > 0,
      state.editableProfile.interests.length >= 3,
      state.editableProfile.traits.length >= 3,
      state.editableProfile.bio.length >= 40,
      state.editableProfile.qas.length >= 2,
      state.editableProfile.languages.length >= 1,
      state.editableProfile.job.trim().length > 0,
      state.editableProfile.education.trim().length > 0
    ];
    const score = Math.round((filledFields.filter(Boolean).length / filledFields.length) * 100);
    state.userSummary.completionScore = score;
    state.userSummary.completionLabel =
      score >= 90 ? "Intentional profile" : score >= 70 ? "Solid profile" : "Needs more detail";
  }
}
