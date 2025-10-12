import { Injectable, Logger, NotFoundException, InternalServerErrorException, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Conversation, ConversationDocument } from './schemas/conversation.schema';
import { Message, MessageDocument, SenderType } from './schemas/message.schema';
import { ChatGateway } from './chat.gateway';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @Inject(forwardRef(() => ChatGateway)) 
    private readonly chatGateway: ChatGateway,
    private readonly configService: ConfigService,
  ) {}

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

    const conversation = await this.conversationModel.findById(data.conversationId).exec();
    if (!conversation || conversation.tenantId !== tenantId) {
      throw new NotFoundException('Conversation not found');
    }

    // 1. Save the message to the DB first
    const savedMessage = await this.saveMessage(conversation, tenantId, data.content, SenderType.USER);

    // 2. Emit the message to the frontend immediately for a snappy UI
    this.chatGateway.emitNewMessage(tenantId, savedMessage);

    // 3. Send the message via Whapi API
    const apiToken = this.configService.get<string>('WHAPI_API_TOKEN');
    if (!apiToken) {
      this.logger.error('WHAPI_API_TOKEN is not configured.');
      // Optionally, update message status to 'failed'
      throw new InternalServerErrorException('Chat service is not configured.');
    }

    try {
      const url = 'https://gate.whapi.cloud/messages/text';
      const body = {
        to: conversation.customerPhoneNumber,
        body: data.content,
      };
      const headers = {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      };

      await axios.post(url, body, { headers });
      this.logger.log(`Successfully sent message to ${conversation.customerPhoneNumber} via Whapi`);

    } catch (error) {
      this.logger.error(`Failed to send message via Whapi: ${error.message}`, error.stack);
      // Here you could implement a retry mechanism or mark the message as failed in the database
      // For now, we just log the error.
      // We don't re-throw the error because the message is already saved and sent to the frontend.
      // We want to avoid the client seeing an error if the message is already in their chat history.
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
