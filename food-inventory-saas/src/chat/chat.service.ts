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
} from "../lib/whapi-sdk/whapi-sdk-typescript-fetch";
import { AssistantService } from "../modules/assistant/assistant.service";
import { WhapiService } from "../modules/whapi/whapi.service";

interface QueuedMessage {
  tenant: TenantDocument;
  conversation: ConversationDocument;
  content: string;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly messageQueues = new Map<string, QueuedMessage[]>();
  private readonly processingQueues = new Map<string, boolean>();

  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
    private readonly configService: ConfigService,
    private readonly superAdminService: SuperAdminService,
    private readonly assistantService: AssistantService,
    private readonly whapiService: WhapiService,
  ) {}

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
    const accessToken = await this.resolveWhapiToken(tenant);

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
    const accessToken = await this.resolveWhapiToken(tenant);

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

    await this.dispatchWhatsAppTextMessage(
      accessToken,
      conversation.customerPhoneNumber,
      data.content,
      "manual",
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
        if (msg?.fromMe) {
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

          // Queue the message for processing instead of blocking
          this.enqueueMessage(tenant, conversation, content);
        }

        // Handle location sharing
        if (msg.type === 'location' && msg.location && msg.from) {
          try {
            const chatId = msg.chat_id || msg.chatId || msg.from;
            const customer = await this.whapiService.getCustomerByWhatsAppNumber(
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

  private async findOrCreateConversation(
    tenantId: string,
    customerPhoneNumber: string,
  ): Promise<ConversationDocument> {
    let conversation = await this.conversationModel
      .findOne({ tenantId: new Types.ObjectId(tenantId), customerPhoneNumber })
      .exec();

    if (!conversation) {
      this.logger.log(
        `Creating new conversation for ${customerPhoneNumber} in tenant ${tenantId}`,
      );
      conversation = new this.conversationModel({
        tenantId,
        customerPhoneNumber,
        messages: [],
      });
      await conversation.save();
    }

    return conversation;
  }

  private async maybeRespondWithAssistant(
    tenant: TenantDocument,
    conversation: ConversationDocument,
    customerMessage: string,
  ): Promise<void> {
    if (!tenant.aiAssistant?.autoReplyEnabled) {
      return;
    }

    try {
      const accessToken = await this.resolveWhapiToken(tenant);
      const knowledgeBaseTenantId =
        tenant.aiAssistant?.knowledgeBaseTenantId?.trim() ||
        tenant.id.toString();

      // Convertir capabilities a objeto plano para evitar problemas con Mongoose
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

      // Get conversation history for CURRENT SESSION only
      // A session starts when there's a gap of more than 30 minutes from previous message
      const SESSION_TIMEOUT_MINUTES = 30;

      // Get all recent messages
      const allRecentMessages = await this.messageModel
        .find({ conversationId: conversation._id })
        .sort({ createdAt: -1 })
        .limit(50) // Get last 50 to find session boundary
        .exec();

      // Find the start of current session (work backwards from most recent)
      const currentSessionMessages: MessageDocument[] = [];
      let lastMessageTime: Date | null = null;

      for (const msg of allRecentMessages) {
        if (lastMessageTime) {
          const timeDiffMinutes = (lastMessageTime.getTime() - msg.createdAt.getTime()) / (1000 * 60);

          // If gap is more than 30 minutes, this is a previous session - stop here
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

      // Format history as array of messages (reverse to get chronological order)
      // Exclude the current message (most recent) from history
      const history = currentSessionMessages
        .slice(1) // Skip the first (most recent) message as it's the current one
        .reverse()
        .map((msg) => ({
          role: (msg.sender === SenderType.CUSTOMER ? 'user' : 'assistant') as 'user' | 'assistant',
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
        conversationHistory: history, // NEW: Pass conversation history
        aiSettings: {
          model: tenant.aiAssistant?.model,
          capabilities: capabilities,
        },
      });

      const answer = assistantResponse?.answer?.trim();
      if (!answer) {
        this.logger.warn(
          `Assistant returned an empty answer for tenant ${tenant.id}.`,
        );
        return;
      }

      const metadata = {
        sources: assistantResponse.sources,
        usedFallback: assistantResponse.usedFallback,
        usedTools: assistantResponse.usedTools,
      };

      if (
        !assistantResponse.usedFallback &&
        !assistantResponse?.sources?.length &&
        !assistantResponse.usedTools
      ) {
        this.logger.log(
          `Assistant response for tenant ${tenant.id} lacks contextual sources. Skipping auto-reply.`,
        );
        return;
      }

      const assistantMessage = await this.saveMessage(
        conversation,
        tenant.id,
        answer,
        SenderType.ASSISTANT,
        metadata,
      );

      this.chatGateway.emitNewMessage(tenant.id, assistantMessage);

      await this.dispatchWhatsAppTextMessage(
        accessToken,
        conversation.customerPhoneNumber,
        answer,
        "assistant",
      );
    } catch (error) {
      this.logger.error(
        `Assistant auto-reply failed for tenant ${tenant.id}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Adds a message to the conversation queue for async processing.
   * Each conversation has its own queue to maintain message order and context.
   */
  private enqueueMessage(
    tenant: TenantDocument,
    conversation: ConversationDocument,
    content: string,
  ): void {
    const queueKey = `${tenant.id}:${conversation.customerPhoneNumber}`;

    if (!this.messageQueues.has(queueKey)) {
      this.messageQueues.set(queueKey, []);
    }

    const queue = this.messageQueues.get(queueKey)!;
    queue.push({ tenant, conversation, content });

    this.logger.log(
      `📨 Message enqueued for ${conversation.customerPhoneNumber}. Queue size: ${queue.length}`,
    );

    // Start processing if not already processing
    if (!this.processingQueues.get(queueKey)) {
      this.processQueue(queueKey).catch((err) => {
        this.logger.error(
          `Error processing queue for ${queueKey}: ${err.message}`,
          err.stack,
        );
      });
    }
  }

  /**
   * Processes messages in a conversation queue sequentially.
   * This ensures messages are handled in order and context is preserved.
   */
  private async processQueue(queueKey: string): Promise<void> {
    this.processingQueues.set(queueKey, true);

    try {
      while (true) {
        const queue = this.messageQueues.get(queueKey);
        if (!queue || queue.length === 0) {
          break;
        }

        const message = queue.shift()!;
        this.logger.log(
          `⚙️ Processing message for ${message.conversation.customerPhoneNumber}. Remaining in queue: ${queue.length}`,
        );

        await this.maybeRespondWithAssistant(
          message.tenant,
          message.conversation,
          message.content,
        );
      }
    } finally {
      this.processingQueues.set(queueKey, false);

      // Clean up empty queues
      const queue = this.messageQueues.get(queueKey);
      if (queue && queue.length === 0) {
        this.messageQueues.delete(queueKey);
        this.processingQueues.delete(queueKey);
      }
    }
  }

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

  private async dispatchWhatsAppTextMessage(
    accessToken: string,
    recipientPhone: string,
    body: string,
    context: "manual" | "assistant",
  ): Promise<void> {
    try {
      const config = new Configuration({ accessToken });
      const messagesApi = new MessagesApi(config);
      const sendMessageTextRequest: SendMessageTextRequest = {
        senderText: {
          to: recipientPhone,
          body,
        },
      };

      await messagesApi.sendMessageText(sendMessageTextRequest);
      this.logger.log(
        `[${context}] Successfully sent message to ${recipientPhone} via Whapi SDK`,
      );
    } catch (error) {
      this.logger.error(
        `[${context}] Failed to send message via Whapi SDK: ${error.message}`,
        error.stack,
      );
    }
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
