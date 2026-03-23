import { Body, Controller, Get, Headers, Param, Post, Query } from "@nestjs/common";
import { AppService } from "./app.service";

@Controller()
export class MatchingController {
  constructor(private readonly appService: AppService) {}

  @Get("suggestions/daily")
  getSuggestions(
    @Query("city") city: "Lagos" | "Abuja" | "PortHarcourt" = "Lagos",
    @Headers("x-user-id") userId?: string
  ) {
    return this.appService.getDailySuggestions(city, userId);
  }

  @Post("matches/:id/respond")
  respond(@Param("id") id: string, @Body() body: { response: "accept" | "reject" }, @Headers("x-user-id") userId?: string) {
    return this.appService.respondToMatch(id, body.response, userId);
  }

  @Post("matches/:id/availability")
  availability(@Param("id") id: string, @Body() body: { availability: string[] }, @Headers("x-user-id") userId?: string) {
    return this.appService.submitAvailability(id, body.availability, userId);
  }
}
