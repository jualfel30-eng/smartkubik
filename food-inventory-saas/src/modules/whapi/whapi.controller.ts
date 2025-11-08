import {
  Controller,
  Post,
  Body,
  HttpStatus,
  HttpException,
  Logger,
  Headers,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { WhapiService } from "./whapi.service";
import { WhapiWebhookDto } from "../../dto/whapi.dto";

@ApiTags("whapi")
@Controller("whapi")
export class WhapiController {
  private readonly logger = new Logger(WhapiController.name);

  constructor(private readonly whapiService: WhapiService) {}

  @Post("webhook")
  @ApiOperation({ summary: "Receive WhatsApp webhooks from Whapi" })
  @ApiResponse({ status: 200, description: "Webhook processed successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  async handleWebhook(
    @Body() webhookData: WhapiWebhookDto,
    @Headers("x-tenant-id") tenantId?: string,
  ) {
    try {
      this.logger.log(`Received Whapi webhook: ${JSON.stringify(webhookData)}`);

      // For now, use a default tenant if not provided in headers
      // In production, you might want to configure tenant mapping based on phone numbers
      const activeTenantId = tenantId || process.env.DEFAULT_TENANT_ID;

      if (!activeTenantId) {
        throw new HttpException(
          "Tenant ID is required. Set DEFAULT_TENANT_ID in .env or provide x-tenant-id header",
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.whapiService.processWebhook(
        webhookData,
        activeTenantId,
      );

      return {
        success: true,
        message: "Webhook processed successfully",
        data: result,
      };
    } catch (error) {
      this.logger.error("Error handling Whapi webhook:", error);
      throw new HttpException(
        error.message || "Error processing webhook",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("webhook/:tenantId")
  @ApiOperation({
    summary: "Receive WhatsApp webhooks from Whapi with tenant in URL",
  })
  @ApiResponse({ status: 200, description: "Webhook processed successfully" })
  async handleWebhookWithTenant(
    @Body() webhookData: WhapiWebhookDto,
    @Headers("x-tenant-id") tenantIdParam: string,
  ) {
    try {
      this.logger.log(
        `Received Whapi webhook for tenant ${tenantIdParam}: ${JSON.stringify(webhookData)}`,
      );

      const result = await this.whapiService.processWebhook(
        webhookData,
        tenantIdParam,
      );

      return {
        success: true,
        message: "Webhook processed successfully",
        data: result,
      };
    } catch (error) {
      this.logger.error("Error handling Whapi webhook:", error);
      throw new HttpException(
        error.message || "Error processing webhook",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
