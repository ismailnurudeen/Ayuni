import { Body, Controller, Post, Put } from "@nestjs/common";
import { AppService } from "./app.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly appService: AppService) {}

  @Post("phone")
  requestPhone(@Body() body: { phoneNumber: string }) {
    return this.appService.requestPhoneOtp(body.phoneNumber);
  }

  @Post("phone/verify")
  verifyPhone(@Body() body: { phoneNumber: string; code: string }) {
    return this.appService.verifyPhoneOtp(body.phoneNumber, body.code);
  }

  @Put("onboarding/basic-profile")
  completeBasicProfile(
    @Body()
    body: {
      firstName: string;
      birthDate: string;
      genderIdentity: string;
      interestedIn: string;
      city: "Lagos" | "Abuja" | "PortHarcourt";
      acceptedTerms: boolean;
    }
  ) {
    return this.appService.completeBasicOnboarding(body);
  }
}
