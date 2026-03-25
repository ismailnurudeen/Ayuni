import { Body, Controller, Get, Headers, Post, Query, UseGuards } from "@nestjs/common";
import { AnalyticsService } from "./analytics.service";
import { AuthGuard, UserId } from "./auth.guard";
import { AnalyticsEventInput } from "./app.types";

@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /** Mobile: batch ingest events (authenticated) */
  @Post("events")
  @UseGuards(AuthGuard)
  async ingestEvents(
    @UserId() userId: string,
    @Body() body: { events: AnalyticsEventInput[] }
  ) {
    return this.analyticsService.ingestBatch(userId, body.events || []);
  }

  /** Ops: query a funnel */
  @Get("funnel")
  async queryFunnel(
    @Headers("x-user-id") _userId: string,
    @Query("name") name: string,
    @Query("start") start: string,
    @Query("end") end: string
  ) {
    return this.analyticsService.queryFunnel(name, start, end);
  }

  /** Ops: export raw events */
  @Get("events")
  async getEvents(
    @Headers("x-user-id") _userId: string,
    @Query("eventName") eventName?: string,
    @Query("start") startDate?: string,
    @Query("end") endDate?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    return this.analyticsService.getEvents({
      eventName,
      startDate,
      endDate,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }
}
