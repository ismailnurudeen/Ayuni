import { newDb } from "pg-mem";
import { Pool } from "pg";
import { DatabaseService } from "../database/database.service";
import { AuthService } from "./auth.service";
import { OtpService } from "./otp.service";
import { TwilioSmsService } from "./sms.service";
import { MediaService } from "./media.service";
import { AppService } from "./app.service";

describe("AppService", () => {
  let pool: Pool;
  let databaseService: DatabaseService;
  let authService: AuthService;
  let otpService: OtpService;
  let smsService: TwilioSmsService;
  let mediaService: MediaService;
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
    service = new AppService(databaseService, authService, otpService, smsService, mediaService);
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
    const restartedService = new AppService(restartedDatabaseService, restartedAuthService, restartedOtpService, restartedSmsService, restartedMediaService);
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
});
