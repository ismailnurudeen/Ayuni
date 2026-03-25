import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
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

  // ── Push Notifications & Inbox (P1-06) ───────────────────────────

  @Post("device-tokens")
  registerDeviceToken(
    @Body() body: { platform: "android" | "ios"; token: string },
    @UserId() userId: string
  ) {
    return this.appService.registerDeviceToken(userId, body.platform, body.token);
  }

  @Delete("device-tokens")
  removeDeviceToken(
    @Body() body: { token: string },
    @UserId() userId: string
  ) {
    return this.appService.removeDeviceToken(userId, body.token);
  }

  @Get("notifications")
  getInbox(@UserId() userId: string) {
    return this.appService.getInbox(userId);
  }

  @Post("notifications/:id/read")
  markRead(@Param("id") id: string, @UserId() userId: string) {
    return this.appService.markNotificationRead(userId, id);
  }

  @Post("notifications/read-all")
  markAllRead(@UserId() userId: string) {
    return this.appService.markAllNotificationsRead(userId);
  }

  @Get("notifications/badge")
  getBadgeCount(@UserId() userId: string) {
    return this.appService.getUnreadBadgeCount(userId).then(count => ({ unreadCount: count }));
  }

  @Get("notification-preferences")
  getNotificationPreferences(@UserId() userId: string) {
    return this.appService.getNotificationPreferences(userId);
  }

  @Put("notification-preferences")
  updateNotificationPreferences(@Body() body: any, @UserId() userId: string) {
    return this.appService.updateNotificationPreferences(userId, body);
  }

  // ── P1-11: Account Deletion & Privacy ─────────────────────────────

  @Post("account/delete")
  requestAccountDeletion(@UserId() userId: string) {
    return this.appService.requestAccountDeletion(userId);
  }

  @Post("account/delete/cancel")
  cancelAccountDeletion(@UserId() userId: string) {
    return this.appService.cancelAccountDeletion(userId);
  }

  @Get("account/deletion-status")
  getAccountDeletionStatus(@UserId() userId: string) {
    return this.appService.getAccountDeletionStatus(userId);
  }

  @Post("account/export")
  requestDataExport(@UserId() userId: string) {
    return this.appService.requestDataExport(userId);
  }

  @Get("account/consent")
  getConsentStatus(@UserId() userId: string) {
    return this.appService.getConsentStatus(userId);
  }

  @Post("account/consent")
  acceptPrivacyConsent(@Body() body: { termsVersion: string; privacyVersion: string }, @UserId() userId: string) {
    return this.appService.acceptPrivacyConsent(body.termsVersion, body.privacyVersion, userId);
  }
}
