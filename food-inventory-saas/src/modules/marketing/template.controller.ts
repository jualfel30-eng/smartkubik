import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TemplateService } from "./template.service";
import {
  CreateEmailTemplateDto,
  UpdateEmailTemplateDto,
  GetTemplatesQueryDto,
  RenderTemplateDto,
  TestSendTemplateDto,
  DuplicateTemplateDto,
} from "../../dto/email-template.dto";
import { NotificationsService } from "../notifications/notifications.service";

/**
 * PHASE 7: EMAIL/SMS TEMPLATES & DELIVERY SYSTEM
 * TemplateController - CRUD endpoints para templates
 */

@Controller("templates")
@UseGuards(JwtAuthGuard)
export class TemplateController {
  constructor(
    private readonly templateService: TemplateService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * POST /templates
   * Create a new template
   */
  @Post()
  async create(@Body() createDto: CreateEmailTemplateDto, @Request() req) {
    const template = await this.templateService.create(
      req.user.tenantId,
      req.user.userId,
      createDto,
    );

    return {
      success: true,
      data: template,
      message: "Template created successfully",
    };
  }

  /**
   * GET /templates
   * Get all templates with filters
   */
  @Get()
  async findAll(@Query() query: GetTemplatesQueryDto, @Request() req) {
    const result = await this.templateService.findAll(
      req.user.tenantId,
      query,
    );

    return {
      success: true,
      data: result.templates,
      pagination: {
        total: result.total,
        page: query.page || 1,
        limit: query.limit || 20,
      },
    };
  }

  /**
   * GET /templates/:id
   * Get template by ID
   */
  @Get(":id")
  async findById(@Param("id") id: string, @Request() req) {
    const template = await this.templateService.findById(
      req.user.tenantId,
      id,
    );

    return {
      success: true,
      data: template,
    };
  }

  /**
   * PUT /templates/:id
   * Update template
   */
  @Put(":id")
  async update(
    @Param("id") id: string,
    @Body() updateDto: UpdateEmailTemplateDto,
    @Request() req,
  ) {
    const template = await this.templateService.update(
      req.user.tenantId,
      id,
      req.user.userId,
      updateDto,
    );

    return {
      success: true,
      data: template,
      message: "Template updated successfully",
    };
  }

  /**
   * DELETE /templates/:id
   * Delete template
   */
  @Delete(":id")
  async delete(@Param("id") id: string, @Request() req) {
    await this.templateService.delete(req.user.tenantId, id);

    return {
      success: true,
      message: "Template deleted successfully",
    };
  }

  /**
   * POST /templates/:id/duplicate
   * Duplicate template
   */
  @Post(":id/duplicate")
  async duplicate(
    @Param("id") id: string,
    @Body() duplicateDto: DuplicateTemplateDto,
    @Request() req,
  ) {
    const template = await this.templateService.duplicate(
      req.user.tenantId,
      id,
      duplicateDto.newName,
      req.user.userId,
    );

    return {
      success: true,
      data: template,
      message: "Template duplicated successfully",
    };
  }

  /**
   * POST /templates/:id/preview
   * Get template preview with sample data
   */
  @Post(":id/preview")
  async preview(
    @Param("id") id: string,
    @Body() body: { context?: Record<string, any> },
    @Request() req,
  ) {
    const preview = await this.templateService.getPreview(
      req.user.tenantId,
      id,
      body.context,
    );

    return {
      success: true,
      data: preview,
    };
  }

  /**
   * POST /templates/:id/validate
   * Validate template
   */
  @Post(":id/validate")
  async validate(@Param("id") id: string, @Request() req) {
    const template = await this.templateService.findById(
      req.user.tenantId,
      id,
    );

    const validation = this.templateService.validateTemplate(template);

    return {
      success: true,
      data: validation,
    };
  }

  /**
   * POST /templates/:id/test-send
   * Send test message using template
   */
  @Post(":id/test-send")
  async testSend(
    @Param("id") id: string,
    @Body() testDto: TestSendTemplateDto,
    @Request() req,
  ) {
    const template = await this.templateService.findById(
      req.user.tenantId,
      id,
    );

    // Render template with sample context
    const context = {
      customerName: "Test User",
      hotelName: "SmartKubik Restaurant",
      ...(testDto.context || {}),
    };

    // Send via NotificationsService
    const results = await this.notificationsService.sendTemplateNotification(
      {
        tenantId: req.user.tenantId,
        customerId: req.user.userId, // Send to self for testing
        templateId: id,
        channels: [testDto.channel as "email" | "sms" | "whatsapp"],
        context,
        customerEmail: testDto.channel === "email" ? testDto.recipient : null,
        customerPhone: testDto.channel === "sms" ? testDto.recipient : null,
        whatsappChatId:
          testDto.channel === "whatsapp" ? testDto.recipient : null,
      },
      {
        engagementDelta: 0, // Don't affect engagement for test sends
      },
    );

    const result = results.find((r) => r.channel === testDto.channel);

    return {
      success: result?.success || false,
      data: {
        sent: result?.success || false,
        channel: testDto.channel,
        recipient: testDto.recipient,
        error: result?.error,
      },
      message: result?.success
        ? "Test message sent successfully"
        : `Failed to send test message: ${result?.error}`,
    };
  }

  /**
   * POST /templates/render
   * Render template with context (without saving)
   */
  @Post("render")
  async render(@Body() renderDto: RenderTemplateDto, @Request() req) {
    const template = await this.templateService.findById(
      req.user.tenantId,
      renderDto.templateId,
    );

    const renderedHtml = this.templateService.renderTemplate(
      template.htmlContent,
      renderDto.context,
    );

    const renderedText = template.textContent
      ? this.templateService.renderTemplate(
          template.textContent,
          renderDto.context,
        )
      : "";

    return {
      success: true,
      data: {
        html: renderedHtml,
        text: renderedText,
        subject: template.subject
          ? this.templateService.renderTemplate(
              template.subject,
              renderDto.context,
            )
          : null,
      },
    };
  }
}
