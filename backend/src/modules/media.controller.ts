import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from "@nestjs/common";
import { MediaService } from "./media.service";
import { AuthGuard, UserId } from "./auth.guard";

@Controller("mobile/media")
@UseGuards(AuthGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get()
  async getUserMedia(@UserId() userId: string) {
    return this.mediaService.getUserMedia(userId);
  }

  @Post("upload")
  async uploadMedia(
    @Body() body: { dataUrl: string; mediaType: "image" | "video" },
    @UserId() userId: string
  ) {
    return this.mediaService.uploadMedia(userId, body.dataUrl, body.mediaType);
  }

  @Delete(":id")
  async deleteMedia(@Param("id") id: string, @UserId() userId: string) {
    await this.mediaService.deleteMedia(userId, id);
    return { success: true };
  }

  @Put("reorder")
  async reorderMedia(@Body() body: { mediaIds: string[] }, @UserId() userId: string) {
    await this.mediaService.reorderMedia(userId, body.mediaIds);
    return { success: true };
  }
}
