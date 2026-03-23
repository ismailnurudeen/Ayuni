import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { AppService } from "./app.service";
import { AuthGuard, UserId } from "./auth.guard";

@Controller()
@UseGuards(AuthGuard)
export class SafetyController {
  constructor(private readonly appService: AppService) {}

  @Post("bookings/:id/report")
  createReport(
    @Param("id") id: string,
    @Body() body: { category: "LateArrival" | "NoShow" | "UnsafeBehavior"; details: string },
    @UserId() userId: string
  ) {
    return this.appService.createReport({
      bookingId: id,
      category: body.category,
      details: body.details
    }, userId);
  }

  @Get("ops/overview")
  getOpsOverview(@UserId() userId: string) {
    return this.appService.getOpsOverview(userId);
  }
}
