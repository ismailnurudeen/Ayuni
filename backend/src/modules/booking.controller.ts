import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { AppService } from "./app.service";

@Controller()
export class BookingController {
  constructor(private readonly appService: AppService) {}

  @Post("payments/date-token/initiate")
  initiateToken(@Body() body: { paymentMethod: "card" | "bank_transfer" | "ussd" }) {
    return this.appService.initiateDateToken(body.paymentMethod);
  }

  @Get("bookings")
  getBookings() {
    return this.appService.getBookings();
  }

  @Post("bookings")
  createBooking(@Body() body: { matchId: string }) {
    return this.appService.createBooking(body.matchId);
  }

  @Post("bookings/:id/check-in")
  checkIn(@Param("id") id: string) {
    return this.appService.confirmCheckIn(id);
  }

  @Get("bookings/:id/logistics-chat")
  getLogisticsChat(@Param("id") id: string) {
    return this.appService.getLogisticsChat(id);
  }
}

