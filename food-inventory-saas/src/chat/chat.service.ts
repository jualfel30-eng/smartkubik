import { Injectable, Logger, NotFoundException, InternalServerErrorException, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Conversation, ConversationDocument } from './schemas/conversation.schema';
import { Message, MessageDocument, SenderType } from './schemas/message.schema';
import { Tenant, TenantDocument } from '../schemas/tenant.schema';
import { ChatGateway } from './chat.gateway';
import { ConfigService } from '@nestjs/config';
import { SuperAdminService } from '../modules/super-admin/super-admin.service';
import { Configuration, UsersApi, ChannelApi, MessagesApi, SendMessageTextRequest, SenderText, EventTypeEnum } from '../lib/whapi-sdk/whapi-sdk-typescript-fetch';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    @Inject(forwardRef(() => ChatGateway)) 
    private readonly chatGateway: ChatGateway,
    private readonly configService: ConfigService,
    private readonly superAdminService: SuperAdminService,
  ) {}

  async generateQrCode(tenantId: string): Promise<{ qrCode: string }> {
    this.logger.log(`Generating QR code for tenant: ${tenantId}`);
    
    const masterTokenSetting = await this.superAdminService.getSetting('WHAPI_MASTER_TOKEN');
    const centralApiToken = masterTokenSetting?.value;

    if (!centralApiToken) {
      this.logger.error('Central WHAPI_MASTER_TOKEN is not configured in Super Admin settings.');
      throw new InternalServerErrorException('Chat service is not configured.');
    }

    try {
      const config = new Configuration({ accessToken: centralApiToken });
      const usersApi = new UsersApi(config);
      
      const response = await usersApi.loginUser();

      if (!response.base64) {
        throw new InternalServerErrorException('Whapi did not return a QR code.');
      }
      
      // TODO: The logic for obtaining and saving a new channel token was flawed.
      // The loginUser method only returns a QR code for linking, not a new token.
      // The token management strategy needs to be revisited. For now, we are only returning the QR code.
      this.logger.warn(`Token acquisition logic in generateQrCode needs review. Only returning QR code.`);

      return { qrCode: response.base64 };

    } catch (error) {
      this.logger.error(`Failed to generate QR code from Whapi: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error communicating with WhatsApp provider.');
    }
  }

  async configureWebhook(tenantId: string): Promise<{ success: boolean }> {
    this.logger.log(`Configuring webhook for tenant: ${tenantId}`);
    
    const tenant = await this.tenantModel.findById(tenantId).exec();
    if (!tenant || !tenant.whapiToken) {
      throw new NotFoundException('Tenant not found or WhatsApp token is missing.');
    }

    const baseUrl = this.configService.get<string>('API_BASE_URL');
    if (!baseUrl) {
      this.logger.error('API_BASE_URL is not configured.');
      throw new InternalServerErrorException('Server base URL is not configured.');
    }

    const webhookUrl = `${baseUrl}/chat/whapi-webhook?tenantId=${tenantId}`;

    try {
      const config = new Configuration({ accessToken: tenant.whapiToken });
      const channelApi = new ChannelApi(config);

      await channelApi.updateChannelSettings({ settings: { webhooks: [{ url: webhookUrl, events: [{ type: EventTypeEnum.Messages }] }] } });

      this.logger.log(`Successfully configured webhook for tenant ${tenantId} to: ${webhookUrl}`);
      return { success: true };

    } catch (error) {
      this.logger.error(`Failed to configure webhook with Whapi: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error communicating with WhatsApp provider.');
    }
  }

  async getConversations(tenantId: string): Promise<ConversationDocument[]> {
    this.logger.log(`Fetching conversations for tenant: ${tenantId}`);
    return this.conversationModel
      .find({ tenantId: new Types.ObjectId(tenantId) })
      .sort({ updatedAt: -1 })
      .populate({
        path: 'messages',
        options: { sort: { createdAt: -1 }, limit: 1 }
      })
      .exec();
  }

  async getMessagesForConversation(conversationId: string, tenantId: string): Promise<MessageDocument[]> {
    this.logger.log(`Fetching messages for conversation ${conversationId} in tenant ${tenantId}`);
    const conversation = await this.conversationModel.findById(conversationId).exec();

    if (!conversation || conversation.tenantId.toString() !== tenantId) {
      throw new UnauthorizedException('You do not have access to this conversation.');
    }

    return this.messageModel
      .find({ conversationId: conversation._id })
      .sort({ createdAt: 'asc' })
      .exec();
  }

  async sendOutgoingMessage(data: { conversationId: string; content: string }, tenantId: string): Promise<void> {
    this.logger.log(`Handling outgoing message for conversation ${data.conversationId} in tenant ${tenantId}`);

    const tenant = await this.tenantModel.findById(tenantId).exec();
    if (!tenant || !tenant.whapiToken) {
        throw new InternalServerErrorException('WhatsApp is not configured for this tenant.');
    }

    const conversation = await this.conversationModel.findById(data.conversationId).exec();
    if (!conversation || conversation.tenantId.toString() !== tenantId) {
      throw new NotFoundException('Conversation not found');
    }

    const savedMessage = await this.saveMessage(conversation, tenantId, data.content, SenderType.USER);
    this.chatGateway.emitNewMessage(tenantId, savedMessage);

    try {
      const config = new Configuration({ accessToken: tenant.whapiToken });
      const messagesApi = new MessagesApi(config);
      
      const sendMessageTextRequest: SendMessageTextRequest = {
        senderText: {
          to: conversation.customerPhoneNumber,
          body: data.content,
        }
      };

      await messagesApi.sendMessageText(sendMessageTextRequest);

      this.logger.log(`Successfully sent message to ${conversation.customerPhoneNumber} via Whapi SDK`);

    } catch (error) {
      this.logger.error(`Failed to send message via Whapi SDK: ${error.message}`, error.stack);
    }
  }

  async handleIncomingMessage(payload: any, tenantId: string): Promise<void> {
    this.logger.log(`Handling incoming message for tenant: ${tenantId}`);
    
    if (payload.messages) {
      for (const msg of payload.messages) {
        if (msg.from && msg.text) {
          const customerPhoneNumber = msg.from;
          const content = msg.text.body;

          const conversation = await this.findOrCreateConversation(tenantId, customerPhoneNumber);
          const savedMessage = await this.saveMessage(conversation, tenantId, content, SenderType.CUSTOMER);
          
          this.chatGateway.emitNewMessage(tenantId, savedMessage);
        }
      }
    }
  }

  private async findOrCreateConversation(tenantId: string, customerPhoneNumber: string): Promise<ConversationDocument> {
    let conversation = await this.conversationModel.findOne({ tenantId: new Types.ObjectId(tenantId), customerPhoneNumber }).exec();

    if (!conversation) {
      this.logger.log(`Creating new conversation for ${customerPhoneNumber} in tenant ${tenantId}`);
      conversation = new this.conversationModel({ tenantId, customerPhoneNumber, messages: [] });
      await conversation.save();
    }

    return conversation;
  }

  private async saveMessage(conversation: ConversationDocument, tenantId: string, content: string, sender: SenderType): Promise<MessageDocument> {
    const newMessage = new this.messageModel({
      tenantId: new Types.ObjectId(tenantId),
      conversationId: conversation._id,
      content,
      sender,
    });

    const savedMessage = await newMessage.save();
    conversation.messages.push(savedMessage._id);
    await conversation.save();

    this.logger.log(`Saved new message from ${sender} to conversation ${conversation._id}`);
    return savedMessage;
  }
}
