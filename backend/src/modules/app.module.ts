import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { BookingController } from "./booking.controller";
import { MatchingController } from "./matching.controller";
import { SafetyController } from "./safety.controller";
import { VerificationController } from "./verification.controller";
import { AuthController } from "./auth.controller";
import { MobileController } from "./mobile.controller";
import { MediaController } from "./media.controller";
import { OpsController } from "./ops.controller";
import { WebhookController } from "./webhook.controller";
import { ReminderController } from "./reminder.controller";
import { AppService } from "./app.service";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./auth.guard";
import { OtpService } from "./otp.service";
import { TwilioSmsService } from "./sms.service";
import { WhatsAppService } from "./whatsapp.service";
import { ReminderService } from "./reminder.service";
import { MediaService } from "./media.service";
import { PaystackService } from "./paystack.service";
import { PushService } from "./push.service";
import { DatabaseService } from "../database/database.service";

@Module({
  controllers: [
    AppController,
    AuthController,
    MobileController,
    MediaController,
    OpsController,
    VerificationController,
    MatchingController,
    BookingController,
    SafetyController,
    WebhookController,
    ReminderController
  ],
  providers: [DatabaseService, AppService, AuthService, AuthGuard, OtpService, TwilioSmsService, WhatsAppService, ReminderService, MediaService, PaystackService, PushService]
})  
export class AppModule {}
