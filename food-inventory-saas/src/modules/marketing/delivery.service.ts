import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  MessageDelivery,
  MessageDeliveryDocument,
} from "../../schemas/message-delivery.schema";
import { NotificationsService } from "../notifications/notifications.service";
import { TemplateService } from "./template.service";
import {
  CreateMessageDeliveryDto,
  UpdateDeliveryStatusDto,
  GetDeliveriesQueryDto,
  BulkSendDto,
} from "../../dto/message-delivery.dto";

/**
 * PHASE 7: EMAIL/SMS TEMPLATES & DELIVERY SYSTEM
 * DeliveryService - Gestión de cola de envíos y tracking
 */

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    @InjectModel(MessageDelivery.name)
    private deliveryModel: Model<MessageDeliveryDocument>,
    private readonly notificationsService: NotificationsService,
    private readonly templateService: TemplateService,
  ) {}

  /**
   * Queue a message for delivery
   */
  async queueMessage(
    tenantId: string,
    createDto: CreateMessageDeliveryDto,
  ): Promise<MessageDeliveryDocument> {
    const delivery = new this.deliveryModel({
      ...createDto,
      tenantId: new Types.ObjectId(tenantId),
      customerId: new Types.ObjectId(createDto.customerId),
      templateId: createDto.templateId
        ? new Types.ObjectId(createDto.templateId)
        : undefined,
      campaignId: createDto.campaignId
        ? new Types.ObjectId(createDto.campaignId)
        : undefined,
      marketingCampaignId: createDto.marketingCampaignId
        ? new Types.ObjectId(createDto.marketingCampaignId)
        : undefined,
      status: "queued",
      queuedAt: new Date(),
      canRetry: true,
    });

    const saved = await delivery.save();
    this.logger.log(
      `Message queued: ${saved.channel} to ${saved.recipient} (${saved._id})`,
    );

    // Start sending immediately (async)
    this.sendMessage(tenantId, saved._id.toString()).catch((error) => {
      this.logger.error(
        `Failed to send message ${saved._id}: ${error.message}`,
      );
    });

    return saved;
  }

  /**
   * Send a queued message
   */
  async sendMessage(
    tenantId: string,
    deliveryId: string,
  ): Promise<MessageDeliveryDocument> {
    const delivery = await this.deliveryModel
      .findOne({
        _id: new Types.ObjectId(deliveryId),
        tenantId: new Types.ObjectId(tenantId),
      })
      .exec();

    if (!delivery) {
      throw new Error("Delivery not found");
    }

    if (delivery.status !== "queued" && delivery.status !== "failed") {
      this.logger.warn(
        `Cannot send message ${deliveryId}: status is ${delivery.status}`,
      );
      return delivery;
    }

    try {
      // Update status to sending
      delivery.status = "sent";
      delivery.sentAt = new Date();

      // Send via NotificationsService
      const results = await this.notificationsService.sendTemplateNotification(
        {
          tenantId,
          customerId: delivery.customerId.toString(),
          templateId: delivery.templateId?.toString() || "generic",
          channels: [delivery.channel as "email" | "sms" | "whatsapp"],
          context: delivery.metadata || {},
          customerEmail:
            delivery.channel === "email" ? delivery.recipient : null,
          customerPhone:
            delivery.channel === "sms" ? delivery.recipient : null,
          whatsappChatId:
            delivery.channel === "whatsapp" ? delivery.recipient : null,
        },
        {
          engagementDelta: 3,
        },
      );

      const result = results.find((r) => r.channel === delivery.channel);

      if (result && result.success) {
        delivery.status = "delivered";
        delivery.deliveredAt = new Date();
        delivery.provider = this.getProviderName(delivery.channel);
      } else {
        delivery.status = "failed";
        delivery.failedAt = new Date();
        delivery.errorMessage = result?.error || "Unknown error";
        delivery.canRetry = true;
      }

      await delivery.save();

      // Increment template usage
      if (delivery.templateId) {
        await this.templateService.incrementUsage(
          tenantId,
          delivery.templateId.toString(),
        );
      }

      return delivery;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      delivery.status = "failed";
      delivery.failedAt = new Date();
      delivery.errorMessage = message;
      delivery.canRetry = true;
      await delivery.save();

      throw error;
    }
  }

  /**
   * Retry failed messages
   */
  async retryDelivery(
    tenantId: string,
    deliveryId: string,
  ): Promise<MessageDeliveryDocument> {
    const delivery = await this.deliveryModel
      .findOne({
        _id: new Types.ObjectId(deliveryId),
        tenantId: new Types.ObjectId(tenantId),
      })
      .exec();

    if (!delivery) {
      throw new Error("Delivery not found");
    }

    if (delivery.status !== "failed") {
      throw new Error("Only failed messages can be retried");
    }

    if (!delivery.canRetry) {
      throw new Error("Message cannot be retried (max retries reached)");
    }

    if (delivery.retryCount >= delivery.maxRetries) {
      delivery.canRetry = false;
      await delivery.save();
      throw new Error(
        `Max retries (${delivery.maxRetries}) reached for message ${deliveryId}`,
      );
    }

    delivery.retryCount += 1;
    delivery.lastRetryAt = new Date();
    delivery.status = "queued";
    await delivery.save();

    this.logger.log(
      `Retrying delivery ${deliveryId} (attempt ${delivery.retryCount}/${delivery.maxRetries})`,
    );

    return this.sendMessage(tenantId, deliveryId);
  }

  /**
   * Bulk send messages with rate limiting
   */
  async bulkSend(
    tenantId: string,
    bulkDto: BulkSendDto,
  ): Promise<{
    queued: number;
    failed: number;
    deliveryIds: string[];
  }> {
    const rateLimit = bulkDto.rateLimit || 10; // Default: 10 messages/second
    const delayMs = 1000 / rateLimit;

    let queued = 0;
    let failed = 0;
    const deliveryIds: string[] = [];

    this.logger.log(
      `Bulk send started: ${bulkDto.recipients.length} messages, rate limit: ${rateLimit}/s`,
    );

    for (const recipient of bulkDto.recipients) {
      try {
        const delivery = await this.queueMessage(tenantId, {
          customerId: recipient.customerId,
          recipient: recipient.recipient,
          channel: bulkDto.channel,
          subject: bulkDto.subject,
          message: bulkDto.message || "",
          templateId: bulkDto.templateId,
          campaignId: bulkDto.campaignId,
          metadata: recipient.context,
        });

        deliveryIds.push(delivery._id.toString());
        queued++;

        // Rate limiting delay
        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Failed to queue message for ${recipient.recipient}: ${message}`,
        );
        failed++;
      }
    }

    this.logger.log(
      `Bulk send completed: ${queued} queued, ${failed} failed`,
    );

    return { queued, failed, deliveryIds };
  }

  /**
   * Get delivery by ID
   */
  async findById(
    tenantId: string,
    deliveryId: string,
  ): Promise<MessageDeliveryDocument> {
    const delivery = await this.deliveryModel
      .findOne({
        _id: new Types.ObjectId(deliveryId),
        tenantId: new Types.ObjectId(tenantId),
      })
      .exec();

    if (!delivery) {
      throw new Error("Delivery not found");
    }

    return delivery;
  }

  /**
   * Get deliveries with filters
   */
  async findAll(
    tenantId: string,
    query: GetDeliveriesQueryDto,
  ): Promise<{ deliveries: MessageDelivery[]; total: number }> {
    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
    };

    if (query.status) {
      filter.status = query.status;
    }

    if (query.channel) {
      filter.channel = query.channel;
    }

    if (query.campaignId) {
      filter.$or = [
        { campaignId: new Types.ObjectId(query.campaignId) },
        { marketingCampaignId: new Types.ObjectId(query.campaignId) },
      ];
    }

    if (query.customerId) {
      filter.customerId = new Types.ObjectId(query.customerId);
    }

    if (query.templateId) {
      filter.templateId = new Types.ObjectId(query.templateId);
    }

    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) {
        filter.createdAt.$gte = query.startDate;
      }
      if (query.endDate) {
        filter.createdAt.$lte = query.endDate;
      }
    }

    if (query.failedOnly) {
      filter.status = "failed";
    }

    if (query.canRetry !== undefined) {
      filter.canRetry = query.canRetry;
    }

    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const [deliveries, total] = await Promise.all([
      this.deliveryModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.deliveryModel.countDocuments(filter).exec(),
    ]);

    return { deliveries, total };
  }

  /**
   * Get delivery statistics
   */
  async getStats(
    tenantId: string,
    campaignId?: string,
    channel?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byChannel: Record<string, number>;
    deliveryRate: number;
    avgDeliveryTime: number;
    failedCount: number;
    retryableCount: number;
  }> {
    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
    };

    if (campaignId) {
      filter.$or = [
        { campaignId: new Types.ObjectId(campaignId) },
        { marketingCampaignId: new Types.ObjectId(campaignId) },
      ];
    }

    if (channel) {
      filter.channel = channel;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = startDate;
      if (endDate) filter.createdAt.$lte = endDate;
    }

    const [total, byStatus, byChannel, deliveredMessages] = await Promise.all([
      this.deliveryModel.countDocuments(filter).exec(),
      this.deliveryModel.aggregate([
        { $match: filter },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      this.deliveryModel.aggregate([
        { $match: filter },
        { $group: { _id: "$channel", count: { $sum: 1 } } },
      ]),
      this.deliveryModel
        .find({
          ...filter,
          status: "delivered",
          sentAt: { $exists: true },
          deliveredAt: { $exists: true },
        })
        .select("sentAt deliveredAt")
        .exec(),
    ]);

    const statusMap: Record<string, number> = {};
    byStatus.forEach((item: any) => {
      statusMap[item._id] = item.count;
    });

    const channelMap: Record<string, number> = {};
    byChannel.forEach((item: any) => {
      channelMap[item._id] = item.count;
    });

    const deliveredCount = statusMap.delivered || 0;
    const deliveryRate = total > 0 ? (deliveredCount / total) * 100 : 0;

    // Calculate average delivery time
    let avgDeliveryTime = 0;
    if (deliveredMessages.length > 0) {
      const totalTime = deliveredMessages.reduce((sum, msg: any) => {
        const sent = new Date(msg.sentAt).getTime();
        const delivered = new Date(msg.deliveredAt).getTime();
        return sum + (delivered - sent);
      }, 0);
      avgDeliveryTime = totalTime / deliveredMessages.length / 1000; // in seconds
    }

    return {
      total,
      byStatus: statusMap,
      byChannel: channelMap,
      deliveryRate,
      avgDeliveryTime,
      failedCount: statusMap.failed || 0,
      retryableCount: await this.deliveryModel.countDocuments({
        ...filter,
        status: "failed",
        canRetry: true,
      }),
    };
  }

  /**
   * Update delivery status (webhook callback)
   */
  async updateStatus(
    tenantId: string,
    deliveryId: string,
    updateDto: UpdateDeliveryStatusDto,
  ): Promise<MessageDeliveryDocument> {
    const delivery = await this.findById(tenantId, deliveryId);

    delivery.status = updateDto.status;

    if (updateDto.providerMessageId) {
      delivery.providerMessageId = updateDto.providerMessageId;
    }

    if (updateDto.provider) {
      delivery.provider = updateDto.provider;
    }

    if (updateDto.providerResponse) {
      delivery.providerResponse = updateDto.providerResponse;
    }

    if (updateDto.errorMessage) {
      delivery.errorMessage = updateDto.errorMessage;
    }

    if (updateDto.errorCode) {
      delivery.errorCode = updateDto.errorCode;
    }

    if (updateDto.cost) {
      delivery.cost = updateDto.cost;
    }

    // Update timestamps based on status
    const now = new Date();
    switch (updateDto.status) {
      case "sent":
        delivery.sentAt = now;
        break;
      case "delivered":
        delivery.deliveredAt = now;
        break;
      case "failed":
        delivery.failedAt = now;
        break;
      case "bounced":
        delivery.bouncedAt = now;
        break;
    }

    return delivery.save();
  }

  /**
   * Track email open (pixel tracking)
   */
  async trackOpen(
    tenantId: string,
    deliveryId: string,
  ): Promise<void> {
    await this.deliveryModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(deliveryId),
          tenantId: new Types.ObjectId(tenantId),
        },
        {
          $set: { openedAt: new Date() },
          $inc: { openCount: 1 },
        },
      )
      .exec();
  }

  /**
   * Track email click
   */
  async trackClick(
    tenantId: string,
    deliveryId: string,
    url: string,
  ): Promise<void> {
    await this.deliveryModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(deliveryId),
          tenantId: new Types.ObjectId(tenantId),
        },
        {
          $set: { clickedAt: new Date() },
          $inc: { clickCount: 1 },
          $addToSet: { clickedLinks: url },
        },
      )
      .exec();
  }

  /**
   * Get provider name based on channel
   */
  private getProviderName(channel: string): string {
    switch (channel) {
      case "email":
        return "sendgrid"; // or "ses" based on config
      case "sms":
        return "twilio";
      case "whatsapp":
        return "whapi";
      default:
        return "unknown";
    }
  }
}
