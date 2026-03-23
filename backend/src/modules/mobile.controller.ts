import { Body, Controller, Get, Headers, Put } from "@nestjs/common";
import { AppService } from "./app.service";

@Controller("mobile")
export class MobileController {
  constructor(private readonly appService: AppService) {}

  @Get("bootstrap")
  getBootstrap(@Headers("x-user-id") userId?: string) {
    return this.appService.getBootstrap(userId);
  }

  @Put("profile")
  updateProfile(@Body() body: any, @Headers("x-user-id") userId?: string) {
    return this.appService.updateEditableProfile(body, userId);
  }

  @Put("preferences/dating")
  updateDatingPreferences(@Body() body: any, @Headers("x-user-id") userId?: string) {
    return this.appService.updateDatingPreferences(body, userId);
  }

  @Put("settings/account")
  updateAccountSettings(@Body() body: any, @Headers("x-user-id") userId?: string) {
    return this.appService.updateAccountSettings(body, userId);
  }

  @Put("settings/app")
  updateAppSettings(@Body() body: any, @Headers("x-user-id") userId?: string) {
    return this.appService.updateAppPreferences(body, userId);
  }
}
