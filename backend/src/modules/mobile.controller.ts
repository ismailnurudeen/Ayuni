import { Body, Controller, Get, Put } from "@nestjs/common";
import { AppService } from "./app.service";

@Controller("mobile")
export class MobileController {
  constructor(private readonly appService: AppService) {}

  @Get("bootstrap")
  getBootstrap() {
    return this.appService.getBootstrap();
  }

  @Put("profile")
  updateProfile(@Body() body: any) {
    return this.appService.updateEditableProfile(body);
  }

  @Put("preferences/dating")
  updateDatingPreferences(@Body() body: any) {
    return this.appService.updateDatingPreferences(body);
  }

  @Put("settings/account")
  updateAccountSettings(@Body() body: any) {
    return this.appService.updateAccountSettings(body);
  }

  @Put("settings/app")
  updateAppSettings(@Body() body: any) {
    return this.appService.updateAppPreferences(body);
  }
}
