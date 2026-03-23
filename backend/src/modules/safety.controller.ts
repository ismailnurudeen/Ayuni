import { Body, Controller, Get, Headers, Param, Post } from "@nestjs/common";
import { AppService } from "./app.service";

@Controller()
export class SafetyController {
  constructor(private readonly appService: AppService) {}

  @Post("bookings/:id/report")
  createReport(
    @Param("id") id: string,
    @Body() body: { category: "LateArrival" | "NoShow" | "UnsafeBehavior"; details: string },
    @Headers("x-user-id") userId?: string
  ) {
    return this.appService.createReport({
      bookingId: id,
      category: body.category,
      details: body.details
    }, userId);
  }

  @Get("ops/overview")
  getOpsOverview(@Headers("x-user-id") userId?: string) {
    return this.appService.getOpsOverview(userId);
  }
}
