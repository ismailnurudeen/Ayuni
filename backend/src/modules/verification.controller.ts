import { Controller, Get, Headers, Post } from "@nestjs/common";
import { AppService } from "./app.service";

@Controller("verification")
export class VerificationController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getVerification(@Headers("x-user-id") userId?: string) {
    return this.appService.getVerification(userId);
  }

  @Post("selfie")
  verifySelfie(@Headers("x-user-id") userId?: string) {
    return this.appService.verifySelfie(userId);
  }

  @Post("id")
  verifyId(@Headers("x-user-id") userId?: string) {
    return this.appService.verifyId(userId);
  }
}
