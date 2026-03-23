import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { BookingController } from "./booking.controller";
import { MatchingController } from "./matching.controller";
import { SafetyController } from "./safety.controller";
import { VerificationController } from "./verification.controller";
import { AuthController } from "./auth.controller";
import { MobileController } from "./mobile.controller";
import { OpsController } from "./ops.controller";
import { AppService } from "./app.service";
import { DatabaseService } from "../database/database.service";

@Module({
  controllers: [
    AppController,
    AuthController,
    MobileController,
    OpsController,
    VerificationController,
    MatchingController,
    BookingController,
    SafetyController
  ],
  providers: [DatabaseService, AppService]
})
export class AppModule {}
