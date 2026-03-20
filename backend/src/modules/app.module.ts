import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { BookingController } from "./booking.controller";
import { MatchingController } from "./matching.controller";
import { SafetyController } from "./safety.controller";
import { VerificationController } from "./verification.controller";
import { AuthController } from "./auth.controller";
import { AppService } from "./app.service";

@Module({
  controllers: [
    AppController,
    AuthController,
    VerificationController,
    MatchingController,
    BookingController,
    SafetyController
  ],
  providers: [AppService]
})
export class AppModule {}

