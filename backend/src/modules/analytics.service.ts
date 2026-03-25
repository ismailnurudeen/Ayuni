import { Injectable } from "@nestjs/common";
import { createHash } from "crypto";
import { DatabaseService } from "../database/database.service";
import { AnalyticsEvent, AnalyticsEventInput, FunnelResult, FunnelStep } from "./app.types";

// PII field names to strip from event properties
const PII_FIELDS = new Set([
  "phone", "phoneNumber", "email", "name", "firstName", "lastName",
  "address", "deviceInfo", "contactPhone", "contactEmail",
]);

@Injectable()
export class AnalyticsService {
  constructor(private readonly database: DatabaseService) {}

  /** Hash a user ID for privacy-safe storage */
  hashUserId(userId: string): string {
    return createHash("sha256").update(userId).digest("hex").slice(0, 16);
  }

  /** Strip PII keys from a properties object */
  scrubPii(properties: Record<string, unknown>): Record<string, unknown> {
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(properties)) {
      if (!PII_FIELDS.has(key)) {
        clean[key] = value;
      }
    }
    return clean;
  }

  /** Record a single analytics event (server-side) */
  async trackEvent(userId: string, eventName: string, properties: Record<string, unknown> = {}): Promise<void> {
    const id = `evt-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    const userIdHash = this.hashUserId(userId);
    const scrubbed = this.scrubPii(properties);
    await this.database.query(
      `INSERT INTO analytics_events (id, user_id_hash, event_name, properties, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [id, userIdHash, eventName, JSON.stringify(scrubbed)]
    );
  }

  /** Ingest a batch of events from the mobile client */
  async ingestBatch(userId: string, events: AnalyticsEventInput[]): Promise<{ ingested: number }> {
    const userIdHash = this.hashUserId(userId);
    let ingested = 0;

    for (const event of events) {
      const id = `evt-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      const scrubbed = this.scrubPii(event.properties || {});
      const createdAt = event.timestamp || new Date().toISOString();
      await this.database.query(
        `INSERT INTO analytics_events (id, user_id_hash, event_name, properties, created_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [id, userIdHash, event.eventName, JSON.stringify(scrubbed), createdAt]
      );
      ingested++;
    }

    return { ingested };
  }

  /** Query a predefined funnel over a date range */
  async queryFunnel(
    funnelName: string,
    startDate: string,
    endDate: string
  ): Promise<FunnelResult> {
    const funnelDefs: Record<string, string[]> = {
      onboarding: [
        "onboarding_welcome_viewed",
        "onboarding_phone_submitted",
        "onboarding_otp_verified",
        "onboarding_basic_profile_completed",
      ],
      round: [
        "round_received",
        "round_profile_viewed",
        "round_reaction_submitted",
        "round_completed",
      ],
      booking: [
        "match_accepted",
        "availability_submitted",
        "payment_initiated",
        "payment_completed",
        "booking_confirmed",
      ],
      verification: [
        "selfie_submitted",
        "selfie_approved",
        "selfie_rejected",
        "gov_id_submitted",
        "gov_id_approved",
        "gov_id_rejected",
      ],
    };

    const stepNames = funnelDefs[funnelName];
    if (!stepNames) {
      return { name: funnelName, steps: [], period: `${startDate} to ${endDate}` };
    }

    const steps: FunnelStep[] = [];
    for (const step of stepNames) {
      const result = await this.database.query<{ count: string }>(
        `SELECT COUNT(DISTINCT user_id_hash) as count
         FROM analytics_events
         WHERE event_name = $1 AND created_at >= $2 AND created_at < $3`,
        [step, startDate, endDate]
      );
      steps.push({ step, count: parseInt(result.rows[0]?.count || "0", 10) });
    }

    return { name: funnelName, steps, period: `${startDate} to ${endDate}` };
  }

  /** Get raw events for export, paginated */
  async getEvents(
    options: { eventName?: string; startDate?: string; endDate?: string; limit?: number; offset?: number } = {}
  ): Promise<AnalyticsEvent[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    let idx = 1;

    if (options.eventName) {
      conditions.push(`event_name = $${idx++}`);
      params.push(options.eventName);
    }
    if (options.startDate) {
      conditions.push(`created_at >= $${idx++}`);
      params.push(options.startDate);
    }
    if (options.endDate) {
      conditions.push(`created_at < $${idx++}`);
      params.push(options.endDate);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = options.limit || 100;
    const offset = options.offset || 0;

    const result = await this.database.query<{
      id: string;
      user_id_hash: string;
      event_name: string;
      properties: Record<string, unknown>;
      created_at: string;
    }>(
      `SELECT id, user_id_hash, event_name, properties, created_at
       FROM analytics_events ${where}
       ORDER BY created_at DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      [...params, limit, offset]
    );

    return result.rows.map((row) => ({
      id: row.id,
      userIdHash: row.user_id_hash,
      eventName: row.event_name,
      properties: row.properties,
      createdAt: row.created_at,
    }));
  }
}
