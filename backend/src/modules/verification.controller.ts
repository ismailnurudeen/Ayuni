import { Controller, Get, Post } from "@nestjs/common";
import { AppService } from "./app.service";

@Controller("verification")
export class VerificationController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getVerification() {
    return this.appService.getVerification();
  }

  @Post("selfie")
  verifySelfie() {
    return this.appService.verifySelfie();
  }

  @Post("id")
  verifyId() {
    return this.appService.verifyId();
  }
}

