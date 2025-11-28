import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  Logger,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { WhatsAppService } from "./whatsapp.service";
import {
  CreateWhatsAppTemplateDto,
  UpdateWhatsAppTemplateDto,
  SendTemplateMessageDto,
  SendInteractiveButtonMessageDto,
  SendInteractiveListMessageDto,
  SendMediaMessageDto,
  BulkSendWhatsAppDto,
  GetWhatsAppTemplatesQueryDto,
} from "../../dto/whatsapp.dto";

@Controller("whatsapp")
@UseGuards(JwtAuthGuard)
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);

  constructor(private readonly whatsappService: WhatsAppService) {}

  // ==================== Template Endpoints ====================

  @Post("templates")
  async createTemplate(
    @Body() createDto: CreateWhatsAppTemplateDto,
    @Request() req,
  ) {
    this.logger.log(
      `POST /whatsapp/templates - Creating template '${createDto.name}' for tenant ${req.user.tenantId}`,
    );

    const template = await this.whatsappService.createTemplate(
      req.user.tenantId,
      req.user.userId,
      createDto,
    );

    return {
      success: true,
      data: template,
      message: "WhatsApp template created successfully",
    };
  }

  @Get("templates")
  async getTemplates(
    @Query() query: GetWhatsAppTemplatesQueryDto,
    @Request() req,
  ) {
    this.logger.log(
      `GET /whatsapp/templates - Fetching templates for tenant ${req.user.tenantId}`,
    );

    const templates = await this.whatsappService.findTemplates(
      req.user.tenantId,
      query,
    );

    return {
      success: true,
      data: templates,
      count: templates.length,
      message: "Templates retrieved successfully",
    };
  }

  @Get("templates/:id")
  async getTemplate(@Param("id") templateId: string, @Request() req) {
    this.logger.log(
      `GET /whatsapp/templates/${templateId} - Fetching template for tenant ${req.user.tenantId}`,
    );

    const template = await this.whatsappService.findTemplateById(
      req.user.tenantId,
      templateId,
    );

    return {
      success: true,
      data: template,
      message: "Template retrieved successfully",
    };
  }

  @Put("templates/:id")
  async updateTemplate(
    @Param("id") templateId: string,
    @Body() updateDto: UpdateWhatsAppTemplateDto,
    @Request() req,
  ) {
    this.logger.log(
      `PUT /whatsapp/templates/${templateId} - Updating template for tenant ${req.user.tenantId}`,
    );

    const template = await this.whatsappService.updateTemplate(
      req.user.tenantId,
      templateId,
      updateDto,
    );

    return {
      success: true,
      data: template,
      message: "Template updated successfully",
    };
  }

  @Delete("templates/:id")
  async deleteTemplate(@Param("id") templateId: string, @Request() req) {
    this.logger.log(
      `DELETE /whatsapp/templates/${templateId} - Deleting template for tenant ${req.user.tenantId}`,
    );

    const result = await this.whatsappService.deleteTemplate(
      req.user.tenantId,
      templateId,
    );

    return {
      success: true,
      data: result,
      message: "Template deleted successfully",
    };
  }

  // ==================== Message Sending Endpoints ====================

  @Post("send/template")
  async sendTemplateMessage(
    @Body() sendDto: SendTemplateMessageDto,
    @Request() req,
  ) {
    this.logger.log(
      `POST /whatsapp/send/template - Sending template message to ${sendDto.to} for tenant ${req.user.tenantId}`,
    );

    const result = await this.whatsappService.sendTemplateMessage(
      req.user.tenantId,
      sendDto,
    );

    if (result.success) {
      return {
        success: true,
        data: {
          deliveryId: result.deliveryId,
          recipient: sendDto.to,
        },
        message: "WhatsApp template message sent successfully",
      };
    } else {
      return {
        success: false,
        error: result.error,
        message: "Failed to send WhatsApp template message",
      };
    }
  }

  @Post("send/interactive/buttons")
  async sendInteractiveButtonMessage(
    @Body() sendDto: SendInteractiveButtonMessageDto,
    @Request() req,
  ) {
    this.logger.log(
      `POST /whatsapp/send/interactive/buttons - Sending interactive button message to ${sendDto.to} for tenant ${req.user.tenantId}`,
    );

    const result = await this.whatsappService.sendInteractiveButtonMessage(
      req.user.tenantId,
      sendDto,
    );

    if (result.success) {
      return {
        success: true,
        data: {
          deliveryId: result.deliveryId,
          recipient: sendDto.to,
        },
        message: "WhatsApp interactive button message sent successfully",
      };
    } else {
      return {
        success: false,
        error: result.error,
        message: "Failed to send WhatsApp interactive button message",
      };
    }
  }

  @Post("send/interactive/list")
  async sendInteractiveListMessage(
    @Body() sendDto: SendInteractiveListMessageDto,
    @Request() req,
  ) {
    this.logger.log(
      `POST /whatsapp/send/interactive/list - Sending interactive list message to ${sendDto.to} for tenant ${req.user.tenantId}`,
    );

    const result = await this.whatsappService.sendInteractiveListMessage(
      req.user.tenantId,
      sendDto,
    );

    if (result.success) {
      return {
        success: true,
        data: {
          deliveryId: result.deliveryId,
          recipient: sendDto.to,
        },
        message: "WhatsApp interactive list message sent successfully",
      };
    } else {
      return {
        success: false,
        error: result.error,
        message: "Failed to send WhatsApp interactive list message",
      };
    }
  }

  @Post("send/media")
  async sendMediaMessage(@Body() sendDto: SendMediaMessageDto, @Request() req) {
    this.logger.log(
      `POST /whatsapp/send/media - Sending ${sendDto.mediaType} message to ${sendDto.to} for tenant ${req.user.tenantId}`,
    );

    const result = await this.whatsappService.sendMediaMessage(
      req.user.tenantId,
      sendDto,
    );

    if (result.success) {
      return {
        success: true,
        data: {
          deliveryId: result.deliveryId,
          recipient: sendDto.to,
          mediaType: sendDto.mediaType,
        },
        message: "WhatsApp media message sent successfully",
      };
    } else {
      return {
        success: false,
        error: result.error,
        message: "Failed to send WhatsApp media message",
      };
    }
  }

  @Post("send/bulk")
  async bulkSendTemplate(@Body() bulkDto: BulkSendWhatsAppDto, @Request() req) {
    this.logger.log(
      `POST /whatsapp/send/bulk - Bulk sending template to ${bulkDto.recipients.length} recipients for tenant ${req.user.tenantId}`,
    );

    const result = await this.whatsappService.bulkSendTemplate(
      req.user.tenantId,
      bulkDto,
    );

    return {
      success: true,
      data: {
        queued: result.queued,
        failed: result.failed,
        total: bulkDto.recipients.length,
        deliveryIds: result.deliveryIds,
        errors: result.errors,
      },
      message: `Bulk send completed: ${result.queued} sent, ${result.failed} failed`,
    };
  }

  // ==================== Statistics Endpoints ====================

  @Get("templates/:id/stats")
  async getTemplateStats(@Param("id") templateId: string, @Request() req) {
    this.logger.log(
      `GET /whatsapp/templates/${templateId}/stats - Fetching template stats for tenant ${req.user.tenantId}`,
    );

    const template = await this.whatsappService.findTemplateById(
      req.user.tenantId,
      templateId,
    );

    return {
      success: true,
      data: {
        templateId: template._id,
        name: template.name,
        displayName: template.displayName,
        usageCount: template.usageCount,
        lastUsedAt: template.lastUsedAt,
        isActive: template.isActive,
      },
      message: "Template statistics retrieved successfully",
    };
  }
}
