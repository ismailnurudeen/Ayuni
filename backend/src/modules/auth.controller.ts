import { Body, Controller, Headers, Post, Put } from "@nestjs/common";
import { AppService } from "./app.service";

@Controller("auth")
export class AuthController {
  constructor(private readonly appService: AppService) {}

  @Post("phone")
  requestPhone(@Body() body: { phoneNumber: string }, @Headers("x-user-id") userId?: string) {
    return this.appService.requestPhoneOtp(body.phoneNumber, userId);
  }

  @Post("phone/verify")
  verifyPhone(@Body() body: { phoneNumber: string; code: string }, @Headers("x-user-id") userId?: string) {
    return this.appService.verifyPhoneOtp(body.phoneNumber, body.code, userId);
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
    },
    @Headers("x-user-id") userId?: string
  ) {
    return this.appService.completeBasicOnboarding(body, userId);
  }
}
