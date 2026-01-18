import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
  UnauthorizedException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  Conversation,
  ConversationDocument,
} from "./schemas/conversation.schema";
import { Message, MessageDocument, SenderType } from "./schemas/message.schema";
import { Tenant, TenantDocument } from "../schemas/tenant.schema";
import { Customer, CustomerDocument } from "../schemas/customer.schema";
import { ChatGateway } from "./chat.gateway";
import { ConfigService } from "@nestjs/config";
import { SuperAdminService } from "../modules/super-admin/super-admin.service";
import {
  Configuration,
  UsersApi,
  ChannelApi,
  MessagesApi,
  SendMessageTextRequest,
  EventTypeEnum,
  SendMessageInteractiveRequest,
  SendMessageImageRequest,
  SendMessageDocumentRequest,
} from "../lib/whapi-sdk/whapi-sdk-typescript-fetch";
import { AssistantService } from "../modules/assistant/assistant.service";
import { WhapiService } from "../modules/whapi/whapi.service";
import {
  AssistantMessageQueueService,
  AssistantMessageJobData,
} from "./queues/assistant-message.queue.service";

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    @InjectModel(Customer.name)
    private customerModel: Model<CustomerDocument>,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
    private readonly configService: ConfigService,
    private readonly superAdminService: SuperAdminService,
    private readonly assistantService: AssistantService,
    private readonly whapiService: WhapiService,
    private readonly assistantQueueService: AssistantMessageQueueService,
  ) { }

  async generateQrCode(tenantId: string): Promise<{ qrCode: string }> {
    this.logger.log(`Generating QR code for tenant: ${tenantId}`);

    const masterTokenSetting =
      await this.superAdminService.getSetting("WHAPI_MASTER_TOKEN");
    const centralApiToken = masterTokenSetting?.value;

    if (!centralApiToken) {
      this.logger.error(
        "Central WHAPI_MASTER_TOKEN is not configured in Super Admin settings.",
      );
      throw new InternalServerErrorException("Chat service is not configured.");
    }

    try {
      const config = new Configuration({ accessToken: centralApiToken });
      const usersApi = new UsersApi(config);

      const response = await usersApi.loginUser();

      if (!response.base64) {
        throw new InternalServerErrorException(
          "Whapi did not return a QR code.",
        );
      }

      // TODO: The logic for obtaining and saving a new channel token was flawed.
      // The loginUser method only returns a QR code for linking, not a new token.
      // The token management strategy needs to be revisited. For now, we are only returning the QR code.
      this.logger.warn(
        `Token acquisition logic in generateQrCode needs review. Only returning QR code.`,
      );

      return { qrCode: response.base64 };
    } catch (error) {
      this.logger.error(
        `Failed to generate QR code from Whapi: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        "Error communicating with WhatsApp provider.",
      );
    }
  }

  async configureWebhook(tenantId: string): Promise<{ success: boolean }> {
    this.logger.log(`Configuring webhook for tenant: ${tenantId}`);

    const tenant = await this.tenantModel.findById(tenantId).exec();
    if (!tenant) {
      throw new NotFoundException(
        "Tenant not found or WhatsApp token is missing.",
      );
    }

    const baseUrl = this.configService.get<string>("API_BASE_URL");
    if (!baseUrl) {
      this.logger.error("API_BASE_URL is not configured.");
      throw new InternalServerErrorException(
        "Server base URL is not configured.",
      );
    }

    const webhookUrl = `${baseUrl}/chat/whapi-webhook?tenantId=${tenantId}`;
    const accessToken = await this.whapiService.resolveWhapiToken(tenant);

    try {
      const config = new Configuration({ accessToken });
      const channelApi = new ChannelApi(config);

      await channelApi.updateChannelSettings({
        settings: {
          webhooks: [
            { url: webhookUrl, events: [{ type: EventTypeEnum.Messages }] },
          ],
        },
      });

      this.logger.log(
        `Successfully configured webhook for tenant ${tenantId} to: ${webhookUrl}`,
      );
      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to configure webhook with Whapi: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        "Error communicating with WhatsApp provider.",
      );
    }
  }

  async getConversations(tenantId: string): Promise<ConversationDocument[]> {
    this.logger.log(`Fetching conversations for tenant: ${tenantId}`);
    return this.conversationModel
      .find({ tenantId: new Types.ObjectId(tenantId) })
      .sort({ updatedAt: -1 })
      .populate({
        path: "messages",
        options: { sort: { createdAt: -1 }, limit: 1 },
      })
      .exec();
  }

  async getMessagesForConversation(
    conversationId: string,
    tenantId: string,
  ): Promise<MessageDocument[]> {
    this.logger.log(
      `Fetching messages for conversation ${conversationId} in tenant ${tenantId}`,
    );
    const conversation = await this.conversationModel
      .findById(conversationId)
      .exec();

    if (!conversation || conversation.tenantId.toString() !== tenantId) {
      throw new UnauthorizedException(
        "You do not have access to this conversation.",
      );
    }

    return this.messageModel
      .find({ conversationId: conversation._id })
      .sort({ createdAt: "asc" })
      .exec();
  }

  async sendOutgoingMessage(
    data: { conversationId: string; content: string },
    tenantId: string,
  ): Promise<void> {
    this.logger.log(
      `Handling outgoing message for conversation ${data.conversationId} in tenant ${tenantId}`,
    );

    const tenant = await this.tenantModel.findById(tenantId).exec();
    if (!tenant) {
      throw new InternalServerErrorException(
        "WhatsApp is not configured for this tenant.",
      );
    }


    const conversation = await this.conversationModel
      .findById(data.conversationId)
      .exec();
    if (!conversation || conversation.tenantId.toString() !== tenantId) {
      throw new NotFoundException("Conversation not found");
    }

    const savedMessage = await this.saveMessage(
      conversation,
      tenantId,
      data.content,
      SenderType.USER,
    );
    this.chatGateway.emitNewMessage(tenantId, savedMessage);

    await this.whapiService.sendWhatsAppMessage(
      tenantId,
      conversation.customerPhoneNumber,
      data.content,
    );
  }

  async sendInteractiveMessage(
    data: {
      conversationId: string;
      body: string;
      accessToken?: string;
      action: {
        buttons?: { id: string; title: string }[];
        button?: string;
        sections?: {
          title: string;
          rows: { id: string; title: string; description?: string }[];
        }[];
      };
      header?: string;
      footer?: string;
    },
    tenantId: string,
  ): Promise<void> {
    this.logger.log(
      `Sending interactive message to conversation ${data.conversationId}`,
    );

    const tenant = await this.tenantModel.findById(tenantId).exec();
    if (!tenant) throw new NotFoundException("Tenant not found");


    const conversation = await this.conversationModel
      .findById(data.conversationId)
      .exec();
    if (!conversation) throw new NotFoundException("Conversation not found");

    // Save internal message representation (as text for now, could be enhanced)
    const savedMessage = await this.saveMessage(
      conversation,
      tenantId,
      `[Interactive Message] ${data.body}`,
      SenderType.USER,
      { interactive: data.action },
    );
    this.chatGateway.emitNewMessage(tenantId, savedMessage);

    await this.whapiService.sendInteractiveMessage(
      tenantId,
      conversation.customerPhoneNumber,
      data,
    );
  }

  async sendMediaMessage(
    data: {
      conversationId: string;
      mediaUrl: string;
      mediaType: "image" | "document" | "video" | "audio";
      caption?: string;
      filename?: string;
    },
    tenantId: string,
  ): Promise<void> {
    this.logger.log(
      `Sending media message (${data.mediaType}) to conversation ${data.conversationId}`,
    );

    const tenant = await this.tenantModel.findById(tenantId).exec();
    if (!tenant) throw new NotFoundException("Tenant not found");


    const conversation = await this.conversationModel
      .findById(data.conversationId)
      .exec();
    if (!conversation) throw new NotFoundException("Conversation not found");

    const savedMessage = await this.saveMessage(
      conversation,
      tenantId,
      data.caption || `[Sent ${data.mediaType}]`,
      SenderType.USER,
      { mediaUrl: data.mediaUrl, mediaType: data.mediaType },
    );
    this.chatGateway.emitNewMessage(tenantId, savedMessage);

    await this.whapiService.sendMediaMessage(
      tenantId,
      conversation.customerPhoneNumber,
      data,
    );
  }

  async handleIncomingMessage(payload: any, tenantId: string): Promise<void> {
    this.logger.log(`Handling incoming message for tenant: ${tenantId}`);

    const tenant = await this.tenantModel.findById(tenantId).exec();
    if (!tenant) {
      this.logger.error(
        `Tenant ${tenantId} not found while processing incoming message.`,
      );
      return;
    }

    if (payload?.messages) {
      for (const msg of payload.messages) {
        // Skip messages sent by us (support both snake_case and camelCase)
        if (msg?.fromMe || msg?.from_me) {
          continue;
        }

        if (msg.from && msg.text) {
          const customerPhoneNumber = msg.from;
          const content = msg.text.body;
          const fromName = msg.from_name || msg.fromName;
          const chatId = msg.chat_id || msg.chatId || msg.from;

          // Auto-create or update customer in CRM
          try {
            await this.whapiService.findOrCreateWhatsAppCustomer(
              customerPhoneNumber,
              fromName,
              chatId,
              tenantId,
            );
            this.logger.log(
              `✅ Customer auto-created/updated for ${customerPhoneNumber}`,
            );
          } catch (error) {
            this.logger.error(
              `Failed to auto-create customer: ${error.message}`,
              error.stack,
            );
          }

          const conversation = await this.findOrCreateConversation(
            tenantId,
            customerPhoneNumber,
          );
          const savedMessage = await this.saveMessage(
            conversation,
            tenantId,
            content,
            SenderType.CUSTOMER,
          );

          this.chatGateway.emitNewMessage(tenantId, savedMessage);

          // Encolar procesamiento del asistente (o ejecutar inline si no hay BullMQ)
          await this.scheduleAssistantJob(tenant, conversation, savedMessage);
        }

        // Handle location sharing
        if (msg.type === "location" && msg.location && msg.from) {
          try {
            const customer =
              await this.whapiService.getCustomerByWhatsAppNumber(
                msg.from,
                tenantId,
              );

            if (customer) {
              await this.whapiService.processLocationShare(
                customer._id.toString(),
                msg.location,
                tenantId,
              );
              this.logger.log(`📍 Location saved for customer ${customer._id}`);
            }
          } catch (error) {
            this.logger.error(
              `Failed to process location share: ${error.message}`,
              error.stack,
            );
          }
        }
      }
    }
  }

  async findOrCreateConversation(
    tenantId: string,
    customerPhoneNumber: string,
  ): Promise<ConversationDocument> {
    const tenantObjectId = new Types.ObjectId(tenantId);
    let conversation = await this.conversationModel
      .findOne({ tenantId, customerPhoneNumber })
      .exec();

    if (!conversation) {
      const existingCustomer = await this.customerModel
        .findOne({ tenantId: tenantObjectId, phone: customerPhoneNumber })
        .select("_id")
        .lean();

      if (!existingCustomer) {
        this.logger.log(
          `Creating new conversation and customer for ${customerPhoneNumber} in tenant ${tenantId}`,
        );
      } else {
        this.logger.log(
          `Creating new conversation for existing customer ${existingCustomer._id} (${customerPhoneNumber}) in tenant ${tenantId}`,
        );
      }

      conversation = new this.conversationModel({
        tenantId,
        customerPhoneNumber,
        messages: [],
        customerId: existingCustomer?._id,
      });
      await conversation.save();
    }

    return conversation;
  }

  private async scheduleAssistantJob(
    tenant: TenantDocument,
    conversation: ConversationDocument,
    message: MessageDocument,
  ): Promise<void> {
    if (!tenant.aiAssistant?.autoReplyEnabled) {
      return;
    }

    const jobData: AssistantMessageJobData = {
      tenantId: tenant.id?.toString(),
      conversationId: conversation._id.toString(),
      customerPhoneNumber: conversation.customerPhoneNumber,
      messageId: message._id.toString(),
      content: message.content,
    };

    try {
      const enqueued =
        await this.assistantQueueService.enqueueAssistantMessage(jobData);

      if (enqueued) {
        this.chatGateway.emitAssistantStatus(tenant.id, {
          conversationId: jobData.conversationId,
          status: "queued",
          customerMessageId: jobData.messageId,
        });
      } else {
        await this.processAssistantJob(jobData);
      }
    } catch (error) {
      this.logger.error(
        `Failed to enqueue assistant job for tenant ${tenant.id}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      this.chatGateway.emitAssistantStatus(tenant.id, {
        conversationId: jobData.conversationId,
        status: "failed",
        customerMessageId: jobData.messageId,
        note: (error as Error).message,
      });
    }
  }

  async processAssistantJob(data: AssistantMessageJobData): Promise<void> {
    const { tenantId, conversationId, messageId, content } = data;

    try {
      const tenant = await this.tenantModel.findById(tenantId).exec();
      if (!tenant) {
        this.logger.warn(
          `Assistant job skipped: tenant ${tenantId} not found.`,
        );
        this.chatGateway.emitAssistantStatus(tenantId, {
          conversationId,
          status: "failed",
          customerMessageId: messageId,
          note: "tenant_not_found",
        });
        return;
      }

      if (!tenant.aiAssistant?.autoReplyEnabled) {
        this.logger.debug(
          `Assistant auto-reply disabled for tenant ${tenantId}; skipping job.`,
        );
        this.chatGateway.emitAssistantStatus(tenantId, {
          conversationId,
          status: "completed",
          customerMessageId: messageId,
          note: "auto_reply_disabled",
        });
        return;
      }

      const conversation = await this.conversationModel
        .findById(conversationId)
        .exec();
      if (!conversation) {
        this.logger.warn(
          `Assistant job skipped: conversation ${conversationId} not found.`,
        );
        this.chatGateway.emitAssistantStatus(tenantId, {
          conversationId,
          status: "failed",
          customerMessageId: messageId,
          note: "conversation_not_found",
        });
        return;
      }

      this.chatGateway.emitAssistantStatus(tenantId, {
        conversationId,
        status: "processing",
        customerMessageId: messageId,
      });

      const result = await this.generateAssistantReply(
        tenant,
        conversation,
        content,
        messageId,
      );

      this.chatGateway.emitAssistantStatus(tenantId, {
        conversationId,
        status: "completed",
        customerMessageId: messageId,
        assistantMessageId: result.assistantMessage
          ? result.assistantMessage._id.toString()
          : undefined,
        note: result.note,
      });
    } catch (error) {
      this.logger.error(
        `Assistant job failed for tenant ${tenantId}, conversation ${conversationId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      this.chatGateway.emitAssistantStatus(tenantId, {
        conversationId,
        status: "failed",
        customerMessageId: messageId,
        note: (error as Error).message,
      });
    }
  }

  private async generateAssistantReply(
    tenant: TenantDocument,
    conversation: ConversationDocument,
    customerMessage: string,
    customerMessageId?: string,
  ): Promise<{ assistantMessage?: MessageDocument; note?: string }> {
    if (!tenant.aiAssistant?.autoReplyEnabled) {
      return { note: "auto_reply_disabled" };
    }

    try {

      const knowledgeBaseTenantId =
        tenant.aiAssistant?.knowledgeBaseTenantId?.trim() ||
        tenant.id.toString();

      const capabilities = tenant.aiAssistant?.capabilities
        ? JSON.parse(JSON.stringify(tenant.aiAssistant.capabilities))
        : undefined;

      this.logger.log(
        `[DEBUG] Tenant ${tenant.id} AI settings: ${JSON.stringify({
          autoReplyEnabled: tenant.aiAssistant?.autoReplyEnabled,
          model: tenant.aiAssistant?.model,
          capabilities: capabilities,
        })}`,
      );

      const SESSION_TIMEOUT_MINUTES = 30;

      const allRecentMessages = await this.messageModel
        .find({ conversationId: conversation._id })
        .sort({ createdAt: -1 })
        .limit(50)
        .exec();

      const currentSessionMessages: MessageDocument[] = [];
      let lastMessageTime: Date | null = null;

      for (const msg of allRecentMessages) {
        if (lastMessageTime) {
          const timeDiffMinutes =
            (lastMessageTime.getTime() - msg.createdAt.getTime()) / (1000 * 60);

          if (timeDiffMinutes > SESSION_TIMEOUT_MINUTES) {
            this.logger.log(
              `🔄 Session boundary detected: ${timeDiffMinutes.toFixed(1)} minutes gap`,
            );
            break;
          }
        }

        currentSessionMessages.push(msg);
        lastMessageTime = msg.createdAt;
      }

      const history = currentSessionMessages
        .slice(1)
        .reverse()
        .map((msg) => ({
          role: (msg.sender === SenderType.CUSTOMER ? "user" : "assistant") as
            | "user"
            | "assistant",
          content: msg.content,
          timestamp: msg.createdAt,
        }));

      this.logger.log(
        `📜 Current session: ${currentSessionMessages.length} messages (${history.length} in history context)`,
      );

      const assistantResponse = await this.assistantService.answerQuestion({
        tenantId: tenant.id,
        question: customerMessage,
        knowledgeBaseTenantId,
        conversationHistory: history,
        conversationSummary: conversation.summary,
        aiSettings: {
          model: tenant.aiAssistant?.model,
          capabilities: capabilities,
        },
      });

      const answer = assistantResponse?.answer?.trim();
      if (!answer) {
        this.logger.warn(
          `Assistant returned an empty answer for tenant ${tenant.id} (message ${customerMessageId || "n/a"}).`,
        );
        return { note: "assistant_empty_answer" };
      }

      if (
        !assistantResponse.usedFallback &&
        !assistantResponse?.sources?.length &&
        !assistantResponse.usedTools
      ) {
        this.logger.log(
          `Assistant response for tenant ${tenant.id} lacks contextual sources. Skipping auto-reply (message ${customerMessageId || "n/a"}).`,
        );
        return { note: "no_verified_context" };
      }

      const metadata = {
        sources: assistantResponse.sources,
        usedFallback: assistantResponse.usedFallback,
        usedTools: assistantResponse.usedTools,
        action: assistantResponse.action,
        data: assistantResponse.data,
      };

      const assistantMessage = await this.saveMessage(
        conversation,
        tenant.id,
        answer,
        SenderType.ASSISTANT,
        metadata,
      );

      this.chatGateway.emitNewMessage(tenant.id, assistantMessage);

      await this.whapiService.sendWhatsAppMessage(
        tenant.id,
        conversation.customerPhoneNumber,
        answer,
      );

      await this.updateConversationSummary(conversation._id);

      return { assistantMessage };
    } catch (error) {
      this.logger.error(
        `Assistant auto-reply failed for tenant ${tenant.id} (message ${customerMessageId || "n/a"}): ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error;
    }
  }

  private async updateConversationSummary(
    conversationId: Types.ObjectId,
  ): Promise<void> {
    const recentMessages = await this.messageModel
      .find({ conversationId })
      .sort({ createdAt: -1 })
      .limit(12)
      .lean();

    if (!recentMessages.length) {
      return;
    }

    const summaryLines = recentMessages
      .slice()
      .reverse()
      .map((msg) => {
        let speaker = "Equipo";
        if (msg.sender === SenderType.CUSTOMER) {
          speaker = "Cliente";
        } else if (msg.sender === SenderType.ASSISTANT) {
          speaker = "Asistente";
        }
        return `${speaker}: ${msg.content}`;
      });

    const summary = summaryLines.join(" | ");
    const trimmedSummary =
      summary.length > 1800 ? summary.slice(summary.length - 1800) : summary;

    await this.conversationModel
      .updateOne(
        { _id: conversationId },
        {
          $set: {
            summary: trimmedSummary,
            summaryUpdatedAt: new Date(),
          },
        },
      )
      .exec();
  }

  private async saveMessage(
    conversation: ConversationDocument,
    tenantId: string,
    content: string,
    sender: SenderType,
    metadata?: Record<string, any>,
  ): Promise<MessageDocument> {
    const payload: any = {
      tenantId: new Types.ObjectId(tenantId),
      conversationId: conversation._id,
      content,
      sender,
    };

    if (metadata && Object.keys(metadata).length > 0) {
      payload.metadata = metadata;
    }

    const newMessage = new this.messageModel(payload);

    const savedMessage = await newMessage.save();
    conversation.messages.push(savedMessage._id);
    await conversation.save();

    this.logger.log(
      `Saved new message from ${sender} to conversation ${conversation._id}`,
    );
    return savedMessage;
  }
}



