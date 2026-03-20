import { Body, Controller, Post } from "@nestjs/common";
import { AppService } from "./app.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly appService: AppService) {}

  @Post("phone")
  requestPhone(@Body() body: { phoneNumber: string }) {
    return this.appService.requestPhoneOtp(body.phoneNumber);
  }
}

