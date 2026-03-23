import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { AppService } from "./app.service";
import { AuthGuard, UserId } from "./auth.guard";

@Controller()
@UseGuards(AuthGuard)
export class BookingController {
  constructor(private readonly appService: AppService) {}

  @Post("payments/date-token/initiate")
  initiateToken(
    @Body() body: { paymentMethod: "card" | "bank_transfer" | "ussd"; bookingId?: string },
    @UserId() userId: string
  ) {
    return this.appService.initiateDateToken(body.paymentMethod, userId, body.bookingId);
  }

  @Get("bookings")
  getBookings(@UserId() userId: string) {
    return this.appService.getBookings(userId);
  }

  @Post("bookings")
  createBooking(@Body() body: { matchId: string }, @UserId() userId: string) {
    return this.appService.createBooking(body.matchId, userId);
  }

  @Post("bookings/:id/check-in")
  checkIn(@Param("id") id: string, @UserId() userId: string) {
    return this.appService.confirmCheckIn(id, userId);
  }

  @Get("bookings/:id/logistics-chat")
  getLogisticsChat(@Param("id") id: string, @UserId() userId: string) {
    return this.appService.getLogisticsChat(id, userId);
  }
}
