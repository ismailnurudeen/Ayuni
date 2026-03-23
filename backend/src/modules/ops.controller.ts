import { Controller, Get, Headers, Param, Post } from "@nestjs/common";
import { AppService } from "./app.service";

@Controller("ops")
export class OpsController {
  constructor(private readonly appService: AppService) {}

  @Get("overview")
  getOpsOverview(@Headers("x-user-id") userId?: string) {
    return this.appService.getOpsOverview(userId);
  }

  @Get("dashboard")
  getDashboard(@Headers("x-user-id") userId?: string) {
    return this.appService.getOpsDashboard(userId);
  }

  @Post("reports/:id/resolve")
  resolveReport(@Param("id") id: string, @Headers("x-user-id") userId?: string) {
    return this.appService.resolveReport(id, userId);
  }

  @Post("bookings/:id/escalate")
  escalateBooking(@Param("id") id: string, @Headers("x-user-id") userId?: string) {
    return this.appService.escalateBooking(id, userId);
  }

  @Post("venues/:id/toggle")
  toggleVenue(@Param("id") id: string) {
    return this.appService.toggleVenue(id);
  }

  @Post("selfies/:id/approve")
  approveSelfie(@Param("id") id: string, @Headers("x-user-id") opsUserId?: string) {
    return this.appService.approveSelfie(id, opsUserId);
  }

  @Post("selfies/:id/reject")
  rejectSelfie(@Param("id") id: string, @Headers("x-user-id") opsUserId?: string) {
    return this.appService.rejectSelfie(id, opsUserId);
  }
}
