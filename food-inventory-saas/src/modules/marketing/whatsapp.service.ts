import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  WhatsAppTemplate,
  WhatsAppTemplateDocument,
} from "../../schemas/whatsapp-template.schema";
import {
  MessageDelivery,
  MessageDeliveryDocument,
} from "../../schemas/message-delivery.schema";
import { Tenant, TenantDocument } from "../../schemas/tenant.schema";
import { Customer, CustomerDocument } from "../../schemas/customer.schema";
import { SuperAdminService } from "../super-admin/super-admin.service";
import {
  Configuration,
  MessagesApi,
  SenderInteractive,
  SenderImage,
  SenderVideo,
  SenderDocument,
  SenderAudio,
} from "../../lib/whapi-sdk/whapi-sdk-typescript-fetch";
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

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    @InjectModel(WhatsAppTemplate.name)
    private templateModel: Model<WhatsAppTemplateDocument>,
    @InjectModel(MessageDelivery.name)
    private deliveryModel: Model<MessageDeliveryDocument>,
    @InjectModel(Tenant.name)
    private tenantModel: Model<TenantDocument>,
    @InjectModel(Customer.name)
    private customerModel: Model<CustomerDocument>,
    private readonly superAdminService: SuperAdminService,
  ) {}

  // ==================== Template Management ====================

  async createTemplate(
    tenantId: string,
    userId: string,
    createDto: CreateWhatsAppTemplateDto,
  ): Promise<WhatsAppTemplateDocument> {
    this.logger.log(
      `Creating WhatsApp template '${createDto.name}' for tenant ${tenantId}`,
    );

    // Extract variables from body text ({{1}}, {{2}}, etc.)
    const bodyText = createDto.body.text;
    const variableMatches = bodyText.match(/{{\d+}}/g) || [];
    const variables = variableMatches.map((match) =>
      match.replace(/[{}]/g, ""),
    );

    const template = new this.templateModel({
      tenantId: new Types.ObjectId(tenantId),
      createdBy: new Types.ObjectId(userId),
      ...createDto,
      variables,
      status: "approved", // Whapi templates don't need approval
      language: createDto.language || "en",
    });

    const saved = await template.save();
    this.logger.log(
      `WhatsApp template '${createDto.name}' created with ID ${saved._id}`,
    );
    return saved;
  }

  async findTemplates(
    tenantId: string,
    query: GetWhatsAppTemplatesQueryDto,
  ): Promise<WhatsAppTemplateDocument[]> {
    this.logger.log(`Finding WhatsApp templates for tenant ${tenantId}`);

    const filter: any = { tenantId: new Types.ObjectId(tenantId) };

    if (query.status) {
      filter.status = query.status;
    }

    if (query.category) {
      filter.category = query.category;
    }

    if (query.language) {
      filter.language = query.language;
    }

    if (query.activeOnly) {
      filter.isActive = true;
    }

    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: "i" } },
        { displayName: { $regex: query.search, $options: "i" } },
      ];
    }

    return this.templateModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findTemplateById(
    tenantId: string,
    templateId: string,
  ): Promise<WhatsAppTemplateDocument> {
    this.logger.log(
      `Finding WhatsApp template ${templateId} for tenant ${tenantId}`,
    );

    const template = await this.templateModel
      .findOne({
        _id: new Types.ObjectId(templateId),
        tenantId: new Types.ObjectId(tenantId),
      })
      .exec();

    if (!template) {
      throw new NotFoundException(`WhatsApp template ${templateId} not found`);
    }

    return template;
  }

  async updateTemplate(
    tenantId: string,
    templateId: string,
    updateDto: UpdateWhatsAppTemplateDto,
  ): Promise<WhatsAppTemplateDocument> {
    this.logger.log(
      `Updating WhatsApp template ${templateId} for tenant ${tenantId}`,
    );

    const template = await this.findTemplateById(tenantId, templateId);

    if (updateDto.displayName !== undefined) {
      template.displayName = updateDto.displayName;
    }

    if (updateDto.isActive !== undefined) {
      template.isActive = updateDto.isActive;
    }

    if (updateDto.metadata !== undefined) {
      template.metadata = { ...template.metadata, ...updateDto.metadata };
    }

    const updated = await template.save();
    this.logger.log(`WhatsApp template ${templateId} updated`);
    return updated;
  }

  async deleteTemplate(
    tenantId: string,
    templateId: string,
  ): Promise<{ success: boolean }> {
    this.logger.log(
      `Deleting WhatsApp template ${templateId} for tenant ${tenantId}`,
    );

    const result = await this.templateModel
      .deleteOne({
        _id: new Types.ObjectId(templateId),
        tenantId: new Types.ObjectId(tenantId),
      })
      .exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(`WhatsApp template ${templateId} not found`);
    }

    this.logger.log(`WhatsApp template ${templateId} deleted`);
    return { success: true };
  }

  async incrementTemplateUsage(
    tenantId: string,
    templateId: string,
  ): Promise<void> {
    await this.templateModel
      .updateOne(
        {
          _id: new Types.ObjectId(templateId),
          tenantId: new Types.ObjectId(tenantId),
        },
        {
          $inc: { usageCount: 1 },
          $set: { lastUsedAt: new Date() },
        },
      )
      .exec();
  }

  // ==================== Message Sending ====================

  async sendTemplateMessage(
    tenantId: string,
    sendDto: SendTemplateMessageDto,
  ): Promise<{ success: boolean; deliveryId: string; error?: string }> {
    this.logger.log(
      `Sending WhatsApp template message to ${sendDto.to} for tenant ${tenantId}`,
    );

    try {
      // Get template
      const template = await this.findTemplateById(
        tenantId,
        sendDto.templateId,
      );

      if (!template.isActive) {
        throw new BadRequestException(
          `Template ${template.displayName} is not active`,
        );
      }

      // Render template body
      let bodyText = template.body.text;
      sendDto.bodyParams.forEach((param, index) => {
        const placeholder = `{{${index + 1}}}`;
        bodyText = bodyText.replace(new RegExp(placeholder, "g"), param);
      });

      // Render header if exists
      let headerText: string | undefined;
      if (template.header && template.header.type === "text") {
        headerText = template.header.content;
        if (sendDto.headerParams && sendDto.headerParams.length > 0) {
          sendDto.headerParams.forEach((param, index) => {
            const placeholder = `{{${index + 1}}}`;
            headerText = headerText!.replace(
              new RegExp(placeholder, "g"),
              param,
            );
          });
        }
      }

      // Get customer if provided
      let customerId: Types.ObjectId | undefined;
      if (sendDto.customerId) {
        const customer = await this.customerModel
          .findOne({
            _id: new Types.ObjectId(sendDto.customerId),
            tenantId: new Types.ObjectId(tenantId),
          })
          .exec();
        if (customer) {
          customerId = customer._id;
        }
      }

      // Create delivery record
      const delivery = new this.deliveryModel({
        tenantId: new Types.ObjectId(tenantId),
        customerId: customerId,
        campaignId: sendDto.campaignId
          ? new Types.ObjectId(sendDto.campaignId)
          : undefined,
        templateId: new Types.ObjectId(sendDto.templateId),
        channel: "whatsapp",
        recipient: sendDto.to,
        subject: template.displayName,
        content: bodyText,
        status: "queued",
        metadata: {
          ...sendDto.metadata,
          templateName: template.name,
          headerText,
          footerText: template.footer?.text,
        },
      });

      const savedDelivery = await delivery.save();

      // Send via Whapi
      const tenant = await this.tenantModel.findById(tenantId).exec();
      if (!tenant) {
        throw new InternalServerErrorException("Tenant not found");
      }

      const accessToken = await this.resolveWhapiToken(tenant);
      const config = new Configuration({ accessToken });
      const messagesApi = new MessagesApi(config);

      // Build interactive message if template has buttons
      if (template.buttons && template.buttons.length > 0) {
        const interactiveMessage: SenderInteractive = {
          to: sendDto.to,
          body: { text: bodyText },
          action: {
            buttons: template.buttons
              .filter((btn) => btn.type === "quick_reply")
              .slice(0, 3)
              .map((btn, idx) => ({
                type: "quick_reply" as const,
                id: `btn_${idx}`,
                title: btn.text,
              })),
          },
        };

        if (headerText) {
          interactiveMessage.header = { text: headerText };
        }

        if (template.footer) {
          interactiveMessage.footer = { text: template.footer.text };
        }

        await messagesApi.sendMessageInteractive({
          senderInteractive: interactiveMessage,
        });
      } else {
        // Send simple text message
        await messagesApi.sendMessageText({
          senderText: {
            to: sendDto.to,
            body: bodyText,
          },
        });
      }

      // Update delivery status
      savedDelivery.status = "sent";
      savedDelivery.sentAt = new Date();
      await savedDelivery.save();

      // Increment template usage
      await this.incrementTemplateUsage(tenantId, sendDto.templateId);

      this.logger.log(
        `WhatsApp template message sent successfully to ${sendDto.to}`,
      );

      return { success: true, deliveryId: savedDelivery._id.toString() };
    } catch (error) {
      this.logger.error(
        `Failed to send WhatsApp template message: ${error.message}`,
        error.stack,
      );

      return {
        success: false,
        deliveryId: "",
        error: error.message,
      };
    }
  }

  async sendInteractiveButtonMessage(
    tenantId: string,
    sendDto: SendInteractiveButtonMessageDto,
  ): Promise<{ success: boolean; deliveryId: string; error?: string }> {
    this.logger.log(
      `Sending WhatsApp interactive button message to ${sendDto.to} for tenant ${tenantId}`,
    );

    try {
      // Get customer if provided
      let customerId: Types.ObjectId | undefined;
      if (sendDto.customerId) {
        const customer = await this.customerModel
          .findOne({
            _id: new Types.ObjectId(sendDto.customerId),
            tenantId: new Types.ObjectId(tenantId),
          })
          .exec();
        if (customer) {
          customerId = customer._id;
        }
      }

      // Create delivery record
      const delivery = new this.deliveryModel({
        tenantId: new Types.ObjectId(tenantId),
        customerId: customerId,
        campaignId: sendDto.campaignId
          ? new Types.ObjectId(sendDto.campaignId)
          : undefined,
        channel: "whatsapp",
        recipient: sendDto.to,
        subject: "Interactive Button Message",
        content: sendDto.bodyText,
        status: "queued",
        metadata: {
          ...sendDto.metadata,
          messageType: "interactive_buttons",
          buttons: sendDto.buttons,
        },
      });

      const savedDelivery = await delivery.save();

      // Send via Whapi
      const tenant = await this.tenantModel.findById(tenantId).exec();
      if (!tenant) {
        throw new InternalServerErrorException("Tenant not found");
      }

      const accessToken = await this.resolveWhapiToken(tenant);
      const config = new Configuration({ accessToken });
      const messagesApi = new MessagesApi(config);

      const interactiveMessage: SenderInteractive = {
        to: sendDto.to,
        body: { text: sendDto.bodyText },
        action: {
          buttons: sendDto.buttons.slice(0, 3).map((btn) => ({
            type: "quick_reply" as const,
            id: btn.id,
            title: btn.title,
          })),
        },
      };

      if (sendDto.headerText) {
        interactiveMessage.header = {
          text: sendDto.headerText,
        };
      }

      if (sendDto.footerText) {
        interactiveMessage.footer = { text: sendDto.footerText };
      }

      await messagesApi.sendMessageInteractive({
        senderInteractive: interactiveMessage,
      });

      // Update delivery status
      savedDelivery.status = "sent";
      savedDelivery.sentAt = new Date();
      await savedDelivery.save();

      this.logger.log(
        `WhatsApp interactive button message sent successfully to ${sendDto.to}`,
      );

      return { success: true, deliveryId: savedDelivery._id.toString() };
    } catch (error) {
      this.logger.error(
        `Failed to send WhatsApp interactive button message: ${error.message}`,
        error.stack,
      );

      return {
        success: false,
        deliveryId: "",
        error: error.message,
      };
    }
  }

  async sendInteractiveListMessage(
    tenantId: string,
    sendDto: SendInteractiveListMessageDto,
  ): Promise<{ success: boolean; deliveryId: string; error?: string }> {
    this.logger.log(
      `Sending WhatsApp interactive list message to ${sendDto.to} for tenant ${tenantId}`,
    );

    try {
      // Get customer if provided
      let customerId: Types.ObjectId | undefined;
      if (sendDto.customerId) {
        const customer = await this.customerModel
          .findOne({
            _id: new Types.ObjectId(sendDto.customerId),
            tenantId: new Types.ObjectId(tenantId),
          })
          .exec();
        if (customer) {
          customerId = customer._id;
        }
      }

      // Create delivery record
      const delivery = new this.deliveryModel({
        tenantId: new Types.ObjectId(tenantId),
        customerId: customerId,
        campaignId: sendDto.campaignId
          ? new Types.ObjectId(sendDto.campaignId)
          : undefined,
        channel: "whatsapp",
        recipient: sendDto.to,
        subject: "Interactive List Message",
        content: sendDto.bodyText,
        status: "queued",
        metadata: {
          ...sendDto.metadata,
          messageType: "interactive_list",
          sections: sendDto.sections,
        },
      });

      const savedDelivery = await delivery.save();

      // Send via Whapi
      const tenant = await this.tenantModel.findById(tenantId).exec();
      if (!tenant) {
        throw new InternalServerErrorException("Tenant not found");
      }

      const accessToken = await this.resolveWhapiToken(tenant);
      const config = new Configuration({ accessToken });
      const messagesApi = new MessagesApi(config);

      const interactiveMessage: SenderInteractive = {
        to: sendDto.to,
        body: { text: sendDto.bodyText },
        action: {
          list: {
            label: sendDto.buttonText,
            sections: sendDto.sections.map((section) => ({
              title: section.title,
              rows: section.rows.map((row) => ({
                id: row.id,
                title: row.title,
                description: row.description,
              })),
            })),
          },
        },
      };

      if (sendDto.headerText) {
        interactiveMessage.header = {
          text: sendDto.headerText,
        };
      }

      if (sendDto.footerText) {
        interactiveMessage.footer = { text: sendDto.footerText };
      }

      await messagesApi.sendMessageInteractive({
        senderInteractive: interactiveMessage,
      });

      // Update delivery status
      savedDelivery.status = "sent";
      savedDelivery.sentAt = new Date();
      await savedDelivery.save();

      this.logger.log(
        `WhatsApp interactive list message sent successfully to ${sendDto.to}`,
      );

      return { success: true, deliveryId: savedDelivery._id.toString() };
    } catch (error) {
      this.logger.error(
        `Failed to send WhatsApp interactive list message: ${error.message}`,
        error.stack,
      );

      return {
        success: false,
        deliveryId: "",
        error: error.message,
      };
    }
  }

  async sendMediaMessage(
    tenantId: string,
    sendDto: SendMediaMessageDto,
  ): Promise<{ success: boolean; deliveryId: string; error?: string }> {
    this.logger.log(
      `Sending WhatsApp media message (${sendDto.mediaType}) to ${sendDto.to} for tenant ${tenantId}`,
    );

    try {
      // Get customer if provided
      let customerId: Types.ObjectId | undefined;
      if (sendDto.customerId) {
        const customer = await this.customerModel
          .findOne({
            _id: new Types.ObjectId(sendDto.customerId),
            tenantId: new Types.ObjectId(tenantId),
          })
          .exec();
        if (customer) {
          customerId = customer._id;
        }
      }

      // Create delivery record
      const delivery = new this.deliveryModel({
        tenantId: new Types.ObjectId(tenantId),
        customerId: customerId,
        campaignId: sendDto.campaignId
          ? new Types.ObjectId(sendDto.campaignId)
          : undefined,
        channel: "whatsapp",
        recipient: sendDto.to,
        subject: `Media Message: ${sendDto.mediaType}`,
        content: sendDto.caption || `[${sendDto.mediaType.toUpperCase()} file]`,
        status: "queued",
        metadata: {
          ...sendDto.metadata,
          messageType: "media",
          mediaType: sendDto.mediaType,
          mediaUrl: sendDto.mediaUrl,
        },
      });

      const savedDelivery = await delivery.save();

      // Send via Whapi
      const tenant = await this.tenantModel.findById(tenantId).exec();
      if (!tenant) {
        throw new InternalServerErrorException("Tenant not found");
      }

      const accessToken = await this.resolveWhapiToken(tenant);
      const config = new Configuration({ accessToken });
      const messagesApi = new MessagesApi(config);

      switch (sendDto.mediaType) {
        case "image":
          await messagesApi.sendMessageImage({
            senderImage: {
              to: sendDto.to,
              media: sendDto.mediaUrl,
              caption: sendDto.caption,
            },
          });
          break;

        case "video":
          await messagesApi.sendMessageVideo({
            senderVideo: {
              to: sendDto.to,
              media: sendDto.mediaUrl,
              caption: sendDto.caption,
            },
          });
          break;

        case "document":
          await messagesApi.sendMessageDocument({
            senderDocument: {
              to: sendDto.to,
              media: sendDto.mediaUrl,
              filename: sendDto.filename || "document",
            },
          });
          break;

        case "audio":
          await messagesApi.sendMessageAudio({
            senderAudio: {
              to: sendDto.to,
              media: sendDto.mediaUrl,
            },
          });
          break;

        default:
          throw new BadRequestException(
            `Unsupported media type: ${sendDto.mediaType}`,
          );
      }

      // Update delivery status
      savedDelivery.status = "sent";
      savedDelivery.sentAt = new Date();
      await savedDelivery.save();

      this.logger.log(
        `WhatsApp media message sent successfully to ${sendDto.to}`,
      );

      return { success: true, deliveryId: savedDelivery._id.toString() };
    } catch (error) {
      this.logger.error(
        `Failed to send WhatsApp media message: ${error.message}`,
        error.stack,
      );

      return {
        success: false,
        deliveryId: "",
        error: error.message,
      };
    }
  }

  async bulkSendTemplate(
    tenantId: string,
    bulkDto: BulkSendWhatsAppDto,
  ): Promise<{
    queued: number;
    failed: number;
    deliveryIds: string[];
    errors: Array<{ recipient: string; error: string }>;
  }> {
    this.logger.log(
      `Bulk sending WhatsApp template to ${bulkDto.recipients.length} recipients for tenant ${tenantId}`,
    );

    const rateLimit = bulkDto.rateLimit || 10; // messages per second
    const delayMs = 1000 / rateLimit;

    const results = {
      queued: 0,
      failed: 0,
      deliveryIds: [] as string[],
      errors: [] as Array<{ recipient: string; error: string }>,
    };

    for (const recipient of bulkDto.recipients) {
      try {
        const result = await this.sendTemplateMessage(tenantId, {
          templateId: bulkDto.templateId,
          to: recipient.to,
          customerId: recipient.customerId,
          campaignId: bulkDto.campaignId,
          headerParams: recipient.headerParams,
          bodyParams: recipient.bodyParams,
          buttonParams: recipient.buttonParams,
        });

        if (result.success) {
          results.queued++;
          results.deliveryIds.push(result.deliveryId);
        } else {
          results.failed++;
          results.errors.push({
            recipient: recipient.to,
            error: result.error || "Unknown error",
          });
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          recipient: recipient.to,
          error: error.message,
        });
      }

      // Rate limiting
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    this.logger.log(
      `Bulk send completed: ${results.queued} queued, ${results.failed} failed`,
    );

    return results;
  }

  // ==================== Helper Methods ====================

  private async resolveWhapiToken(tenant: TenantDocument): Promise<string> {
    if (tenant?.whapiToken?.trim()) {
      return tenant.whapiToken.trim();
    }

    const masterTokenSetting =
      await this.superAdminService.getSetting("WHAPI_MASTER_TOKEN");
    const masterToken = masterTokenSetting?.value?.trim();

    if (masterToken) {
      this.logger.warn(
        `Tenant ${tenant.id} is missing a dedicated WhatsApp token. Falling back to WHAPI_MASTER_TOKEN.`,
      );
      return masterToken;
    }

    throw new InternalServerErrorException(
      "WhatsApp is not configured for this tenant.",
    );
  }
}
