import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  MarketingCampaign,
  MarketingCampaignDocument,
} from "../../schemas/marketing-campaign.schema";
import {
  CreateMarketingCampaignDto,
  UpdateMarketingCampaignDto,
  GetMarketingCampaignsQueryDto,
  MarketingCampaignAnalyticsResponse,
} from "../../dto/marketing-campaign.dto";
import { Customer, CustomerDocument } from "../../schemas/customer.schema";
import { Order, OrderDocument } from "../../schemas/order.schema";
import { AudienceFilterDto } from "../../dto/audience-filter.dto";
import { NotificationsService } from "../notifications/notifications.service";
import { Logger } from "@nestjs/common";

@Injectable()
export class MarketingService {
  private readonly logger = new Logger(MarketingService.name);

  constructor(
    @InjectModel(MarketingCampaign.name)
    private campaignModel: Model<MarketingCampaignDocument>,
    @InjectModel(Customer.name)
    private customerModel: Model<CustomerDocument>,
    @InjectModel(Order.name)
    private orderModel: Model<OrderDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(
    tenantId: string,
    organizationId: string | undefined,
    userId: string,
    createCampaignDto: CreateMarketingCampaignDto,
  ): Promise<MarketingCampaign> {
    // Calculate estimated reach if targetSegment is provided
    let estimatedReach = 0;
    if (createCampaignDto.targetSegment) {
      estimatedReach = await this.calculateEstimatedReach(
        tenantId,
        organizationId,
        createCampaignDto.targetSegment,
      );
    }

    const campaign = new this.campaignModel({
      ...createCampaignDto,
      tenantId: new Types.ObjectId(tenantId),
      organizationId: organizationId
        ? new Types.ObjectId(organizationId)
        : undefined,
      createdBy: new Types.ObjectId(userId),
      estimatedReach,
      recipients: createCampaignDto.recipients?.map(
        (id) => new Types.ObjectId(id),
      ),
    });

    return campaign.save();
  }

  async findAll(
    tenantId: string,
    organizationId: string | undefined,
    query: GetMarketingCampaignsQueryDto,
  ): Promise<MarketingCampaign[]> {
    const { channel, type, status, startDate, endDate, search } = query;

    const filter: any = { tenantId: new Types.ObjectId(tenantId) };
    if (organizationId) {
      filter.organizationId = new Types.ObjectId(organizationId);
    }

    if (channel) filter.channel = channel;
    if (type) filter.type = type;
    if (status) filter.status = status;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { message: { $regex: search, $options: "i" } },
      ];
    }

    return this.campaignModel
      .find(filter)
      .sort({ createdAt: -1 })
      .populate("createdBy", "firstName lastName email")
      .lean()
      .exec();
  }

  async findOne(
    tenantId: string,
    organizationId: string | undefined,
    id: string,
  ): Promise<any> {
    const filter: any = {
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
    };
    if (organizationId) {
      filter.organizationId = new Types.ObjectId(organizationId);
    }

    const campaign = await this.campaignModel
      .findOne(filter)
      .populate("createdBy", "firstName lastName email")
      .populate("recipients", "name email phone")
      .lean()
      .exec();

    if (!campaign) {
      throw new NotFoundException("Campaign not found");
    }

    return campaign;
  }

  async update(
    tenantId: string,
    organizationId: string | undefined,
    id: string,
    updateCampaignDto: UpdateMarketingCampaignDto,
  ): Promise<MarketingCampaign> {
    const filter: any = {
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
    };
    if (organizationId) {
      filter.organizationId = new Types.ObjectId(organizationId);
    }

    const campaign = await this.campaignModel
      .findOneAndUpdate(filter, updateCampaignDto, { new: true })
      .exec();

    if (!campaign) {
      throw new NotFoundException("Campaign not found");
    }

    return campaign;
  }

  async remove(
    tenantId: string,
    organizationId: string | undefined,
    id: string,
  ): Promise<void> {
    const filter: any = {
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
    };
    if (organizationId) {
      filter.organizationId = new Types.ObjectId(organizationId);
    }

    const result = await this.campaignModel.deleteOne(filter).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException("Campaign not found");
    }
  }

  async launch(
    tenantId: string,
    organizationId: string | undefined,
    id: string,
  ): Promise<MarketingCampaign> {
    const filter: any = {
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
    };
    if (organizationId) {
      filter.organizationId = new Types.ObjectId(organizationId);
    }

    // First, get the campaign to check if we need to populate recipients
    const existingCampaign = await this.campaignModel.findOne(filter).exec();

    if (!existingCampaign) {
      throw new NotFoundException("Campaign not found");
    }

    // Populate recipients from targetSegment if not already populated
    let recipients = existingCampaign.recipients || [];
    if (
      (!recipients || recipients.length === 0) &&
      existingCampaign.targetSegment
    ) {
      recipients = await this.populateRecipients(
        tenantId,
        organizationId,
        existingCampaign.targetSegment,
      );
    }

    const campaign = await this.campaignModel
      .findOneAndUpdate(
        filter,
        {
          status: "running",
          startedAt: new Date(),
          recipients,
        },
        { new: true },
      )
      .exec();

    if (!campaign) {
      throw new NotFoundException("Campaign not found");
    }

    // PHASE 1: Send campaign messages to all recipients via NotificationsService
    this.sendCampaignMessages(campaign, tenantId).catch((error) => {
      this.logger.error(
        `Error sending campaign ${campaign._id}: ${error.message}`,
      );
    });

    return campaign;
  }

  /**
   * Send campaign messages to all recipients
   * PHASE 1: Integration with NotificationsService
   */
  private async sendCampaignMessages(
    campaign: any,
    tenantId: string,
  ): Promise<void> {
    if (!campaign.recipients || campaign.recipients.length === 0) {
      this.logger.warn(`Campaign ${campaign.name} has no recipients`);
      await this.campaignModel.findByIdAndUpdate(campaign._id, {
        status: "completed",
        completedAt: new Date(),
      });
      return;
    }

    // Get customer contact information
    const customers = await this.customerModel
      .find({
        _id: { $in: campaign.recipients },
        tenantId: new Types.ObjectId(tenantId),
      })
      .select("_id name contacts preferences whatsappChatId whatsappNumber")
      .lean();

    this.logger.log(
      `Sending campaign "${campaign.name}" to ${customers.length} customers via ${campaign.channel}`,
    );

    let sentCount = 0;
    let deliveredCount = 0;
    const errors: string[] = [];

    // Send to each customer
    for (const customer of customers) {
      try {
        const result = await this.sendCampaignToCustomer(
          campaign,
          customer,
          tenantId,
        );

        if (result.success) {
          sentCount++;
          if (result.delivered) deliveredCount++;
        } else {
          errors.push(`${customer.name}: ${result.error}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Error sending campaign to customer ${customer._id}: ${message}`,
        );
        errors.push(`${customer.name}: ${message}`);
      }
    }

    // Update campaign metrics
    await this.campaignModel.findByIdAndUpdate(campaign._id, {
      status: "completed",
      completedAt: new Date(),
      totalSent: sentCount,
      totalDelivered: deliveredCount,
    });

    this.logger.log(
      `Campaign "${campaign.name}" completed: ${sentCount}/${customers.length} messages sent, ${deliveredCount} delivered`,
    );

    if (errors.length > 0) {
      this.logger.warn(
        `Campaign "${campaign.name}" had ${errors.length} errors:\n${errors.slice(0, 5).join("\n")}${errors.length > 5 ? `\n... and ${errors.length - 5} more` : ""}`,
      );
    }
  }

  /**
   * Send campaign to a single customer
   * PHASE 1: Integration with NotificationsService
   */
  private async sendCampaignToCustomer(
    campaign: any,
    customer: any,
    tenantId: string,
  ): Promise<{ success: boolean; delivered: boolean; error?: string }> {
    // Validate channel
    const validChannels = ["email", "sms", "whatsapp"] as const;
    type ValidChannel = (typeof validChannels)[number];

    if (!validChannels.includes(campaign.channel as ValidChannel)) {
      return {
        success: false,
        delivered: false,
        error: `Invalid channel: ${campaign.channel}`,
      };
    }

    const channel = campaign.channel as ValidChannel;

    // Get customer contact based on channel
    const contact = this.getCustomerContact(customer, channel);

    if (!contact) {
      return {
        success: false,
        delivered: false,
        error: `No ${channel} contact available`,
      };
    }

    try {
      const channels: Array<"email" | "sms" | "whatsapp"> = [channel];

      // Prepare campaign context
      const context = {
        customerName: customer.name || "Cliente",
        campaignName: campaign.name,
        campaignSubject: campaign.subject || campaign.name,
        campaignMessage: campaign.message || "",
        hotelName: "SmartKubik",
      };

      // Send notification using NotificationsService
      const results = await this.notificationsService.sendTemplateNotification(
        {
          tenantId,
          customerId: customer._id.toString(),
          templateId: "marketing-campaign",
          channels,
          context,
          customerEmail: channel === "email" ? contact : null,
          customerPhone: channel === "sms" ? contact : null,
          whatsappChatId:
            channel === "whatsapp" ? customer.whatsappChatId || contact : null,
        },
        {
          engagementDelta: 3,
        },
      );

      const channelResult = results.find((r) => r.channel === channel);

      if (channelResult && channelResult.success) {
        return { success: true, delivered: true };
      } else {
        return {
          success: false,
          delivered: false,
          error: channelResult?.error || "Unknown error",
        };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, delivered: false, error: message };
    }
  }

  /**
   * Get customer contact for specific channel
   * PHASE 1: Helper method
   */
  private getCustomerContact(
    customer: any,
    channel: "email" | "sms" | "whatsapp",
  ): string | null {
    if (!customer.contacts || customer.contacts.length === 0) {
      return null;
    }

    switch (channel) {
      case "email":
        const emailContact = customer.contacts.find(
          (c: any) => c.type === "email" && c.isActive,
        );
        return emailContact?.value || null;

      case "sms":
      case "whatsapp":
        const phoneContact = customer.contacts.find(
          (c: any) => (c.type === "phone" || c.type === "mobile") && c.isActive,
        );
        return phoneContact?.value || customer.whatsappNumber || null;

      default:
        return null;
    }
  }

  async pause(
    tenantId: string,
    organizationId: string | undefined,
    id: string,
  ): Promise<MarketingCampaign> {
    const filter: any = {
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
    };
    if (organizationId) {
      filter.organizationId = new Types.ObjectId(organizationId);
    }

    const campaign = await this.campaignModel
      .findOneAndUpdate(filter, { status: "paused" }, { new: true })
      .exec();

    if (!campaign) {
      throw new NotFoundException("Campaign not found");
    }

    return campaign;
  }

  async getAnalytics(
    tenantId: string,
    organizationId: string | undefined,
  ): Promise<MarketingCampaignAnalyticsResponse> {
    const filter: any = { tenantId: new Types.ObjectId(tenantId) };
    if (organizationId) {
      filter.organizationId = new Types.ObjectId(organizationId);
    }

    const [totalCampaigns, activeCampaigns, aggregations, byChannel] =
      await Promise.all([
        this.campaignModel.countDocuments(filter).exec(),
        this.campaignModel
          .countDocuments({ ...filter, status: "running" })
          .exec(),
        this.campaignModel
          .aggregate([
            { $match: filter },
            {
              $group: {
                _id: null,
                totalSent: { $sum: "$totalSent" },
                totalOpened: { $sum: "$totalOpened" },
                totalClicked: { $sum: "$totalClicked" },
                totalConverted: { $sum: "$totalConverted" },
                totalRevenue: { $sum: "$revenue" },
                totalSpent: { $sum: "$spent" },
              },
            },
          ])
          .exec(),
        this.campaignModel
          .aggregate([
            { $match: filter },
            {
              $group: {
                _id: "$channel",
                campaigns: { $sum: 1 },
                sent: { $sum: "$totalSent" },
                opened: { $sum: "$totalOpened" },
                clicked: { $sum: "$totalClicked" },
                converted: { $sum: "$totalConverted" },
              },
            },
            {
              $project: {
                channel: "$_id",
                campaigns: 1,
                sent: 1,
                openRate: {
                  $cond: [
                    { $gt: ["$sent", 0] },
                    { $multiply: [{ $divide: ["$opened", "$sent"] }, 100] },
                    0,
                  ],
                },
                clickRate: {
                  $cond: [
                    { $gt: ["$opened", 0] },
                    { $multiply: [{ $divide: ["$clicked", "$opened"] }, 100] },
                    0,
                  ],
                },
                conversionRate: {
                  $cond: [
                    { $gt: ["$sent", 0] },
                    { $multiply: [{ $divide: ["$converted", "$sent"] }, 100] },
                    0,
                  ],
                },
                _id: 0,
              },
            },
          ])
          .exec(),
      ]);

    const stats = aggregations[0] || {
      totalSent: 0,
      totalOpened: 0,
      totalClicked: 0,
      totalConverted: 0,
      totalRevenue: 0,
      totalSpent: 0,
    };

    const averageOpenRate =
      stats.totalSent > 0 ? (stats.totalOpened / stats.totalSent) * 100 : 0;
    const averageClickRate =
      stats.totalOpened > 0
        ? (stats.totalClicked / stats.totalOpened) * 100
        : 0;
    const averageConversionRate =
      stats.totalSent > 0 ? (stats.totalConverted / stats.totalSent) * 100 : 0;
    const averageROI =
      stats.totalSpent > 0
        ? ((stats.totalRevenue - stats.totalSpent) / stats.totalSpent) * 100
        : 0;

    const topPerforming = await this.campaignModel
      .find(filter)
      .sort({ totalConverted: -1 })
      .limit(5)
      .lean()
      .exec();

    const recentCampaigns = await this.campaignModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(10)
      .lean()
      .exec();

    return {
      overview: {
        totalCampaigns,
        activeCampaigns,
        totalSent: stats.totalSent,
        averageOpenRate,
        averageClickRate,
        averageConversionRate,
        totalRevenue: stats.totalRevenue,
        averageROI,
      },
      byChannel,
      topPerforming,
      recentCampaigns,
    };
  }

  /**
   * Filter customers based on audience criteria (RFM tiers, tags, location, spending, etc.)
   */
  async filterAudience(
    tenantId: string,
    organizationId: string | undefined,
    filters: AudienceFilterDto,
  ): Promise<{ customers: any[]; count: number }> {
    const query: any = {
      tenantId: new Types.ObjectId(tenantId),
    };

    if (organizationId) {
      query.organizationId = new Types.ObjectId(organizationId);
    }

    // Filter by tier (Diamante, Oro, Plata, Bronce)
    if (filters.tiers && filters.tiers.length > 0) {
      query.tier = { $in: filters.tiers };
    }

    // Filter by customer type
    if (filters.customerTypes && filters.customerTypes.length > 0) {
      query.customerType = { $in: filters.customerTypes };
    }

    // Filter by tags
    if (filters.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags };
    }

    // Filter by location (city, state, country)
    if (filters.locations && filters.locations.length > 0) {
      query.$or = [
        { "address.city": { $in: filters.locations } },
        { "address.state": { $in: filters.locations } },
        { "address.country": { $in: filters.locations } },
      ];
    }

    // Filter by total spent range
    if (filters.minSpent !== undefined || filters.maxSpent !== undefined) {
      query.totalSpent = {};
      if (filters.minSpent !== undefined) {
        query.totalSpent.$gte = filters.minSpent;
      }
      if (filters.maxSpent !== undefined) {
        query.totalSpent.$lte = filters.maxSpent;
      }
    }

    // Filter by days since last visit
    if (filters.maxDaysSinceLastVisit !== undefined) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - filters.maxDaysSinceLastVisit);
      query.lastPurchaseDate = { $gte: cutoffDate };
    }

    // Filter by visit count
    if (
      filters.minVisitCount !== undefined ||
      filters.maxVisitCount !== undefined
    ) {
      query.totalOrders = {};
      if (filters.minVisitCount !== undefined) {
        query.totalOrders.$gte = filters.minVisitCount;
      }
      if (filters.maxVisitCount !== undefined) {
        query.totalOrders.$lte = filters.maxVisitCount;
      }
    }

    // Explicitly include/exclude specific customers
    if (filters.includeCustomerIds && filters.includeCustomerIds.length > 0) {
      const includeIds = filters.includeCustomerIds.map(
        (id) => new Types.ObjectId(id),
      );
      query._id = { $in: includeIds };
    }

    if (filters.excludeCustomerIds && filters.excludeCustomerIds.length > 0) {
      const excludeIds = filters.excludeCustomerIds.map(
        (id) => new Types.ObjectId(id),
      );
      query._id = { ...query._id, $nin: excludeIds };
    }

    // Product Affinity Filters (Phase 2)
    const hasProductFilters =
      (filters.productIds && filters.productIds.length > 0) ||
      (filters.excludeProductIds && filters.excludeProductIds.length > 0);

    if (hasProductFilters) {
      // Use aggregation pipeline to filter by product purchase history
      const pipeline: any[] = [
        { $match: query },
        {
          $lookup: {
            from: "orders",
            let: { customerId: "$_id", customerTenantId: "$tenantId" },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ["$customerId", "$$customerId"] },
                      { $eq: ["$tenantId", "$$customerTenantId"] },
                      {
                        $in: [
                          "$status",
                          ["delivered", "paid", "confirmed", "processing"],
                        ],
                      },
                    ],
                  },
                },
              },
              { $unwind: "$items" },
            ],
            as: "orderItems",
          },
        },
      ];

      // Filter: Customers who purchased specific products
      if (filters.productIds && filters.productIds.length > 0) {
        const productObjectIds = filters.productIds.map(
          (id) => new Types.ObjectId(id),
        );

        pipeline.push({
          $addFields: {
            productPurchases: {
              $filter: {
                input: "$orderItems",
                as: "item",
                cond: {
                  $in: ["$$item.items.productId", productObjectIds],
                },
              },
            },
          },
        });

        // Filter by minimum purchase count if specified
        const minCount = filters.minPurchaseCount || 1;
        pipeline.push({
          $match: {
            $expr: {
              $gte: [{ $size: "$productPurchases" }, minCount],
            },
          },
        });

        // Filter by days since last product purchase (win-back campaigns)
        if (filters.maxDaysSinceLastProductPurchase !== undefined) {
          const cutoffDate = new Date();
          cutoffDate.setDate(
            cutoffDate.getDate() - filters.maxDaysSinceLastProductPurchase,
          );

          pipeline.push({
            $addFields: {
              lastProductPurchase: {
                $max: "$productPurchases.createdAt",
              },
            },
          });

          pipeline.push({
            $match: {
              lastProductPurchase: { $lte: cutoffDate },
            },
          });
        }
      }

      // Filter: Customers who NEVER purchased specific products (cross-sell)
      if (filters.excludeProductIds && filters.excludeProductIds.length > 0) {
        const excludeProductObjectIds = filters.excludeProductIds.map(
          (id) => new Types.ObjectId(id),
        );

        pipeline.push({
          $addFields: {
            excludedProductPurchases: {
              $filter: {
                input: "$orderItems",
                as: "item",
                cond: {
                  $in: ["$$item.items.productId", excludeProductObjectIds],
                },
              },
            },
          },
        });

        pipeline.push({
          $match: {
            $expr: {
              $eq: [{ $size: "$excludedProductPurchases" }, 0],
            },
          },
        });
      }

      // Project only necessary fields
      pipeline.push({
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          phone: 1,
          tier: 1,
          totalSpent: 1,
          totalOrders: 1,
          lastPurchaseDate: 1,
        },
      });

      const customers = await this.customerModel.aggregate(pipeline);

      return {
        customers,
        count: customers.length,
      };
    } else {
      // No product filters - use simple query
      const customers = await this.customerModel
        .find(query)
        .select(
          "_id name email phone tier totalSpent totalOrders lastPurchaseDate",
        )
        .lean();

      return {
        customers,
        count: customers.length,
      };
    }
  }

  /**
   * Calculate estimated reach for a campaign based on targetSegment
   */
  async calculateEstimatedReach(
    tenantId: string,
    organizationId: string | undefined,
    targetSegment: any,
  ): Promise<number> {
    if (!targetSegment) {
      return 0;
    }

    const filters: AudienceFilterDto = {
      tiers: targetSegment.customerType, // Map customerType to tiers for backward compatibility
      tags: targetSegment.tags,
      locations: targetSegment.location,
      minSpent: targetSegment.minSpent,
      maxSpent: targetSegment.maxSpent,
      maxDaysSinceLastVisit: targetSegment.lastVisitDays,
      minVisitCount: targetSegment.visitCount?.min,
      maxVisitCount: targetSegment.visitCount?.max,
      includeCustomerIds: targetSegment.includeCustomerIds,
      excludeCustomerIds: targetSegment.excludeCustomerIds,
    };

    const result = await this.filterAudience(tenantId, organizationId, filters);
    return result.count;
  }

  /**
   * Populate recipients array based on targetSegment criteria
   */
  async populateRecipients(
    tenantId: string,
    organizationId: string | undefined,
    targetSegment: any,
  ): Promise<Types.ObjectId[]> {
    const result = await this.filterAudience(
      tenantId,
      organizationId,
      this.mapTargetSegmentToFilters(targetSegment),
    );

    return result.customers.map((customer) => customer._id);
  }

  private mapTargetSegmentToFilters(targetSegment: any): AudienceFilterDto {
    if (!targetSegment) {
      return {};
    }

    return {
      tiers: targetSegment.customerType,
      tags: targetSegment.tags,
      locations: targetSegment.location,
      minSpent: targetSegment.minSpent,
      maxSpent: targetSegment.maxSpent,
      maxDaysSinceLastVisit: targetSegment.lastVisitDays,
      minVisitCount: targetSegment.visitCount?.min,
      maxVisitCount: targetSegment.visitCount?.max,
      includeCustomerIds: targetSegment.includeCustomerIds,
      excludeCustomerIds: targetSegment.excludeCustomerIds,
    };
  }

  /**
   * Phase 4: Advanced Analytics Methods
   */

  /**
   * Get campaign performance over time with granularity
   */
  async getCampaignPerformanceOverTime(
    tenantId: string,
    filters: {
      startDate?: string;
      endDate?: string;
      campaignIds?: string[];
      channel?: string;
      granularity?: "daily" | "weekly" | "monthly";
    },
  ): Promise<any[]> {
    const query: any = { tenantId: new Types.ObjectId(tenantId) };

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    if (filters.campaignIds && filters.campaignIds.length > 0) {
      query._id = {
        $in: filters.campaignIds.map((id) => new Types.ObjectId(id)),
      };
    }

    if (filters.channel) {
      query.channel = filters.channel;
    }

    const granularity = filters.granularity || "daily";
    let dateFormat: any;

    switch (granularity) {
      case "daily":
        dateFormat = {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        };
        break;
      case "weekly":
        dateFormat = {
          $dateToString: { format: "%Y-W%V", date: "$createdAt" },
        };
        break;
      case "monthly":
        dateFormat = { $dateToString: { format: "%Y-%m", date: "$createdAt" } };
        break;
    }

    const performanceData = await this.campaignModel.aggregate([
      { $match: query },
      {
        $group: {
          _id: dateFormat,
          totalSent: { $sum: "$totalSent" },
          totalOpened: { $sum: "$totalOpened" },
          totalClicked: { $sum: "$totalClicked" },
          totalConverted: { $sum: "$totalConverted" },
          totalRevenue: { $sum: "$revenue" },
          campaigns: { $sum: 1 },
        },
      },
      {
        $project: {
          date: "$_id",
          totalSent: 1,
          totalOpened: 1,
          totalClicked: 1,
          totalConverted: 1,
          totalRevenue: 1,
          campaigns: 1,
          openRate: {
            $cond: [
              { $gt: ["$totalSent", 0] },
              { $multiply: [{ $divide: ["$totalOpened", "$totalSent"] }, 100] },
              0,
            ],
          },
          clickRate: {
            $cond: [
              { $gt: ["$totalOpened", 0] },
              {
                $multiply: [
                  { $divide: ["$totalClicked", "$totalOpened"] },
                  100,
                ],
              },
              0,
            ],
          },
          conversionRate: {
            $cond: [
              { $gt: ["$totalSent", 0] },
              {
                $multiply: [
                  { $divide: ["$totalConverted", "$totalSent"] },
                  100,
                ],
              },
              0,
            ],
          },
        },
      },
      { $sort: { date: 1 } },
    ]);

    return performanceData;
  }

  /**
   * Get conversion funnel for a campaign
   */
  async getConversionFunnel(
    tenantId: string,
    campaignId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<any> {
    const query: any = { tenantId: new Types.ObjectId(tenantId) };

    if (campaignId) {
      query._id = new Types.ObjectId(campaignId);
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const funnelData = await this.campaignModel.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalSent: { $sum: "$totalSent" },
          totalOpened: { $sum: "$totalOpened" },
          totalClicked: { $sum: "$totalClicked" },
          totalConverted: { $sum: "$totalConverted" },
        },
      },
      {
        $project: {
          _id: 0,
          stages: [
            {
              name: "Sent",
              count: "$totalSent",
              percentage: 100,
            },
            {
              name: "Opened",
              count: "$totalOpened",
              percentage: {
                $cond: [
                  { $gt: ["$totalSent", 0] },
                  {
                    $multiply: [
                      { $divide: ["$totalOpened", "$totalSent"] },
                      100,
                    ],
                  },
                  0,
                ],
              },
            },
            {
              name: "Clicked",
              count: "$totalClicked",
              percentage: {
                $cond: [
                  { $gt: ["$totalSent", 0] },
                  {
                    $multiply: [
                      { $divide: ["$totalClicked", "$totalSent"] },
                      100,
                    ],
                  },
                  0,
                ],
              },
            },
            {
              name: "Converted",
              count: "$totalConverted",
              percentage: {
                $cond: [
                  { $gt: ["$totalSent", 0] },
                  {
                    $multiply: [
                      { $divide: ["$totalConverted", "$totalSent"] },
                      100,
                    ],
                  },
                  0,
                ],
              },
            },
          ],
        },
      },
    ]);

    return funnelData[0] || { stages: [] };
  }

  /**
   * Get cohort analysis by segment
   */
  async getCohortAnalysis(
    tenantId: string,
    filters: {
      startDate?: string;
      endDate?: string;
      segmentBy?: string;
      metric?: string;
    },
  ): Promise<any[]> {
    const query: any = { tenantId: new Types.ObjectId(tenantId) };

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    const segmentBy = filters.segmentBy || "channel";
    const metric = filters.metric || "conversion_rate";

    let metricCalculation: any;
    switch (metric) {
      case "conversion_rate":
        metricCalculation = {
          $cond: [
            { $gt: ["$totalSent", 0] },
            {
              $multiply: [{ $divide: ["$totalConverted", "$totalSent"] }, 100],
            },
            0,
          ],
        };
        break;
      case "revenue":
        metricCalculation = "$totalRevenue";
        break;
      case "engagement":
        metricCalculation = {
          $cond: [
            { $gt: ["$totalSent", 0] },
            { $multiply: [{ $divide: ["$totalClicked", "$totalSent"] }, 100] },
            0,
          ],
        };
        break;
      default:
        metricCalculation = "$totalConverted";
    }

    const cohortData = await this.campaignModel.aggregate([
      { $match: query },
      {
        $group: {
          _id: `$${segmentBy}`,
          totalSent: { $sum: "$totalSent" },
          totalOpened: { $sum: "$totalOpened" },
          totalClicked: { $sum: "$totalClicked" },
          totalConverted: { $sum: "$totalConverted" },
          totalRevenue: { $sum: "$revenue" },
          campaigns: { $sum: 1 },
        },
      },
      {
        $project: {
          segment: "$_id",
          totalSent: 1,
          totalOpened: 1,
          totalClicked: 1,
          totalConverted: 1,
          totalRevenue: 1,
          campaigns: 1,
          metricValue: metricCalculation,
        },
      },
      { $sort: { metricValue: -1 } },
    ]);

    return cohortData;
  }

  /**
   * Get revenue attribution by campaign
   */
  async getRevenueAttribution(
    tenantId: string,
    startDate: string,
    endDate: string,
    attributionModel: string = "last_touch",
  ): Promise<any[]> {
    const query: any = {
      tenantId: new Types.ObjectId(tenantId),
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };

    const attributionData = await this.campaignModel.aggregate([
      { $match: query },
      {
        $project: {
          name: 1,
          channel: 1,
          type: 1,
          totalConverted: 1,
          revenue: 1,
          revenuePerConversion: {
            $cond: [
              { $gt: ["$totalConverted", 0] },
              { $divide: ["$revenue", "$totalConverted"] },
              0,
            ],
          },
          roi: {
            $cond: [
              { $gt: ["$cost", 0] },
              {
                $multiply: [
                  { $divide: [{ $subtract: ["$revenue", "$cost"] }, "$cost"] },
                  100,
                ],
              },
              0,
            ],
          },
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    return attributionData;
  }

  /**
   * Compare performance between two periods
   */
  async comparePerformancePeriods(
    tenantId: string,
    currentStart: string,
    currentEnd: string,
    previousStart: string,
    previousEnd: string,
  ): Promise<any> {
    const tenantObjectId = new Types.ObjectId(tenantId);

    const [currentPeriod, previousPeriod] = await Promise.all([
      this.campaignModel.aggregate([
        {
          $match: {
            tenantId: tenantObjectId,
            createdAt: {
              $gte: new Date(currentStart),
              $lte: new Date(currentEnd),
            },
          },
        },
        {
          $group: {
            _id: null,
            totalSent: { $sum: "$totalSent" },
            totalOpened: { $sum: "$totalOpened" },
            totalClicked: { $sum: "$totalClicked" },
            totalConverted: { $sum: "$totalConverted" },
            totalRevenue: { $sum: "$revenue" },
            campaigns: { $sum: 1 },
          },
        },
      ]),
      this.campaignModel.aggregate([
        {
          $match: {
            tenantId: tenantObjectId,
            createdAt: {
              $gte: new Date(previousStart),
              $lte: new Date(previousEnd),
            },
          },
        },
        {
          $group: {
            _id: null,
            totalSent: { $sum: "$totalSent" },
            totalOpened: { $sum: "$totalOpened" },
            totalClicked: { $sum: "$totalClicked" },
            totalConverted: { $sum: "$totalConverted" },
            totalRevenue: { $sum: "$revenue" },
            campaigns: { $sum: 1 },
          },
        },
      ]),
    ]);

    const current = currentPeriod[0] || {};
    const previous = previousPeriod[0] || {};

    const calculateChange = (current: number, previous: number) => {
      if (!previous || previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      current: {
        totalSent: current.totalSent || 0,
        totalOpened: current.totalOpened || 0,
        totalClicked: current.totalClicked || 0,
        totalConverted: current.totalConverted || 0,
        totalRevenue: current.totalRevenue || 0,
        campaigns: current.campaigns || 0,
      },
      previous: {
        totalSent: previous.totalSent || 0,
        totalOpened: previous.totalOpened || 0,
        totalClicked: previous.totalClicked || 0,
        totalConverted: previous.totalConverted || 0,
        totalRevenue: previous.totalRevenue || 0,
        campaigns: previous.campaigns || 0,
      },
      change: {
        totalSent: calculateChange(current.totalSent, previous.totalSent),
        totalOpened: calculateChange(current.totalOpened, previous.totalOpened),
        totalClicked: calculateChange(
          current.totalClicked,
          previous.totalClicked,
        ),
        totalConverted: calculateChange(
          current.totalConverted,
          previous.totalConverted,
        ),
        totalRevenue: calculateChange(
          current.totalRevenue,
          previous.totalRevenue,
        ),
        campaigns: calculateChange(current.campaigns, previous.campaigns),
      },
    };
  }
}
