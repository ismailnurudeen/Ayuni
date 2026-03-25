import { Body, Controller, Get, Headers, Post, Put, UseGuards } from "@nestjs/common";
import { AppService } from "./app.service";
import { AuthService } from "./auth.service";
import { AuthGuard, UserId } from "./auth.guard";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly appService: AppService,
    private readonly authService: AuthService
  ) {}

  /**
   * Returns the current auth provider so the mobile app knows
   * whether to use Firebase or Twilio OTP flow.
   */
  @Get("provider")
  getProvider() {
    return { provider: this.appService.getAuthProvider() };
  }

  // ── Twilio OTP flow (kept for fallback) ──────────────────────

  @Post("phone")
  requestPhone(@Body() body: { phoneNumber: string }) {
    return this.appService.requestPhoneOtp(body.phoneNumber);
  }

  @Post("phone/verify")
  async verifyPhone(
    @Body() body: { phoneNumber: string; code: string; deviceInfo?: string }
  ) {
    return this.appService.verifyPhoneOtp(body.phoneNumber, body.code, body.deviceInfo);
  }

  // ── Firebase Phone Auth flow (MVP default) ───────────────────

  @Post("firebase/verify")
  async verifyFirebasePhone(
    @Body() body: { idToken: string; deviceInfo?: string }
  ) {
    return this.appService.verifyFirebasePhone(body.idToken, body.deviceInfo);
  }

  @Post("refresh")
  async refreshToken(@Body() body: { refreshToken: string }) {
    const tokens = await this.authService.refreshAccessToken(body.refreshToken);
    if (!tokens) {
      return { success: false, error: "Invalid or expired refresh token" };
    }
    return { success: true, ...tokens };
  }

  @Post("logout")
  @UseGuards(AuthGuard)
  async logout(@Headers("authorization") authHeader: string) {
    const token = authHeader?.substring(7); // Remove "Bearer " prefix
    if (!token) {
      return { success: false };
    }
    const success = await this.authService.invalidateSession(token);
    return { success };
  }

  @Put("onboarding/basic-profile")
  @UseGuards(AuthGuard)
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
    @UserId() userId: string
  ) {
    return this.appService.completeBasicOnboarding(body, userId);
  }
}
