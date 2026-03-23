import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { AppService } from "./app.service";
import { AuthGuard, UserId } from "./auth.guard";

@Controller()
@UseGuards(AuthGuard)
export class MatchingController {
  constructor(private readonly appService: AppService) {}

  @Get("suggestions/daily")
  getSuggestions(
    @Query("city") city: "Lagos" | "Abuja" | "PortHarcourt" = "Lagos",
    @UserId() userId: string
  ) {
    return this.appService.getDailySuggestions(city, userId);
  }

  @Post("matches/:id/respond")
  respond(@Param("id") id: string, @Body() body: { response: "accept" | "reject" }, @UserId() userId: string) {
    return this.appService.respondToMatch(id, body.response, userId);
  }

  @Post("matches/:id/availability")
  availability(@Param("id") id: string, @Body() body: { availability: string[] }, @UserId() userId: string) {
    return this.appService.submitAvailability(id, body.availability, userId);
  }
}
