import { Body, Controller, Get, Headers, HttpCode, Post, Put, Query } from "@nestjs/common";
import { ReminderService } from "./reminder.service";
import { ReminderPreferences } from "./app.types";

@Controller()
export class ReminderController {
  constructor(private readonly reminderService: ReminderService) {}

  // ── User endpoints ─────────────────────────────────────────────

  @Get("reminders/preferences")
  async getPreferences(@Headers("x-user-id") userId: string) {
    return this.reminderService.getPreferences(userId);
  }

  @Put("reminders/preferences")
  async updatePreferences(
    @Headers("x-user-id") userId: string,
    @Body() body: Partial<Omit<ReminderPreferences, "userId">>
  ) {
    return this.reminderService.updatePreferences(userId, body);
  }

  // ── Ops endpoints ──────────────────────────────────────────────

  @Get("ops/delivery-logs")
  async getDeliveryLogs(
    @Query("limit") limit?: string,
    @Query("status") status?: string,
    @Query("userId") userId?: string
  ) {
    return this.reminderService.getDeliveryLogs({
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
      userId
    });
  }
}
