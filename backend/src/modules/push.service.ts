import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { PushPayload } from "./app.types";

@Injectable()
export class PushService {
  private readonly fcmServerKey: string;
  private readonly testMode: boolean;

  constructor(private readonly database: DatabaseService) {
    this.fcmServerKey = process.env.FCM_SERVER_KEY || "TEST_MODE";
    this.testMode = this.fcmServerKey === "TEST_MODE";

    if (this.testMode) {
      console.log("⚠️  Push service running in TEST MODE - notifications will not be sent");
    }
  }

  async sendToUser(userId: string, payload: PushPayload): Promise<{ sent: number; failed: number }> {
    const tokens = await this.database.query<{ token: string; platform: string }>(
      "SELECT token, platform FROM device_tokens WHERE user_id = $1",
      [userId]
    );

    if (tokens.rows.length === 0) {
      return { sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    for (const row of tokens.rows) {
      try {
        if (row.platform === "android") {
          await this.sendFcm(row.token, payload);
        } else if (row.platform === "ios") {
          await this.sendFcm(row.token, payload); // FCM handles both platforms
        }
        sent++;
      } catch (err) {
        console.error(`Push send failed for token ${row.token.substring(0, 8)}...:`, err);
        failed++;
      }
    }

    return { sent, failed };
  }

  private async sendFcm(token: string, payload: PushPayload): Promise<void> {
    if (this.testMode) {
      console.log(`📱 [TEST MODE] Push to ${token.substring(0, 12)}...: ${payload.title}`);
      return;
    }

    const response = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        Authorization: `key=${this.fcmServerKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        to: token,
        notification: {
          title: payload.title,
          body: payload.body
        },
        data: payload.data || {}
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`FCM send failed: ${error}`);
    }
  }
}
