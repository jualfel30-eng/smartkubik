import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Req,
  UseGuards,
  Logger,
  Patch,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { WhapiPartnerService } from "./whapi-partner.service";

@ApiTags("whapi-channels")
@Controller("whapi/channels")
export class WhapiPartnerController {
  private readonly logger = new Logger(WhapiPartnerController.name);

  constructor(private readonly whapiPartnerService: WhapiPartnerService) {}

  /**
   * Create a new Whapi channel for the tenant and return QR code.
   * This is the primary endpoint tenants call to connect their WhatsApp.
   */
  @Post("create")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Create WhatsApp channel and get QR code" })
  @ApiResponse({ status: 201, description: "Channel created, QR returned" })
  @ApiResponse({ status: 409, description: "Channel already exists" })
  async createChannel(@Req() req) {
    const tenantId = req.user.tenantId;
    this.logger.log(`Creating channel for tenant: ${tenantId}`);

    const result =
      await this.whapiPartnerService.createChannelForTenant(tenantId);

    return {
      success: true,
      channelId: result.channel.channelId,
      qrCode: result.channel.status === "awaiting_scan" ? result.qrCode : null,
      status: result.channel.status,
      mode: result.channel.mode,
    };
  }

  /**
   * Refresh the QR code for an existing channel (if it expired)
   */
  @Get("qr-code")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Get/refresh QR code for existing channel" })
  async getQrCode(@Req() req) {
    const tenantId = req.user.tenantId;
    const result = await this.whapiPartnerService.refreshQrCode(tenantId);

    return {
      success: true,
      qrCode: result.qrCode,
      channelId: result.channelId,
    };
  }

  /**
   * Check channel status (connected, disconnected, etc.)
   */
  @Get("status")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Check WhatsApp channel status" })
  async getStatus(@Req() req) {
    const tenantId = req.user.tenantId;
    const status = await this.whapiPartnerService.checkChannelStatus(tenantId);
    return { success: true, ...status };
  }

  /**
   * Manually trigger webhook configuration
   */
  @Post("configure-webhook")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Configure webhook for the channel" })
  async configureWebhook(@Req() req) {
    const tenantId = req.user.tenantId;
    const result =
      await this.whapiPartnerService.configureChannelWebhook(tenantId);
    return { success: true, webhookUrl: result.webhookUrl };
  }

  /**
   * Extend channel subscription (add days)
   */
  @Post("extend")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Extend channel subscription" })
  async extendChannel(@Req() req, @Body() body: { days?: number }) {
    const tenantId = req.user.tenantId;
    const result = await this.whapiPartnerService.extendChannel(
      tenantId,
      body.days || 30,
    );
    return { success: true, activeTill: result.activeTill };
  }

  /**
   * Change channel mode (trial -> live)
   */
  @Patch("mode")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Change channel mode" })
  async changeMode(
    @Req() req,
    @Body() body: { mode: "trial" | "sandbox" | "live" },
  ) {
    const tenantId = req.user.tenantId;
    return this.whapiPartnerService.changeChannelMode(tenantId, body.mode);
  }

  /**
   * Disconnect and delete the channel
   */
  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Delete/disconnect WhatsApp channel" })
  async deleteChannel(@Req() req) {
    const tenantId = req.user.tenantId;
    return this.whapiPartnerService.deleteChannel(tenantId);
  }

  /**
   * Webhook endpoint for channel status notifications from Whapi.
   * This receives "user connected" events after QR scan.
   */
  @Post("status-webhook")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Receive channel status webhooks from Whapi" })
  async handleStatusWebhook(@Body() payload: any) {
    this.logger.log(
      `Channel status webhook received: ${JSON.stringify(payload)}`,
    );

    // Whapi sends channel_id and status in webhook payload
    if (payload?.channel_id && payload?.status) {
      const phoneNumber =
        payload.phone_number || payload.me?.phone || undefined;

      if (payload.status === "connected" || payload.status === "authorized") {
        await this.whapiPartnerService.markChannelConnected(
          payload.channel_id,
          phoneNumber,
        );
      }
    }

    return { status: "ok" };
  }
}
