import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { AppService } from "./app.service";
import { AuthGuard, UserId } from "./auth.guard";

@Controller("verification")
@UseGuards(AuthGuard)
export class VerificationController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getVerification(@UserId() userId: string) {
    return this.appService.getVerification(userId);
  }

  @Post("selfie")
  submitSelfie(@Body() body: { imageUrl: string }, @UserId() userId: string) {
    return this.appService.submitSelfie(body.imageUrl, userId);
  }

  @Post("gov-id")
  submitGovId(
    @Body() body: { 
      frontImageUrl: string;
      backImageUrl?: string;
      idType: "national_id" | "drivers_license" | "passport" | "voters_card";
    },
    @UserId() userId: string
  ) {
    return this.appService.submitGovId(
      body.frontImageUrl,
      body.idType,
      userId,
      body.backImageUrl
    );
  }

  @Post("id")
  verifyId(@UserId() userId: string) {
    return this.appService.verifyId(userId);
  }
}
