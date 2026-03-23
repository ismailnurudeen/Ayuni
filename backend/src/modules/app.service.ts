import { Injectable, OnModuleInit } from "@nestjs/common";
import { PoolClient } from "pg";
import { QueryResult, QueryResultRow } from "pg";
import { DatabaseService } from "../database/database.service";
import { AuthService } from "./auth.service";
import { OtpService } from "./otp.service";
import { TwilioSmsService } from "./sms.service";
import { MediaService } from "./media.service";
import {
  AccountSettings,
  AppPreferences,
  BasicOnboardingPayload,
  BootstrapPayload,
  City,
  DateBooking,
  DatingPreferences,
  EditableProfile,
  InboxNotification,
  MatchroundState,
  NotificationCategory,
  OpsDashboard,
  PaymentMethod,
  PaymentRecord,
  ProfileMedia,
  RoundReaction,
  SafetyReport,
  SuggestionProfile,
  UserStateRecord,
  VenuePartner,
  VerificationStatus
} from "./app.types";
import { createInitialUserState, demoBookings, demoNotifications, demoReports, suggestionFixtures, venueFixtures } from "./demo-data";

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
    private readonly mediaService: MediaService
  ) {}

  async onModuleInit() {
    await this.seedCatalogData();
    if (this.shouldSeedDemoFixtures()) {
      await this.ensureUser("demo-user", true);
    }
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
    const userId = this.resolveUserId();
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
    const userId = this.resolveUserId();
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

  async verifySelfie(rawUserId?: string) {
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

    return {
      ...result,
      bootstrap: await this.getBootstrap(userId)
    };
  }

  async submitAvailability(matchId: string, availability: string[], rawUserId?: string) {
    await this.ensureUser(this.resolveUserId(rawUserId));
    return {
      matchId,
      availability,
      paymentRequired: true
    };
  }

  async initiateDateToken(paymentMethod: PaymentMethod, rawUserId?: string) {
    const userId = this.resolveUserId(rawUserId);
    await this.ensureUser(userId);

    const payment = await this.database.withTransaction(async (client) => {
      const state = await this.loadState(userId, client);
      const record: PaymentRecord = {
        id: `pay-${state.nextPaymentId++}`,
        paymentMethod,
        amountNgn: 3500,
        expiresInMinutes: paymentMethod === "ussd" ? 360 : 30,
        status: "initiated",
        createdAt: new Date().toISOString()
      };
      await client.query(
        `
          INSERT INTO payments (id, user_id, status, payment_method, payload, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        `,
        [record.id, userId, record.status, paymentMethod, record]
      );
      await this.saveState(userId, state, client);
      return record;
    });

    return payment;
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
      const nextBooking: DateBooking = {
        id: `book-${state.nextBookingId++}`,
        venueName: profile.city === "Abuja" ? "Maple Cafe, Wuse II" : "Cocoa Rooms, Lekki",
        city: profile.city,
        dateType: profile.preferredDateType,
        startAt: "2026-03-24T19:00:00+01:00",
        logisticsChatOpensBeforeHours: 2,
        checkInStatus: "Pending",
        tokenAmountNgn: 3500,
        bothPaid: true,
        counterpartName: profile.displayName,
        venueAddress: profile.city === "Abuja" ? "Aminu Kano Crescent, Wuse II" : "Admiralty Way, Lekki"
      };

      await client.query(
        `
          INSERT INTO bookings (id, user_id, payload, created_at, updated_at)
          VALUES ($1, $2, $3, NOW(), NOW())
        `,
        [nextBooking.id, userId, nextBooking]
      );
      await this.pushNotification(
        userId,
        state,
        `Date booked with ${profile.displayName}`,
        `Your date is scheduled at ${nextBooking.venueName}. Logistics chat opens ${nextBooking.logisticsChatOpensBeforeHours} hours before.`,
        "Booking",
        client
      );
      await this.saveState(userId, state, client);
      return nextBooking;
    });

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
    const aggregate = await this.loadAggregate(this.resolveUserId(rawUserId));
    const { state, reports, venues, bookings, suggestions, reactions } = aggregate;

    return {
      overview: {
        pendingReports: reports.filter((item) => item.status === "open").length,
        activeVenueCount: venues.filter((item) => item.readiness === "ready").length,
        totalAcceptedThisRound: Object.values(reactions).filter((item) => item === "Accepted").length,
        totalDeclinedThisRound: Object.values(reactions).filter((item) => item === "Declined").length,
        onboardingCompleted: state.onboarding.completed,
        supportWindow: "16:00-23:00 WAT"
      },
      moderationQueue: reports.filter((item) => item.status === "open"),
      venueNetwork: venues,
      bookings,
      verification: state.verification,
      profile: state.editableProfile,
      datingPreferences: state.datingPreferences,
      accountSettings: state.accountSettings,
      notifications: aggregate.notifications.slice(0, 8),
      reactions: Object.entries(reactions).map(([profileId, reaction]) => {
        const profile = suggestions.find((item) => item.id === profileId);
        return {
          profileId,
          displayName: profile?.displayName ?? "Unknown",
          city: profile?.city ?? "Lagos",
          reaction
        };
      })
    };
  }

  async resolveReport(reportId: string, rawUserId?: string) {
    const userId = this.resolveUserId(rawUserId);
    await this.ensureUser(userId);

    await this.database.query(
      `
        UPDATE safety_reports
        SET status = 'resolved',
            payload = jsonb_set(payload, '{status}', to_jsonb('resolved'::text), false),
            updated_at = NOW()
        WHERE id = $1 AND user_id = $2
      `,
      [reportId, userId]
    );

    return this.getOpsDashboard(userId);
  }

  async escalateBooking(bookingId: string, rawUserId?: string) {
    const userId = this.resolveUserId(rawUserId);
    await this.ensureUser(userId);

    await this.database.withTransaction(async (client) => {
      const booking = await this.loadBookingById(userId, bookingId, client);
      if (!booking) {
        return;
      }
      booking.checkInStatus = "SupportFlagged";
      await this.saveBooking(userId, booking, client);
    });

    return this.getOpsDashboard(userId);
  }

  async toggleVenue(venueId: string) {
    await this.database.withTransaction(async (client) => {
      const row = await client.query<{ payload: VenuePartner }>("SELECT payload FROM venues WHERE id = $1", [venueId]);
      const venue = row.rows[0]?.payload;
      if (!venue) {
        return;
      }
      venue.readiness = venue.readiness === "ready" ? "paused" : "ready";
      await client.query("UPDATE venues SET readiness = $2, payload = $3 WHERE id = $1", [venueId, venue.readiness, venue]);
    });

    return this.getOpsDashboard();
  }

  private resolveUserId(rawUserId?: string) {
    return rawUserId?.trim() || "demo-user";
  }

  private shouldSeedDemoFixtures() {
    return process.env.AYUNI_ENABLE_DEMO_FIXTURES === "true" || process.env.NODE_ENV !== "production";
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
          await client.query("INSERT INTO venues (id, city, readiness, payload) VALUES ($1, $2, $3, $4)", [
            venue.id,
            venue.city,
            venue.readiness,
            venue
          ]);
        }
      });
    }
  }

  private async ensureUser(userId: string, useDemoFixtures = false) {
    await this.seedCatalogData();
    const resolvedUseDemoFixtures = useDemoFixtures || (userId === "demo-user" && this.shouldSeedDemoFixtures());

    await this.database.withTransaction(async (client) => {
      const existingUser = await client.query<{ id: string }>("SELECT id FROM users WHERE id = $1", [userId]);
      if (existingUser.rowCount) {
        const state = await this.loadState(userId, client);
        await this.ensureActiveRound(userId, state, client);
        return;
      }

      const state = createInitialUserState(resolvedUseDemoFixtures);
      await client.query("INSERT INTO users (id, phone_number) VALUES ($1, $2)", [userId, state.accountSettings.phoneNumber]);
      await this.insertState(userId, state, client);

      if (resolvedUseDemoFixtures) {
        for (const booking of demoBookings) {
          await client.query("INSERT INTO bookings (id, user_id, payload, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())", [
            booking.id,
            userId,
            booking
          ]);
        }
        for (const notification of demoNotifications) {
          await client.query("INSERT INTO notifications (id, user_id, payload, created_at) VALUES ($1, $2, $3, NOW())", [
            notification.id,
            userId,
            notification
          ]);
        }
        for (const report of demoReports) {
          await client.query(
            "INSERT INTO safety_reports (id, user_id, status, payload, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW())",
            [report.id, userId, report.status, report]
          );
        }
      }

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
               next_payment_id
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
      nextPaymentId: row.next_payment_id
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
          next_payment_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
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
        state.nextPaymentId
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
        state.nextPaymentId
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

    const preferredCities = state.datingPreferences.dateCities.length > 0 ? state.datingPreferences.dateCities : ["Lagos", "Abuja"];
    const result = await queryable.query<{ id: string; payload: SuggestionProfile }>(
      `
        SELECT id, payload
        FROM suggestion_profiles
        WHERE city = ANY($1::text[])
        ORDER BY created_at ASC
      `,
      [preferredCities]
    );

    let candidates = result.rows;
    const filtered = this.filterByPreferences(candidates.map((r) => r.payload), state.datingPreferences);
    candidates = candidates.filter((r) => filtered.some((f) => f.id === r.payload.id));

    if (candidates.length === 0) {
      const allResult = await queryable.query<{ id: string; payload: SuggestionProfile }>(
        "SELECT id, payload FROM suggestion_profiles ORDER BY created_at ASC"
      );
      const allFiltered = this.filterByPreferences(allResult.rows.map((r) => r.payload), state.datingPreferences);
      candidates = allResult.rows.filter((r) => allFiltered.some((f) => f.id === r.payload.id));
    }

    if (candidates.length === 0) {
      const fallbackResult = await queryable.query<{ id: string; payload: SuggestionProfile }>(
        `
          SELECT id, payload
          FROM suggestion_profiles
          WHERE city = ANY($1::text[])
          ORDER BY created_at ASC
          LIMIT 5
        `,
        [preferredCities]
      );
      candidates = fallbackResult.rowCount
        ? fallbackResult.rows
        : (await queryable.query<{ id: string; payload: SuggestionProfile }>("SELECT id, payload FROM suggestion_profiles ORDER BY created_at ASC LIMIT 5")).rows;
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
