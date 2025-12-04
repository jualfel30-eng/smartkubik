import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  CampaignAnalytics,
  DailyPerformance,
  SegmentPerformance,
  ProductPerformance,
} from "../schemas/campaign-analytics.schema";
import { ProductCampaign } from "../schemas/product-campaign.schema";
import { Order } from "../schemas/order.schema";
import { CustomerProductAffinity } from "../schemas/customer-product-affinity.schema";

/**
 * PHASE 5: ADVANCED ANALYTICS & REPORTING
 * CampaignAnalyticsService - Calculates and manages campaign analytics
 */

@Injectable()
export class CampaignAnalyticsService {
  constructor(
    @InjectModel(CampaignAnalytics.name)
    private campaignAnalyticsModel: Model<CampaignAnalytics>,
    @InjectModel(ProductCampaign.name)
    private productCampaignModel: Model<ProductCampaign>,
    @InjectModel(Order.name)
    private orderModel: Model<Order>,
    @InjectModel(CustomerProductAffinity.name)
    private affinityModel: Model<CustomerProductAffinity>,
  ) {}

  /**
   * Calculate complete analytics for a campaign
   */
  async calculateCampaignAnalytics(
    campaignId: string,
    tenantId: string,
  ): Promise<CampaignAnalytics> {
    const campaign = await this.productCampaignModel
      .findOne({
        _id: new Types.ObjectId(campaignId),
        tenantId: new Types.ObjectId(tenantId),
      })
      .exec();

    if (!campaign) {
      throw new NotFoundException("Campaign not found");
    }

    // Find or create analytics document
    let analytics = await this.campaignAnalyticsModel
      .findOne({
        campaignId: new Types.ObjectId(campaignId),
        tenantId: new Types.ObjectId(tenantId),
      })
      .exec();

    if (!analytics) {
      analytics = new this.campaignAnalyticsModel({
        campaignId: new Types.ObjectId(campaignId),
        tenantId: new Types.ObjectId(tenantId),
        campaignName: campaign.name,
        calculationStatus: "pending",
      });
    }

    analytics.calculationStatus = "calculating";
    await analytics.save();

    try {
      // Calculate overall performance
      await this.calculateOverallPerformance(analytics, campaign);

      // Calculate time-series data
      await this.calculateDailyPerformance(analytics, campaign, tenantId);

      // Calculate segment performance
      await this.calculateSegmentPerformance(analytics, campaign, tenantId);

      // Calculate product performance
      await this.calculateProductPerformance(analytics, campaign, tenantId);

      // Calculate A/B test analytics if applicable
      if (campaign.isAbTest) {
        await this.calculateAbTestAnalytics(analytics, campaign);
      }

      // Calculate attribution and engagement
      await this.calculateEngagementMetrics(analytics, campaign, tenantId);

      // Calculate timing analytics
      await this.calculateTimingAnalytics(analytics, campaign);

      // Calculate cohort analysis
      await this.calculateCohortAnalysis(analytics, campaign, tenantId);

      analytics.lastCalculatedAt = new Date();
      analytics.calculationStatus = "complete";
      await analytics.save();

      return analytics;
    } catch (error) {
      analytics.calculationStatus = "error";
      await analytics.save();
      throw error;
    }
  }

  /**
   * Calculate overall campaign performance metrics
   */
  private async calculateOverallPerformance(
    analytics: CampaignAnalytics,
    campaign: any, // Use any to access Document properties
  ): Promise<void> {
    if (campaign.isAbTest) {
      // Aggregate from all variants
      analytics.totalSent = campaign.variants.reduce(
        (sum, v) => sum + (v.totalSent || 0),
        0,
      );
      analytics.totalDelivered = campaign.variants.reduce(
        (sum, v) => sum + (v.totalDelivered || 0),
        0,
      );
      analytics.totalOpened = campaign.variants.reduce(
        (sum, v) => sum + (v.totalOpened || 0),
        0,
      );
      analytics.totalClicked = campaign.variants.reduce(
        (sum, v) => sum + (v.totalClicked || 0),
        0,
      );
      analytics.totalOrders = campaign.variants.reduce(
        (sum, v) => sum + (v.totalOrders || 0),
        0,
      );
      analytics.totalRevenue = campaign.variants.reduce(
        (sum, v) => sum + (v.totalRevenue || 0),
        0,
      );
    } else {
      // Use campaign-level metrics
      analytics.totalSent = campaign.totalSent || 0;
      analytics.totalDelivered = campaign.totalDelivered || 0;
      analytics.totalOpened = campaign.totalOpened || 0;
      analytics.totalClicked = campaign.totalClicked || 0;
      analytics.totalOrders = campaign.totalOrders || 0;
      analytics.totalRevenue = campaign.totalRevenue || 0;
    }

    analytics.totalCost = campaign.cost || 0;

    // Calculate rates
    analytics.openRate =
      analytics.totalDelivered > 0
        ? (analytics.totalOpened / analytics.totalDelivered) * 100
        : 0;
    analytics.clickRate =
      analytics.totalOpened > 0
        ? (analytics.totalClicked / analytics.totalOpened) * 100
        : 0;
    analytics.clickThroughRate =
      analytics.totalDelivered > 0
        ? (analytics.totalClicked / analytics.totalDelivered) * 100
        : 0;
    analytics.conversionRate =
      analytics.totalDelivered > 0
        ? (analytics.totalOrders / analytics.totalDelivered) * 100
        : 0;
    analytics.revenuePerRecipient =
      analytics.totalSent > 0
        ? analytics.totalRevenue / analytics.totalSent
        : 0;
    analytics.revenuePerOrder =
      analytics.totalOrders > 0
        ? analytics.totalRevenue / analytics.totalOrders
        : 0;
    analytics.roi =
      analytics.totalCost > 0
        ? ((analytics.totalRevenue - analytics.totalCost) /
            analytics.totalCost) *
          100
        : 0;
    analytics.costPerAcquisition =
      analytics.totalOrders > 0
        ? analytics.totalCost / analytics.totalOrders
        : 0;
    analytics.costPerClick =
      analytics.totalClicked > 0
        ? analytics.totalCost / analytics.totalClicked
        : 0;
  }

  /**
   * Calculate daily performance time-series
   */
  private async calculateDailyPerformance(
    analytics: CampaignAnalytics,
    campaign: any,
    tenantId: string,
  ): Promise<void> {
    // Get campaign date range
    const startDate = campaign.startedAt || campaign.createdAt || new Date();
    const endDate = new Date();

    // Get all orders attributed to this campaign
    const orders = await this.orderModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        campaignId: new Types.ObjectId(campaign._id),
        createdAt: { $gte: startDate, $lte: endDate },
      })
      .select("createdAt totalAmount")
      .exec();

    // Group orders by date
    const ordersByDate = new Map<string, { count: number; revenue: number }>();
    orders.forEach((order: any) => {
      if (order.createdAt) {
        const dateKey = order.createdAt.toISOString().split("T")[0];
        const existing = ordersByDate.get(dateKey) || { count: 0, revenue: 0 };
        existing.count++;
        existing.revenue += order.totalAmount || 0;
        ordersByDate.set(dateKey, existing);
      }
    });

    // Build daily performance array
    const dailyPerf: DailyPerformance[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split("T")[0];
      const orderData = ordersByDate.get(dateKey) || { count: 0, revenue: 0 };

      // Note: For sent/opened/clicked, we'd need tracking events with timestamps
      // For now, we'll focus on orders which we can track accurately
      dailyPerf.push({
        date: new Date(dateKey),
        sent: 0, // Would come from message tracking
        delivered: 0, // Would come from message tracking
        opened: 0, // Would come from message tracking
        clicked: 0, // Would come from message tracking
        orders: orderData.count,
        revenue: orderData.revenue,
        openRate: 0,
        clickRate: 0,
        conversionRate: 0,
      } as DailyPerformance);

      currentDate.setDate(currentDate.getDate() + 1);
    }

    analytics.dailyPerformance = dailyPerf;
  }

  /**
   * Calculate performance by customer segment
   */
  private async calculateSegmentPerformance(
    analytics: CampaignAnalytics,
    campaign: any,
    tenantId: string,
  ): Promise<void> {
    // Get all target customers for this campaign
    const targetCustomerIds = campaign.isAbTest
      ? campaign.variants.flatMap((v: any) =>
          v.assignedCustomerIds.map((id: any) => id.toString()),
        )
      : campaign.targetCustomerIds.map((id: any) => id.toString());

    // Get affinity data for these customers
    const affinities = await this.affinityModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        customerId: {
          $in: targetCustomerIds.map((id: string) => new Types.ObjectId(id)),
        },
      })
      .select("customerId customerSegment")
      .exec();

    // Group customers by segment
    const customersBySegment = new Map<string, Set<string>>();
    affinities.forEach((aff: any) => {
      const segment = aff.customerSegment || "unknown";
      if (!customersBySegment.has(segment)) {
        customersBySegment.set(segment, new Set());
      }
      customersBySegment.get(segment)!.add(aff.customerId.toString());
    });

    // Get orders for this campaign
    const orders = await this.orderModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        campaignId: new Types.ObjectId(campaign._id),
      })
      .select("customerId totalAmount")
      .exec();

    // Calculate performance by segment
    const segmentPerf: SegmentPerformance[] = [];
    const segments = ["new", "occasional", "regular", "frequent", "champion"];

    for (const segment of segments) {
      const customers = customersBySegment.get(segment) || new Set();
      const segmentOrders = orders.filter((o: any) =>
        customers.has(o.customerId.toString()),
      );

      const revenue = segmentOrders.reduce(
        (sum: number, o: any) => sum + (o.totalAmount || 0),
        0,
      );
      const orderCount = segmentOrders.length;

      segmentPerf.push({
        segmentName: segment,
        customerCount: customers.size,
        sent: customers.size, // Assuming all were sent
        opened: 0, // Would need tracking data
        clicked: 0, // Would need tracking data
        orders: orderCount,
        revenue,
        openRate: 0,
        clickRate: 0,
        conversionRate:
          customers.size > 0 ? (orderCount / customers.size) * 100 : 0,
        revenuePerCustomer: customers.size > 0 ? revenue / customers.size : 0,
      } as SegmentPerformance);
    }

    analytics.segmentPerformance = segmentPerf;
  }

  /**
   * Calculate performance by product
   */
  private async calculateProductPerformance(
    analytics: CampaignAnalytics,
    campaign: any,
    tenantId: string,
  ): Promise<void> {
    // Get all orders for this campaign
    const orders = await this.orderModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        campaignId: new Types.ObjectId(campaign._id),
      })
      .populate("items.product")
      .exec();

    // Aggregate by product
    const productStats = new Map<
      string,
      {
        productId: string;
        productName: string;
        orderCount: number;
        quantitySold: number;
        revenue: number;
      }
    >();

    orders.forEach((order) => {
      order.items.forEach((item: any) => {
        const productId = item.product._id.toString();
        const existing = productStats.get(productId) || {
          productId,
          productName: item.product.name,
          orderCount: 0,
          quantitySold: 0,
          revenue: 0,
        };

        existing.orderCount++;
        existing.quantitySold += item.quantity;
        existing.revenue += item.quantity * item.price;
        productStats.set(productId, existing);
      });
    });

    // Build product performance array
    const productPerf: ProductPerformance[] = Array.from(
      productStats.values(),
    ).map((stats) => ({
      productId: new Types.ObjectId(stats.productId),
      productName: stats.productName,
      orderCount: stats.orderCount,
      quantitySold: stats.quantitySold,
      revenue: stats.revenue,
      conversionRate:
        analytics.totalDelivered > 0
          ? (stats.orderCount / analytics.totalDelivered) * 100
          : 0,
      revenuePerOrder:
        stats.orderCount > 0 ? stats.revenue / stats.orderCount : 0,
    })) as ProductPerformance[];

    // Sort by revenue
    productPerf.sort((a, b) => b.revenue - a.revenue);

    analytics.productPerformance = productPerf;
  }

  /**
   * Calculate A/B test analytics
   */
  private async calculateAbTestAnalytics(
    analytics: CampaignAnalytics,
    campaign: any,
  ): Promise<void> {
    analytics.isAbTest = true;
    analytics.testMetric = campaign.testMetric;

    if (campaign.winningVariantName) {
      analytics.winningVariant = campaign.winningVariantName;

      const winner = campaign.variants.find(
        (v) => v.variantName === campaign.winningVariantName,
      );
      const control = campaign.variants[0]; // Assume first is control

      if (winner && control && winner.variantName !== control.variantName) {
        // Calculate improvement based on test metric
        const getMetricValue = (variant: any): number => {
          switch (campaign.testMetric) {
            case "open_rate":
              return variant.openRate || 0;
            case "click_rate":
              return variant.clickRate || 0;
            case "conversion_rate":
              return variant.conversionRate || 0;
            case "revenue":
              return variant.revenuePerRecipient || 0;
            default:
              return 0;
          }
        };

        const winnerValue = getMetricValue(winner);
        const controlValue = getMetricValue(control);

        analytics.improvementPercentage =
          controlValue > 0
            ? ((winnerValue - controlValue) / controlValue) * 100
            : 0;
      }
    }
  }

  /**
   * Calculate engagement metrics and attribution
   */
  private async calculateEngagementMetrics(
    analytics: CampaignAnalytics,
    campaign: any,
    tenantId: string,
  ): Promise<void> {
    // Get unique customers who made orders
    const orders = await this.orderModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        campaignId: new Types.ObjectId(campaign._id),
      })
      .select("customerId createdAt")
      .exec();

    const uniqueCustomers = new Set(
      orders.map((o: any) => o.customerId.toString()),
    );
    analytics.uniqueCustomersEngaged = uniqueCustomers.size;

    // Count repeat purchasers
    const purchaseCounts = new Map<string, number>();
    orders.forEach((order: any) => {
      const customerId = order.customerId.toString();
      purchaseCounts.set(customerId, (purchaseCounts.get(customerId) || 0) + 1);
    });

    analytics.repeatPurchasers = Array.from(purchaseCounts.values()).filter(
      (count) => count > 1,
    ).length;

    // Calculate average time to purchase
    const launchedAt = campaign.startedAt || campaign.createdAt;
    if (launchedAt && orders.length > 0) {
      const timeToPurchase = orders
        .filter((order: any) => order.createdAt)
        .map((order: any) => {
          return (
            (order.createdAt.getTime() - new Date(launchedAt).getTime()) /
            (1000 * 60 * 60)
          ); // Hours
        });

      if (timeToPurchase.length > 0) {
        analytics.averageTimeToPurchase =
          timeToPurchase.reduce((sum: number, t: number) => sum + t, 0) /
          timeToPurchase.length;
      }
    }

    // Calculate engagement score (weighted)
    const openWeight = 1;
    const clickWeight = 3;
    const orderWeight = 10;

    const totalEngagement =
      analytics.totalOpened * openWeight +
      analytics.totalClicked * clickWeight +
      analytics.totalOrders * orderWeight;

    analytics.engagementScore =
      analytics.totalSent > 0 ? totalEngagement / analytics.totalSent : 0;
  }

  /**
   * Calculate timing analytics
   */
  private async calculateTimingAnalytics(
    analytics: CampaignAnalytics,
    campaign: any,
  ): Promise<void> {
    const launchedAt = campaign.startedAt || campaign.createdAt;
    analytics.firstSentAt = launchedAt;
    analytics.lastSentAt = launchedAt; // Would track actual send times

    // Get first and last order times
    const orders = await this.orderModel
      .find({
        campaignId: new Types.ObjectId(campaign._id),
      })
      .select("createdAt")
      .sort({ createdAt: 1 })
      .exec();

    if (orders.length > 0 && orders[0].createdAt) {
      analytics.firstOrderAt = orders[0].createdAt;
      const lastOrder = orders[orders.length - 1];
      if (lastOrder.createdAt) {
        analytics.lastOrderAt = lastOrder.createdAt;
      }
    }

    if (launchedAt && analytics.lastOrderAt) {
      analytics.campaignDurationHours =
        (analytics.lastOrderAt.getTime() - new Date(launchedAt).getTime()) /
        (1000 * 60 * 60);
    }
  }

  /**
   * Calculate cohort analysis
   */
  private async calculateCohortAnalysis(
    analytics: CampaignAnalytics,
    campaign: any,
    tenantId: string,
  ): Promise<void> {
    // Get orders with customer segment data
    const orders = await this.orderModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        campaignId: new Types.ObjectId(campaign._id),
      })
      .select("customerId totalAmount")
      .exec();

    // Get customer segments
    const customerIds = orders.map((o: any) => o.customerId);
    const affinities = await this.affinityModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        customerId: { $in: customerIds },
      })
      .select("customerId customerSegment")
      .exec();

    const segmentMap = new Map<string, string>();
    affinities.forEach((aff: any) => {
      segmentMap.set(
        aff.customerId.toString(),
        aff.customerSegment || "unknown",
      );
    });

    // Aggregate by cohort
    const cohortRevenue = new Map<string, number>();
    const cohortOrders = new Map<string, number>();

    orders.forEach((order: any) => {
      const segment = segmentMap.get(order.customerId.toString()) || "unknown";
      cohortRevenue.set(
        segment,
        (cohortRevenue.get(segment) || 0) + (order.totalAmount || 0),
      );
      cohortOrders.set(segment, (cohortOrders.get(segment) || 0) + 1);
    });

    analytics.cohortRevenue = cohortRevenue;

    // Calculate conversion by cohort
    const cohortConversion = new Map<string, number>();
    const segments = ["new", "occasional", "regular", "frequent", "champion"];
    segments.forEach((segment) => {
      const segmentCustomers = affinities.filter(
        (a) => a.customerSegment === segment,
      ).length;
      const segmentOrders = cohortOrders.get(segment) || 0;
      cohortConversion.set(
        segment,
        segmentCustomers > 0 ? (segmentOrders / segmentCustomers) * 100 : 0,
      );
    });

    analytics.cohortConversion = cohortConversion;
  }

  /**
   * Get analytics for a campaign
   */
  async getAnalytics(campaignId: string, tenantId: string): Promise<any> {
    let analytics = await this.campaignAnalyticsModel
      .findOne({
        campaignId: new Types.ObjectId(campaignId),
        tenantId: new Types.ObjectId(tenantId),
      })
      .exec();

    // If analytics don't exist or are outdated, recalculate
    if (
      !analytics ||
      !analytics.lastCalculatedAt ||
      Date.now() - analytics.lastCalculatedAt.getTime() > 3600000
    ) {
      // 1 hour
      analytics = (await this.calculateCampaignAnalytics(
        campaignId,
        tenantId,
      )) as any;
    }

    if (!analytics) {
      throw new NotFoundException("Campaign analytics not found");
    }

    return analytics;
  }

  /**
   * Get analytics for all campaigns (with filters)
   */
  async getAllAnalytics(
    tenantId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      sortBy?: string;
      limit?: number;
    },
  ): Promise<CampaignAnalytics[]> {
    const query: any = {
      tenantId: new Types.ObjectId(tenantId),
    };

    if (filters?.startDate) {
      query.createdAt = { $gte: filters.startDate };
    }
    if (filters?.endDate) {
      query.createdAt = { ...query.createdAt, $lte: filters.endDate };
    }

    let analyticsQuery = this.campaignAnalyticsModel.find(query);

    // Sorting
    if (filters?.sortBy) {
      const sortField = filters.sortBy;
      analyticsQuery = analyticsQuery.sort({ [sortField]: -1 });
    } else {
      analyticsQuery = analyticsQuery.sort({ lastCalculatedAt: -1 });
    }

    if (filters?.limit) {
      analyticsQuery = analyticsQuery.limit(filters.limit);
    }

    return analyticsQuery.exec();
  }

  /**
   * Get top performing campaigns
   */
  async getTopPerformers(
    tenantId: string,
    metric: string = "roi",
    limit: number = 10,
  ): Promise<CampaignAnalytics[]> {
    return this.campaignAnalyticsModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        calculationStatus: "complete",
      })
      .sort({ [metric]: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Export analytics data for a campaign
   */
  async exportAnalytics(
    campaignId: string,
    tenantId: string,
    format: "json" | "csv" = "json",
  ): Promise<any> {
    const analytics = await this.getAnalytics(campaignId, tenantId);

    if (format === "json") {
      return analytics.toObject();
    } else if (format === "csv") {
      // Convert to CSV format
      const csvData = [
        // Headers
        ["Metric", "Value"],
        ["Campaign Name", analytics.campaignName],
        ["Total Sent", analytics.totalSent],
        ["Total Delivered", analytics.totalDelivered],
        ["Total Opened", analytics.totalOpened],
        ["Total Clicked", analytics.totalClicked],
        ["Total Orders", analytics.totalOrders],
        ["Total Revenue", analytics.totalRevenue],
        ["Total Cost", analytics.totalCost],
        ["Open Rate", `${analytics.openRate.toFixed(2)}%`],
        ["Click Rate", `${analytics.clickRate.toFixed(2)}%`],
        ["Conversion Rate", `${analytics.conversionRate.toFixed(2)}%`],
        ["ROI", `${analytics.roi.toFixed(2)}%`],
        [
          "Revenue Per Recipient",
          `$${analytics.revenuePerRecipient.toFixed(2)}`,
        ],
        ["Cost Per Acquisition", `$${analytics.costPerAcquisition.toFixed(2)}`],
      ];

      return csvData;
    }
  }

  /**
   * Refresh all campaign analytics
   */
  async refreshAllAnalytics(tenantId: string): Promise<number> {
    const campaigns = await this.productCampaignModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        status: { $in: ["running", "completed"] },
      })
      .select("_id")
      .exec();

    let refreshedCount = 0;
    for (const campaign of campaigns) {
      try {
        await this.calculateCampaignAnalytics(
          campaign._id.toString(),
          tenantId,
        );
        refreshedCount++;
      } catch (error) {
        console.error(
          `Failed to refresh analytics for campaign ${campaign._id}:`,
          error,
        );
      }
    }

    return refreshedCount;
  }
}
