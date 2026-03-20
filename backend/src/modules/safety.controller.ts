import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { AppService } from "./app.service";

@Controller()
export class SafetyController {
  constructor(private readonly appService: AppService) {}

  @Post("bookings/:id/report")
  createReport(
    @Param("id") id: string,
    @Body() body: { category: "LateArrival" | "NoShow" | "UnsafeBehavior"; details: string }
  ) {
    return this.appService.createReport({
      bookingId: id,
      category: body.category,
      details: body.details
    });
  }

  @Get("ops/overview")
  getOpsOverview() {
    return this.appService.getOpsOverview();
  }
}

