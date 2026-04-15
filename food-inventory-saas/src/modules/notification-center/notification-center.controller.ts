import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { NotificationCenterService, UserContext } from "./notification-center.service";
import { NotificationQueryDto } from "./dto/notification-query.dto";
import { UpdatePreferencesDto } from "./dto/update-preferences.dto";
import { NotificationCategory } from "../../schemas/notification.schema";
import { WebPushService } from "./web-push.service";

@Controller("notification-center")
@UseGuards(JwtAuthGuard)
export class NotificationCenterController {
  constructor(
    private readonly service: NotificationCenterService,
    private readonly webPush: WebPushService,
  ) { }

  private getUserContext(req: any): UserContext {
    return {
      id: req.user.sub || req.user._id || req.user.id,
      tenantId: req.user.tenantId,
      email: req.user.email,
    };
  }

  @Get()
  async findAll(@Query() query: NotificationQueryDto, @Req() req: any) {
    const user = this.getUserContext(req);
    return this.service.findAll(query, user);
  }

  @Get("unread")
  async getUnread(@Req() req: any) {
    const user = this.getUserContext(req);
    return this.service.findUnread(user);
  }

  @Get("preferences")
  async getPreferences(@Req() req: any) {
    const user = this.getUserContext(req);
    return this.service.getPreferences(user.id, user.tenantId);
  }

  @Patch("preferences")
  async updatePreferences(
    @Body() dto: UpdatePreferencesDto,
    @Req() req: any,
  ) {
    const user = this.getUserContext(req);
    return this.service.updatePreferences(user.id, user.tenantId, dto);
  }

  @Patch(":id/read")
  async markAsRead(@Param("id") id: string, @Req() req: any) {
    const user = this.getUserContext(req);
    return this.service.markAsRead(id, user);
  }

  @Patch("read-all")
  async markAllAsRead(
    @Query("category") category: NotificationCategory | undefined,
    @Req() req: any,
  ) {
    const user = this.getUserContext(req);
    const modifiedCount = await this.service.markAllAsRead(user, category);
    return { modifiedCount };
  }

  @Delete(":id")
  async delete(@Param("id") id: string, @Req() req: any) {
    const user = this.getUserContext(req);
    await this.service.delete(id, user);
    return { success: true };
  }

  // ─── Web Push ─────────────────────────────────────────────────────────────

  /** Devuelve la VAPID public key para que el cliente pueda suscribirse. */
  @Get("push/vapid-key")
  getVapidKey() {
    return { publicKey: this.webPush.getPublicKey() };
  }

  /** Registra o actualiza la suscripción push del dispositivo actual. */
  @Post("push/subscribe")
  async subscribePush(
    @Body() body: { subscription: { endpoint: string; keys: { p256dh: string; auth: string } }; userAgent?: string },
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user._id || req.user.id;
    await this.webPush.saveSubscription(userId, body.subscription, body.userAgent);
    return { success: true };
  }

  /** Elimina la suscripción push (permiso revocado en el dispositivo). */
  @Post("push/unsubscribe")
  async unsubscribePush(
    @Body() body: { endpoint: string },
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user._id || req.user.id;
    await this.webPush.removeSubscription(userId, body.endpoint);
    return { success: true };
  }
}
