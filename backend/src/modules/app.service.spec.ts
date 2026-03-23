import { newDb } from "pg-mem";
import { Pool } from "pg";
import { DatabaseService } from "../database/database.service";
import { AppService } from "./app.service";

describe("AppService", () => {
  let pool: Pool;
  let databaseService: DatabaseService;
  let service: AppService;

  beforeEach(async () => {
    const db = newDb({
      autoCreateForeignKeyIndices: true
    });
    const adapter = db.adapters.createPg();
    pool = new adapter.Pool();
    databaseService = new DatabaseService({ pool });
    await databaseService.onModuleInit();
    service = new AppService(databaseService);
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
    await service.requestPhoneOtp("+2348012345678", "restart-user");
    await service.verifyPhoneOtp("+2348012345678", "123456", "restart-user");

    const restartedDatabaseService = new DatabaseService({ pool });
    await restartedDatabaseService.onModuleInit();
    const restartedService = new AppService(restartedDatabaseService);
    await restartedService.onModuleInit();

    const bootstrap = await restartedService.getBootstrap("restart-user");
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
});
