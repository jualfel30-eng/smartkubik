import { Injectable, Logger, NotFoundException, InternalServerErrorException, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Conversation, ConversationDocument } from './schemas/conversation.schema';
import { Message, MessageDocument, SenderType } from './schemas/message.schema';
import { Tenant, TenantDocument } from '../schemas/tenant.schema';
import { ChatGateway } from './chat.gateway';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { SuperAdminService } from '../modules/super-admin/super-admin.service';

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
      const url = 'https://gate.whapi.cloud/users/login';
      const headers = { 'Authorization': `Bearer ${centralApiToken}` };
      
      const response = await axios.get(url, { headers });
      const { qr_code, token: newChannelToken } = response.data;

      if (!newChannelToken) {
        throw new InternalServerErrorException('Whapi did not return a token for the new channel.');
      }

      // Save the new token to the tenant
      await this.tenantModel.updateOne(
        { _id: new Types.ObjectId(tenantId) },
        { $set: { whapiToken: newChannelToken } }
      ).exec();

      this.logger.log(`Successfully saved new Whapi token for tenant ${tenantId}`);

      return { qrCode: qr_code };

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
      const url = 'https://gate.whapi.cloud/settings';
      const body = { webhookUrl };
      const headers = {
        'Authorization': `Bearer ${tenant.whapiToken}`,
        'Content-Type': 'application/json',
      };

      await axios.patch(url, body, { headers });

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
      .find({ tenantId })
      .sort({ updatedAt: -1 })
      .populate({
        path: 'messages',
        options: { sort: { createdAt: -1 }, limit: 1 } // Populate only the last message
      })
      .exec();
  }

  async getMessagesForConversation(conversationId: string, tenantId: string): Promise<MessageDocument[]> {
    this.logger.log(`Fetching messages for conversation ${conversationId} in tenant ${tenantId}`);
    const conversation = await this.conversationModel.findById(conversationId).exec();

    if (!conversation || conversation.tenantId !== tenantId) {
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
    if (!conversation || conversation.tenantId !== tenantId) {
      throw new NotFoundException('Conversation not found');
    }

    // 1. Save the message to the DB first
    const savedMessage = await this.saveMessage(conversation, tenantId, data.content, SenderType.USER);

    // 2. Emit the message to the frontend immediately for a snappy UI
    this.chatGateway.emitNewMessage(tenantId, savedMessage);

    // 3. Send the message via Whapi API using the tenant-specific token
    try {
      const url = 'https://gate.whapi.cloud/messages/text';
      const body = {
        to: conversation.customerPhoneNumber,
        body: data.content,
      };
      const headers = {
        'Authorization': `Bearer ${tenant.whapiToken}`,
        'Content-Type': 'application/json',
      };

      await axios.post(url, body, { headers });
      this.logger.log(`Successfully sent message to ${conversation.customerPhoneNumber} via Whapi`);

    } catch (error) {
      this.logger.error(`Failed to send message via Whapi: ${error.message}`, error.stack);
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
    let conversation = await this.conversationModel.findOne({ tenantId, customerPhoneNumber }).exec();

    if (!conversation) {
      this.logger.log(`Creating new conversation for ${customerPhoneNumber} in tenant ${tenantId}`);
      conversation = new this.conversationModel({ tenantId, customerPhoneNumber, messages: [] });
      await conversation.save();
    }

    return conversation;
  }

  private async saveMessage(conversation: ConversationDocument, tenantId: string, content: string, sender: SenderType): Promise<MessageDocument> {
    const newMessage = new this.messageModel({
      tenantId,
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
