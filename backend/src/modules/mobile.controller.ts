import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
import { AppService } from "./app.service";
import { AuthGuard, UserId } from "./auth.guard";

@Controller("mobile")
@UseGuards(AuthGuard)
export class MobileController {
  constructor(private readonly appService: AppService) {}

  @Get("bootstrap")
  getBootstrap(@UserId() userId: string) {
    return this.appService.getBootstrap(userId);
  }

  @Put("profile")
  updateProfile(@Body() body: any, @UserId() userId: string) {
    return this.appService.updateEditableProfile(body, userId);
  }

  @Put("preferences/dating")
  updateDatingPreferences(@Body() body: any, @UserId() userId: string) {
    return this.appService.updateDatingPreferences(body, userId);
  }

  @Put("settings/account")
  updateAccountSettings(@Body() body: any, @UserId() userId: string) {
    return this.appService.updateAccountSettings(body, userId);
  }

  @Put("settings/app")
  updateAppSettings(@Body() body: any, @UserId() userId: string) {
    return this.appService.updateAppPreferences(body, userId);
  }
}
