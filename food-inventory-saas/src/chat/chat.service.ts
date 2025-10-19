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

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

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

          await this.maybeRespondWithAssistant(tenant, conversation, content);
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

      const assistantResponse = await this.assistantService.answerQuestion({
        tenantId: tenant.id,
        question: customerMessage,
        knowledgeBaseTenantId,
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
