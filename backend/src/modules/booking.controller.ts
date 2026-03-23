import { Body, Controller, Get, Headers, Param, Post } from "@nestjs/common";
import { AppService } from "./app.service";

@Controller()
export class BookingController {
  constructor(private readonly appService: AppService) {}

  @Post("payments/date-token/initiate")
  initiateToken(
    @Body() body: { paymentMethod: "card" | "bank_transfer" | "ussd" },
    @Headers("x-user-id") userId?: string
  ) {
    return this.appService.initiateDateToken(body.paymentMethod, userId);
  }

  @Get("bookings")
  getBookings(@Headers("x-user-id") userId?: string) {
    return this.appService.getBookings(userId);
  }

  @Post("bookings")
  createBooking(@Body() body: { matchId: string }, @Headers("x-user-id") userId?: string) {
    return this.appService.createBooking(body.matchId, userId);
  }

  @Post("bookings/:id/check-in")
  checkIn(@Param("id") id: string, @Headers("x-user-id") userId?: string) {
    return this.appService.confirmCheckIn(id, userId);
  }

  @Get("bookings/:id/logistics-chat")
  getLogisticsChat(@Param("id") id: string, @Headers("x-user-id") userId?: string) {
    return this.appService.getLogisticsChat(id, userId);
  }
}
