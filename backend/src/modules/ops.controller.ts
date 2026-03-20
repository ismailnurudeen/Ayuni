import { Controller, Get, Param, Post } from "@nestjs/common";
import { AppService } from "./app.service";

@Controller("ops")
export class OpsController {
  constructor(private readonly appService: AppService) {}

  @Get("overview")
  getOpsOverview() {
    return this.appService.getOpsOverview();
  }

  @Get("dashboard")
  getDashboard() {
    return this.appService.getOpsDashboard();
  }

  @Post("reports/:id/resolve")
  resolveReport(@Param("id") id: string) {
    return this.appService.resolveReport(id);
  }

  @Post("bookings/:id/escalate")
  escalateBooking(@Param("id") id: string) {
    return this.appService.escalateBooking(id);
  }

  @Post("venues/:id/toggle")
  toggleVenue(@Param("id") id: string) {
    return this.appService.toggleVenue(id);
  }
}
