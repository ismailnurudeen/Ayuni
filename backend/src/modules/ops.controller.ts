import { Body, Controller, Get, Headers, Param, Post, Put, Query } from "@nestjs/common";
import { AppService } from "./app.service";
import { City, CreateVenuePayload, DateType, UpdateVenuePayload, VenueStatus } from "./app.types";

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

  @Post("reports/:id/investigate")
  investigateReport(@Param("id") id: string, @Headers("x-user-id") userId?: string) {
    return this.appService.investigateReport(id, userId);
  }

  @Post("bookings/:id/escalate")
  escalateBooking(@Param("id") id: string, @Headers("x-user-id") userId?: string) {
    return this.appService.escalateBooking(id, userId);
  }

  // ── Venue Management (P1-04) ──────────────────────────────────────

  @Post("venues")
  createVenue(@Body() body: CreateVenuePayload) {
    return this.appService.createVenue(body);
  }

  @Get("venues")
  listVenues(
    @Query("area") area?: string,
    @Query("status") status?: VenueStatus,
    @Query("type") type?: DateType,
    @Query("city") city?: City,
    @Query("search") search?: string
  ) {
    return this.appService.listVenues({ area, status, type, city, search });
  }

  @Get("venues/:id")
  getVenueDetail(@Param("id") id: string) {
    return this.appService.getVenueDetail(id);
  }

  @Put("venues/:id")
  updateVenue(@Param("id") id: string, @Body() body: UpdateVenuePayload) {
    return this.appService.updateVenue(id, body);
  }

  @Post("venues/:id/toggle")
  toggleVenue(@Param("id") id: string) {
    return this.appService.toggleVenue(id);
  }

  @Post("venues/:id/activate")
  activateVenue(@Param("id") id: string) {
    return this.appService.setVenueStatus(id, "active");
  }

  @Post("venues/:id/deactivate")
  deactivateVenue(@Param("id") id: string) {
    return this.appService.setVenueStatus(id, "inactive");
  }

  @Post("venues/:id/maintenance")
  setVenueMaintenance(@Param("id") id: string) {
    return this.appService.setVenueStatus(id, "maintenance");
  }

  @Get("venues/:id/availability")
  checkVenueAvailability(
    @Param("id") id: string,
    @Query("date") date: string,
    @Query("time") time: string
  ) {
    return this.appService.checkVenueAvailability(id, date, time);
  }

  // ── Existing endpoints ────────────────────────────────────────────

  @Post("selfies/:id/approve")
  approveSelfie(@Param("id") id: string, @Headers("x-user-id") opsUserId?: string) {
    return this.appService.approveSelfie(id, opsUserId);
  }

  @Post("selfies/:id/reject")
  rejectSelfie(@Param("id") id: string, @Headers("x-user-id") opsUserId?: string) {
    return this.appService.rejectSelfie(id, opsUserId);
  }

  @Post("gov-ids/:id/approve")
  approveGovId(@Param("id") id: string, @Headers("x-user-id") opsUserId?: string) {
    return this.appService.approveGovId(id, opsUserId);
  }

  @Post("gov-ids/:id/reject")
  rejectGovId(
    @Param("id") id: string,
    @Body() body: { reason?: string },
    @Headers("x-user-id") opsUserId?: string
  ) {
    return this.appService.rejectGovId(id, body.reason, opsUserId);
  }

  @Post("feature-toggles/:name/enable")
  enableFeature(@Param("name") name: string, @Headers("x-user-id") opsUserId?: string) {
    return this.appService.setFeatureToggle(name, true, opsUserId);
  }

  @Post("feature-toggles/:name/disable")
  disableFeature(@Param("name") name: string, @Headers("x-user-id") opsUserId?: string) {
    return this.appService.setFeatureToggle(name, false, opsUserId);
  }
}
