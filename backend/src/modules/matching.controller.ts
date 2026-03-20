import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { AppService } from "./app.service";

@Controller()
export class MatchingController {
  constructor(private readonly appService: AppService) {}

  @Get("suggestions/daily")
  getSuggestions(@Query("city") city: "Lagos" | "Abuja" | "PortHarcourt" = "Lagos") {
    return this.appService.getDailySuggestions(city);
  }

  @Post("matches/:id/respond")
  respond(@Param("id") id: string, @Body() body: { response: "accept" | "reject" }) {
    return this.appService.respondToMatch(id, body.response);
  }

  @Post("matches/:id/availability")
  availability(@Param("id") id: string, @Body() body: { availability: string[] }) {
    return this.appService.submitAvailability(id, body.availability);
  }
}

