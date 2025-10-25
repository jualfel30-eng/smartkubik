import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Query,
  Get,
  Req,
  Param,
  Logger,
} from "@nestjs/common";
import { ChatService } from "./chat.service";
import { WhapiSignatureGuard } from "./guards/whapi-signature.guard";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";

@Controller("chat")
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(private readonly chatService: ChatService) {}

  @Get("qr-code")
  @UseGuards(JwtAuthGuard)
  async generateQrCode(@Req() req) {
    const tenantId = req.user.tenantId;
    return this.chatService.generateQrCode(tenantId);
  }

  @Post("configure-webhook")
  @UseGuards(JwtAuthGuard)
  async configureWebhook(@Req() req) {
    const tenantId = req.user.tenantId;
    return this.chatService.configureWebhook(tenantId);
  }

  @Get("conversations")
  @UseGuards(JwtAuthGuard)
  async getConversations(@Req() req) {
    const tenantId = req.user.tenantId; // Extracted from JWT payload by the guard
    return this.chatService.getConversations(tenantId);
  }

  @Get("conversations/:conversationId/messages")
  @UseGuards(JwtAuthGuard)
  async getMessages(
    @Param("conversationId") conversationId: string,
    @Req() req,
  ) {
    const tenantId = req.user.tenantId;
    return this.chatService.getMessagesForConversation(
      conversationId,
      tenantId,
    );
  }

  @Post("whapi-webhook")
  @HttpCode(HttpStatus.OK)
  @UseGuards(WhapiSignatureGuard)
  handleWhapiWebhook(
    @Body() payload: any,
    @Query("tenantId") tenantId: string,
  ) {
    this.logger.log(`🔔 WEBHOOK RECEIVED! TenantId: ${tenantId}`);
    this.logger.log(`📦 Payload: ${JSON.stringify(payload)}`);
    // The guard has already validated the request
    this.chatService.handleIncomingMessage(payload, tenantId);
    return { status: "received" };
  }

  @Post("webhook-test/:channelId")
  @HttpCode(HttpStatus.OK)
  handleWebhookTest(
    @Param("channelId") channelId: string,
    @Body() payload: any,
  ) {
    // This endpoint is used by Whapi to test webhook connectivity
    this.logger.log(
      `Received webhook test for channel: ${channelId}`,
      JSON.stringify(payload),
    );
    return { status: "ok", message: "Webhook test successful" };
  }
}
