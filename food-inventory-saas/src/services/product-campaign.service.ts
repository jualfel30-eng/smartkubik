import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  ProductCampaign,
  ProductCampaignDocument,
} from "../schemas/product-campaign.schema";
import { ProductAffinityService } from "./product-affinity.service";
import { NotificationsService } from "../modules/notifications/notifications.service";
import { Customer, CustomerDocument } from "../schemas/customer.schema";

@Injectable()
export class ProductCampaignService {
  private readonly logger = new Logger(ProductCampaignService.name);

  constructor(
    @InjectModel(ProductCampaign.name)
    private productCampaignModel: Model<ProductCampaignDocument>,
    @InjectModel(Customer.name)
    private customerModel: Model<CustomerDocument>,
    private readonly productAffinityService: ProductAffinityService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Create a new product campaign with auto-segmentation
   */
  async createCampaign(
    data: Partial<ProductCampaign>,
    tenantId: string,
    createdBy?: string,
  ): Promise<ProductCampaign> {
    const campaign = new this.productCampaignModel({
      ...data,
      tenantId: new Types.ObjectId(tenantId),
      createdBy: createdBy ? new Types.ObjectId(createdBy) : undefined,
      status: "draft",
    });

    // Auto-generate target segment from product affinity matrix
    await this.updateTargetSegment(campaign._id.toString(), tenantId);

    return campaign.save();
  }

  /**
   * Update target segment based on product targeting criteria
   * This is the core method that uses ProductAffinityService
   */
  async updateTargetSegment(
    campaignId: string,
    tenantId: string,
  ): Promise<void> {
    const campaign = await this.productCampaignModel
      .findOne({
        _id: new Types.ObjectId(campaignId),
        tenantId: new Types.ObjectId(tenantId),
      })
      .exec();

    if (!campaign) {
      throw new NotFoundException("Campaign not found");
    }

    const targetCustomers = await this.getTargetCustomersForCampaign(
      campaign,
      tenantId,
    );

    campaign.targetCustomerIds = targetCustomers.map(
      (c) => new Types.ObjectId(c.customerId),
    );
    campaign.estimatedReach = targetCustomers.length;
    campaign.segmentGeneratedAt = new Date();

    await campaign.save();

    this.logger.log(
      `Updated segment for campaign ${campaign.name}: ${targetCustomers.length} customers`,
    );
  }

  /**
   * Get target customers for a campaign using ProductAffinityService
   * This method implements the campaign's targeting logic
   */
  async getTargetCustomersForCampaign(
    campaign: ProductCampaign,
    tenantId: string,
  ): Promise<any[]> {
    if (!campaign.productTargeting || campaign.productTargeting.length === 0) {
      return [];
    }

    const allCustomerSets: any[][] = [];

    // Get customers for each product in targeting criteria
    for (const targeting of campaign.productTargeting) {
      const customers = await this.getCustomersForProduct(targeting, tenantId);
      allCustomerSets.push(customers);
    }

    // Apply targeting logic (ANY or ALL)
    let targetCustomers: any[];

    if (campaign.targetingLogic === "ALL") {
      // Customers who purchased ALL targeted products
      targetCustomers = this.intersectCustomerSets(allCustomerSets);
    } else {
      // Customers who purchased ANY of the targeted products (default)
      targetCustomers = this.unionCustomerSets(allCustomerSets);
    }

    return targetCustomers;
  }

  /**
   * Get customers for a specific product with filters
   * PHASE 3: Updated to use CustomerProductAffinity cache
   */
  private async getCustomersForProduct(
    targeting: any,
    tenantId: string,
  ): Promise<any[]> {
    // === PHASE 3: Use CustomerProductAffinity cache for advanced filtering ===
    if (this.hasAdvancedAffinityFilters(targeting)) {
      return this.getCustomersFromAffinityCache(targeting, tenantId);
    }

    // === PHASE 1: Fallback to ProductAffinity matrix for basic filters ===
    const filters: any = {};

    if (targeting.minPurchaseCount) {
      filters.minPurchaseCount = targeting.minPurchaseCount;
    }

    if (targeting.minTotalSpent) {
      filters.minTotalSpent = targeting.minTotalSpent;
    }

    if (targeting.purchaseWindowStart) {
      filters.startDate = targeting.purchaseWindowStart;
    }

    if (targeting.purchaseWindowEnd) {
      filters.endDate = targeting.purchaseWindowEnd;
    }

    // Get customers from ProductAffinity matrix
    const result = await this.productAffinityService.getProductCustomerMatrix(
      targeting.productId.toString(),
      tenantId,
      filters,
    );

    let customers = result.customers || [];

    // Apply daysSinceLastPurchase filter if specified
    if (targeting.maxDaysSinceLastPurchase !== undefined) {
      const cutoffDate = new Date();
      cutoffDate.setDate(
        cutoffDate.getDate() - targeting.maxDaysSinceLastPurchase,
      );

      customers = customers.filter(
        (c: any) => new Date(c.lastPurchaseDate) >= cutoffDate,
      );
    }

    // Add customerId field for easier manipulation
    return customers.map((c: any) => ({
      customerId: c.customerId,
      ...c,
    }));
  }

  /**
   * Check if targeting criteria uses advanced affinity filters
   * PHASE 3: New method
   */
  private hasAdvancedAffinityFilters(targeting: any): boolean {
    return !!(
      targeting.minAffinityScore ||
      targeting.maxAffinityScore ||
      targeting.customerSegments?.length ||
      targeting.engagementLevels?.length ||
      targeting.includeRepurchasePredictions ||
      targeting.minPurchaseFrequencyDays ||
      targeting.maxPurchaseFrequencyDays ||
      targeting.minAverageQuantity ||
      targeting.maxAverageQuantity ||
      targeting.minAverageOrderValue ||
      targeting.maxAverageOrderValue
    );
  }

  /**
   * Get customers from CustomerProductAffinity cache with advanced filters
   * PHASE 3: New method that uses CustomerProductAffinity
   */
  private async getCustomersFromAffinityCache(
    targeting: any,
    tenantId: string,
  ): Promise<any[]> {
    // Import CustomerProductAffinity model
    const customerProductAffinityModel = this.productCampaignModel.db.model(
      "CustomerProductAffinity",
    );

    // Build query
    const query: any = {
      tenantId: tenantId,
      productId: new Types.ObjectId(targeting.productId),
    };

    // Affinity Score Filters
    if (targeting.minAffinityScore !== undefined) {
      query.affinityScore = { $gte: targeting.minAffinityScore };
    }
    if (targeting.maxAffinityScore !== undefined) {
      query.affinityScore = {
        ...query.affinityScore,
        $lte: targeting.maxAffinityScore,
      };
    }

    // Customer Segment Filters
    if (targeting.customerSegments && targeting.customerSegments.length > 0) {
      query.customerSegment = { $in: targeting.customerSegments };
    }

    // Engagement Level Filters
    if (targeting.engagementLevels && targeting.engagementLevels.length > 0) {
      query.engagementLevel = { $in: targeting.engagementLevels };
    }

    // Purchase Count Filters
    if (targeting.minPurchaseCount !== undefined) {
      query.purchaseCount = { $gte: targeting.minPurchaseCount };
    }
    if (targeting.maxPurchaseCount !== undefined) {
      query.purchaseCount = {
        ...query.purchaseCount,
        $lte: targeting.maxPurchaseCount,
      };
    }

    // Purchase Frequency Filters
    if (targeting.minPurchaseFrequencyDays !== undefined) {
      query.purchaseFrequencyDays = { $gte: targeting.minPurchaseFrequencyDays };
    }
    if (targeting.maxPurchaseFrequencyDays !== undefined) {
      query.purchaseFrequencyDays = {
        ...query.purchaseFrequencyDays,
        $lte: targeting.maxPurchaseFrequencyDays,
      };
    }

    // Days Since Last Purchase Filters
    if (targeting.minDaysSinceLastPurchase !== undefined) {
      query.daysSinceLastPurchase = { $gte: targeting.minDaysSinceLastPurchase };
    }
    if (targeting.maxDaysSinceLastPurchase !== undefined) {
      query.daysSinceLastPurchase = {
        ...query.daysSinceLastPurchase,
        $lte: targeting.maxDaysSinceLastPurchase,
      };
    }

    // Total Spent Filters
    if (targeting.minTotalSpent !== undefined) {
      query.totalSpent = { $gte: targeting.minTotalSpent };
    }
    if (targeting.maxTotalSpent !== undefined) {
      query.totalSpent = { ...query.totalSpent, $lte: targeting.maxTotalSpent };
    }

    // Quantity Filters
    if (targeting.minTotalQuantity !== undefined) {
      query.totalQuantityPurchased = { $gte: targeting.minTotalQuantity };
    }
    if (targeting.maxTotalQuantity !== undefined) {
      query.totalQuantityPurchased = {
        ...query.totalQuantityPurchased,
        $lte: targeting.maxTotalQuantity,
      };
    }

    // Average Quantity Filters
    if (targeting.minAverageQuantity !== undefined) {
      query.averageQuantity = { $gte: targeting.minAverageQuantity };
    }
    if (targeting.maxAverageQuantity !== undefined) {
      query.averageQuantity = {
        ...query.averageQuantity,
        $lte: targeting.maxAverageQuantity,
      };
    }

    // Average Order Value Filters
    if (targeting.minAverageOrderValue !== undefined) {
      query.averageOrderValue = { $gte: targeting.minAverageOrderValue };
    }
    if (targeting.maxAverageOrderValue !== undefined) {
      query.averageOrderValue = {
        ...query.averageOrderValue,
        $lte: targeting.maxAverageOrderValue,
      };
    }

    // Predictive Filters
    if (targeting.includeRepurchasePredictions) {
      const windowDays = targeting.repurchaseWindowDays || 7;
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + windowDays);

      query.nextPredictedPurchaseDate = {
        $exists: true,
        $lte: futureDate,
      };
    }

    // Acquisition vs Retention
    if (targeting.neverPurchasedProduct === true) {
      // This requires a different approach - find customers who DON'T have affinity record
      // This is complex, so we'll handle it separately
      return this.getCustomersWhoNeverPurchasedProduct(
        targeting.productId,
        tenantId,
      );
    }

    // Execute query
    const affinities = await customerProductAffinityModel
      .find(query)
      .sort({ affinityScore: -1 })
      .lean();

    // Map to customer format
    return affinities.map((affinity: any) => ({
      customerId: affinity.customerId,
      customerName: affinity.customerName,
      affinityScore: affinity.affinityScore,
      purchaseCount: affinity.purchaseCount,
      totalSpent: affinity.totalSpent,
      lastPurchaseDate: affinity.lastPurchaseDate,
      daysSinceLastPurchase: affinity.daysSinceLastPurchase,
      customerSegment: affinity.customerSegment,
      engagementLevel: affinity.engagementLevel,
      averageOrderValue: affinity.averageOrderValue,
      averageQuantity: affinity.averageQuantity,
      totalQuantityPurchased: affinity.totalQuantityPurchased,
      purchaseFrequencyDays: affinity.purchaseFrequencyDays,
      nextPredictedPurchaseDate: affinity.nextPredictedPurchaseDate,
    }));
  }

  /**
   * Get customers who never purchased a specific product
   * PHASE 3: New method for acquisition campaigns
   */
  private async getCustomersWhoNeverPurchasedProduct(
    productId: string,
    tenantId: string,
  ): Promise<any[]> {
    const customerProductAffinityModel = this.productCampaignModel.db.model(
      "CustomerProductAffinity",
    );

    // Get all customers who HAVE purchased this product
    const customersWithAffinity = await customerProductAffinityModel
      .find({
        tenantId: tenantId,
        productId: new Types.ObjectId(productId),
      })
      .select("customerId")
      .lean();

    // Get all customers who DON'T have affinity (never purchased)
    const allCustomers = await this.customerModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        _id: { $nin: customersWithAffinity.map((a: any) => a.customerId) },
      })
      .select("_id name contacts")
      .lean();

    return allCustomers.map((customer: any) => ({
      customerId: customer._id,
      customerName: customer.name,
      affinityScore: 0,
      purchaseCount: 0,
      totalSpent: 0,
      customerSegment: "new",
      engagementLevel: "low",
    }));
  }

  /**
   * Calculate audience insights for a campaign
   * PHASE 3: New method for audience preview
   */
  async calculateAudienceInsights(
    campaignId: string,
    tenantId: string,
  ): Promise<any> {
    const campaign = await this.getCampaignById(campaignId, tenantId);
    const targetCustomers = await this.getTargetCustomersForCampaign(
      campaign,
      tenantId,
    );

    if (targetCustomers.length === 0) {
      return {
        totalMatchingCustomers: 0,
        segmentDistribution: {},
        engagementDistribution: {},
        averageAffinityScore: 0,
        averagePurchaseFrequency: 0,
        totalPotentialRevenue: 0,
        estimatedConversionRate: 0,
        estimatedRevenue: 0,
        topCustomerIds: [],
      };
    }

    // Calculate distributions
    const segmentDistribution: Record<string, number> = {};
    const engagementDistribution: Record<string, number> = {};
    let totalAffinityScore = 0;
    let totalPurchaseFrequency = 0;
    let totalPotentialRevenue = 0;
    let customersWithFrequency = 0;

    for (const customer of targetCustomers) {
      // Segment distribution
      const segment = customer.customerSegment || "unknown";
      segmentDistribution[segment] = (segmentDistribution[segment] || 0) + 1;

      // Engagement distribution
      const engagement = customer.engagementLevel || "unknown";
      engagementDistribution[engagement] =
        (engagementDistribution[engagement] || 0) + 1;

      // Affinity score
      if (customer.affinityScore) {
        totalAffinityScore += customer.affinityScore;
      }

      // Purchase frequency
      if (customer.purchaseFrequencyDays && customer.purchaseFrequencyDays > 0) {
        totalPurchaseFrequency += customer.purchaseFrequencyDays;
        customersWithFrequency++;
      }

      // Potential revenue (based on average order value)
      if (customer.averageOrderValue) {
        totalPotentialRevenue += customer.averageOrderValue;
      }
    }

    const averageAffinityScore = totalAffinityScore / targetCustomers.length;
    const averagePurchaseFrequency =
      customersWithFrequency > 0
        ? totalPurchaseFrequency / customersWithFrequency
        : 0;

    // Estimated conversion rate (simple heuristic based on affinity score)
    // Higher affinity = higher conversion
    const estimatedConversionRate = Math.min(
      50,
      (averageAffinityScore / 100) * 50,
    ); // Max 50% conversion

    const estimatedRevenue =
      totalPotentialRevenue * (estimatedConversionRate / 100);

    // Top customers by affinity score
    const topCustomerIds = targetCustomers
      .sort((a, b) => (b.affinityScore || 0) - (a.affinityScore || 0))
      .slice(0, 10)
      .map((c) => c.customerId.toString());

    return {
      totalMatchingCustomers: targetCustomers.length,
      segmentDistribution,
      engagementDistribution,
      averageAffinityScore: Math.round(averageAffinityScore),
      averagePurchaseFrequency: Math.round(averagePurchaseFrequency),
      totalPotentialRevenue: Math.round(totalPotentialRevenue),
      estimatedConversionRate: Math.round(estimatedConversionRate),
      estimatedRevenue: Math.round(estimatedRevenue),
      topCustomerIds,
    };
  }

  /**
   * Test audience criteria without creating a campaign (preview)
   * PHASE 3: New method for testing targeting criteria
   */
  async testAudienceCriteria(
    productTargeting: any[],
    targetingLogic: string,
    tenantId: string,
  ): Promise<any> {
    // Create a temporary campaign object for testing
    const tempCampaign: any = {
      productTargeting,
      targetingLogic: targetingLogic || "ANY",
    };

    const targetCustomers = await this.getTargetCustomersForCampaign(
      tempCampaign,
      tenantId,
    );

    // Calculate insights for preview
    const segmentDistribution: Record<string, number> = {};
    const engagementDistribution: Record<string, number> = {};
    let totalAffinityScore = 0;

    for (const customer of targetCustomers) {
      const segment = customer.customerSegment || "unknown";
      segmentDistribution[segment] = (segmentDistribution[segment] || 0) + 1;

      const engagement = customer.engagementLevel || "unknown";
      engagementDistribution[engagement] =
        (engagementDistribution[engagement] || 0) + 1;

      if (customer.affinityScore) {
        totalAffinityScore += customer.affinityScore;
      }
    }

    const averageAffinityScore =
      targetCustomers.length > 0 ? totalAffinityScore / targetCustomers.length : 0;

    return {
      totalMatchingCustomers: targetCustomers.length,
      segmentDistribution,
      engagementDistribution,
      averageAffinityScore: Math.round(averageAffinityScore),
      sampleCustomers: targetCustomers.slice(0, 10), // First 10 for preview
    };
  }

  /**
   * Union of customer sets (customers in ANY product)
   */
  private unionCustomerSets(customerSets: any[][]): any[] {
    const customerMap = new Map();

    for (const set of customerSets) {
      for (const customer of set) {
        const id = customer.customerId.toString();
        if (!customerMap.has(id)) {
          customerMap.set(id, customer);
        }
      }
    }

    return Array.from(customerMap.values());
  }

  /**
   * Intersection of customer sets (customers in ALL products)
   */
  private intersectCustomerSets(customerSets: any[][]): any[] {
    if (customerSets.length === 0) return [];
    if (customerSets.length === 1) return customerSets[0];

    // Start with first set
    const result = new Map();
    for (const customer of customerSets[0]) {
      result.set(customer.customerId.toString(), customer);
    }

    // Check intersection with other sets
    for (let i = 1; i < customerSets.length; i++) {
      const setIds = new Set(
        customerSets[i].map((c) => c.customerId.toString()),
      );

      // Keep only customers that appear in this set
      for (const [id, customer] of result.entries()) {
        if (!setIds.has(id)) {
          result.delete(id);
        }
      }
    }

    return Array.from(result.values());
  }

  /**
   * Get campaign by ID
   */
  async getCampaignById(
    campaignId: string,
    tenantId: string,
  ): Promise<ProductCampaignDocument> {
    const campaign = await this.productCampaignModel
      .findOne({
        _id: new Types.ObjectId(campaignId),
        tenantId: new Types.ObjectId(tenantId),
      })
      .exec();

    if (!campaign) {
      throw new NotFoundException("Campaign not found");
    }

    return campaign;
  }

  /**
   * Get all campaigns
   */
  async getAllCampaigns(
    tenantId: string,
    filters?: {
      status?: string;
      productId?: string;
    },
  ): Promise<ProductCampaign[]> {
    const query: any = {
      tenantId: new Types.ObjectId(tenantId),
    };

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.productId) {
      query["productTargeting.productId"] = new Types.ObjectId(
        filters.productId,
      );
    }

    return this.productCampaignModel
      .find(query)
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Update campaign
   */
  async updateCampaign(
    campaignId: string,
    tenantId: string,
    updates: Partial<ProductCampaign>,
  ): Promise<ProductCampaign> {
    const campaign = await this.productCampaignModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(campaignId),
          tenantId: new Types.ObjectId(tenantId),
        },
        { $set: updates },
        { new: true },
      )
      .exec();

    if (!campaign) {
      throw new NotFoundException("Campaign not found");
    }

    // If product targeting changed, regenerate segment
    if (updates.productTargeting) {
      await this.updateTargetSegment(campaignId, tenantId);
    }

    return campaign;
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(campaignId: string, tenantId: string): Promise<void> {
    const result = await this.productCampaignModel
      .deleteOne({
        _id: new Types.ObjectId(campaignId),
        tenantId: new Types.ObjectId(tenantId),
      })
      .exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException("Campaign not found");
    }
  }

  /**
   * Launch campaign (change status to running and start sending)
   */
  async launchCampaign(
    campaignId: string,
    tenantId: string,
  ): Promise<ProductCampaign> {
    const campaign = await this.productCampaignModel
      .findOne({
        _id: new Types.ObjectId(campaignId),
        tenantId: new Types.ObjectId(tenantId),
      })
      .exec();

    if (!campaign) {
      throw new NotFoundException("Campaign not found");
    }

    if (campaign.status !== "draft" && campaign.status !== "scheduled") {
      throw new Error("Campaign must be in draft or scheduled status to launch");
    }

    // Refresh target segment before launching
    await this.updateTargetSegment(campaignId, tenantId);

    campaign.status = "running";
    campaign.startedAt = new Date();

    await campaign.save();

    this.logger.log(
      `Campaign ${campaign.name} launched with ${campaign.estimatedReach} recipients`,
    );

    // Send campaign messages to all target customers
    await this.sendCampaignMessages(campaign, tenantId);

    return campaign;
  }

  /**
   * Send campaign messages to all target customers
   */
  private async sendCampaignMessages(
    campaign: ProductCampaign,
    tenantId: string,
  ): Promise<void> {
    if (!campaign.targetCustomerIds || campaign.targetCustomerIds.length === 0) {
      this.logger.warn(`Campaign ${campaign.name} has no target customers`);
      return;
    }

    // Get customer contact information
    const customers = await this.customerModel
      .find({
        _id: { $in: campaign.targetCustomerIds },
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
    await this.trackPerformance(
      (campaign as any)._id.toString(),
      tenantId,
      {
        sent: sentCount,
        delivered: deliveredCount,
      },
    );

    this.logger.log(
      `Campaign "${campaign.name}" sent: ${sentCount}/${customers.length} messages delivered`,
    );

    if (errors.length > 0) {
      this.logger.warn(
        `Campaign "${campaign.name}" had ${errors.length} errors:\n${errors.slice(0, 5).join("\n")}${errors.length > 5 ? `\n... and ${errors.length - 5} more` : ""}`,
      );
    }
  }

  /**
   * Send campaign to a single customer
   */
  private async sendCampaignToCustomer(
    campaign: ProductCampaign,
    customer: any,
    tenantId: string,
  ): Promise<{ success: boolean; delivered: boolean; error?: string }> {
    // Prepare campaign message context
    const context = this.prepareCampaignContext(campaign, customer);

    // Type-safe channel validation
    const validChannels = ["email", "sms", "whatsapp"] as const;
    type ValidChannel = typeof validChannels[number];

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
      // Determine channels to send to
      const channels: Array<"email" | "sms" | "whatsapp"> = [channel];

      // Send notification using NotificationsService
      const results = await this.notificationsService.sendTemplateNotification(
        {
          tenantId,
          customerId: customer._id.toString(),
          templateId: "product-campaign", // Generic template ID
          channels,
          context,
          customerEmail: channel === "email" ? contact : null,
          customerPhone: channel === "sms" ? contact : null,
          whatsappChatId:
            channel === "whatsapp"
              ? customer.whatsappChatId || contact
              : null,
        },
        {
          engagementDelta: 5, // Marketing campaigns give +5 engagement
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
   * Prepare campaign message context
   */
  private prepareCampaignContext(
    campaign: ProductCampaign,
    customer: any,
  ): Record<string, any> {
    const productNames = campaign.productTargeting
      .map((t) => t.productName)
      .join(", ");

    return {
      customerName: customer.name || "Cliente",
      campaignName: campaign.name,
      campaignSubject: campaign.subject || `Oferta especial: ${productNames}`,
      campaignMessage: campaign.message || this.generateDefaultMessage(campaign),
      productNames,
      offerType: campaign.offer?.type || "especial",
      offerValue: campaign.offer?.value || 0,
      offerPercentage:
        campaign.offer?.type === "percentage" ? campaign.offer.value : null,
      offerAmount:
        campaign.offer?.type === "fixed_amount" ? campaign.offer.value : null,
      couponCode: campaign.offer?.couponCode || null,
      expiresAt: campaign.offer?.expiresAt || null,
      hotelName: "SmartKubik", // Default tenant name
    };
  }

  /**
   * Generate default campaign message
   */
  private generateDefaultMessage(campaign: ProductCampaign): string {
    const productNames = campaign.productTargeting
      .map((t) => t.productName)
      .join(", ");

    let message = `¡Hola! Tenemos una oferta especial para ti en ${productNames}. `;

    if (campaign.offer) {
      if (campaign.offer.type === "percentage") {
        message += `Obtén ${campaign.offer.value}% de descuento`;
      } else if (campaign.offer.type === "fixed_amount") {
        message += `Obtén $${campaign.offer.value} de descuento`;
      } else {
        message += `Aprovecha nuestra oferta especial`;
      }

      if (campaign.offer.couponCode) {
        message += ` usando el código ${campaign.offer.couponCode}`;
      }

      if (campaign.offer.expiresAt) {
        const expiresDate = new Date(campaign.offer.expiresAt).toLocaleDateString(
          "es-ES",
        );
        message += `. Válido hasta ${expiresDate}`;
      }
    }

    message += ". ¡No te lo pierdas!";

    return message;
  }

  /**
   * Get customer contact for specific channel
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
          (c: any) =>
            (c.type === "phone" || c.type === "mobile") && c.isActive,
        );
        return phoneContact?.value || customer.whatsappNumber || null;

      default:
        return null;
    }
  }

  /**
   * Track campaign performance
   */
  async trackPerformance(
    campaignId: string,
    tenantId: string,
    metrics: {
      sent?: number;
      delivered?: number;
      opened?: number;
      clicked?: number;
      orders?: number;
      revenue?: number;
    },
  ): Promise<ProductCampaign> {
    const campaign = await this.getCampaignById(campaignId, tenantId);

    const updates: any = {};
    if (metrics.sent) updates.$inc = { ...updates.$inc, totalSent: metrics.sent };
    if (metrics.delivered) updates.$inc = { ...updates.$inc, totalDelivered: metrics.delivered };
    if (metrics.opened) updates.$inc = { ...updates.$inc, totalOpened: metrics.opened };
    if (metrics.clicked) updates.$inc = { ...updates.$inc, totalClicked: metrics.clicked };
    if (metrics.orders) updates.$inc = { ...updates.$inc, totalOrders: metrics.orders };
    if (metrics.revenue) updates.$inc = { ...updates.$inc, totalRevenue: metrics.revenue };

    // Calculate new totals for ROI
    const newTotalRevenue = campaign.totalRevenue + (metrics.revenue || 0);
    if (campaign.cost > 0) {
      updates.$set = { roi: ((newTotalRevenue - campaign.cost) / campaign.cost) * 100 };
    }

    const updated = await this.productCampaignModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(campaignId),
          tenantId: new Types.ObjectId(tenantId),
        },
        updates,
        { new: true },
      )
      .exec();

    return updated!;
  }

  /**
   * Get campaign performance summary
   */
  async getPerformanceSummary(
    campaignId: string,
    tenantId: string,
  ): Promise<any> {
    const campaign = await this.getCampaignById(campaignId, tenantId);

    const openRate =
      campaign.totalDelivered > 0
        ? (campaign.totalOpened / campaign.totalDelivered) * 100
        : 0;

    const clickRate =
      campaign.totalOpened > 0
        ? (campaign.totalClicked / campaign.totalOpened) * 100
        : 0;

    const conversionRate =
      campaign.totalDelivered > 0
        ? (campaign.totalOrders / campaign.totalDelivered) * 100
        : 0;

    return {
      campaignId: campaignId,
      campaignName: campaign.name,
      status: campaign.status,
      estimatedReach: campaign.estimatedReach,
      totalSent: campaign.totalSent,
      totalDelivered: campaign.totalDelivered,
      totalOpened: campaign.totalOpened,
      totalClicked: campaign.totalClicked,
      totalOrders: campaign.totalOrders,
      totalRevenue: campaign.totalRevenue,
      cost: campaign.cost,
      roi: campaign.roi,
      openRate: openRate.toFixed(2) + "%",
      clickRate: clickRate.toFixed(2) + "%",
      conversionRate: conversionRate.toFixed(2) + "%",
      productPerformance: campaign.productPerformance,
    };
  }

  // ========================================================================
  // PHASE 4: A/B TESTING & CAMPAIGN OPTIMIZATION
  // ========================================================================

  /**
   * Create A/B Test Campaign with variants
   */
  async createAbTestCampaign(
    data: any,
    tenantId: string,
    createdBy?: string,
  ): Promise<ProductCampaign> {
    // Validate variants traffic percentages sum to 100
    const totalTraffic = data.variants.reduce(
      (sum: number, v: any) => sum + v.trafficPercentage,
      0,
    );

    if (Math.abs(totalTraffic - 100) > 0.1) {
      throw new Error(
        `Variant traffic percentages must sum to 100% (currently ${totalTraffic}%)`,
      );
    }

    // Create campaign with A/B test flag
    const campaign = new this.productCampaignModel({
      ...data,
      tenantId: new Types.ObjectId(tenantId),
      createdBy: createdBy ? new Types.ObjectId(createdBy) : undefined,
      status: "draft",
      isAbTest: true,
      testStartDate: null,
      testEndDate: null,
    });

    // Auto-generate target segment
    await this.updateTargetSegment(campaign._id.toString(), tenantId);

    // Assign customers to variants based on traffic percentages
    await this.assignCustomersToVariants(campaign._id.toString(), tenantId);

    return campaign.save();
  }

  /**
   * Assign customers to variants based on traffic allocation
   */
  async assignCustomersToVariants(
    campaignId: string,
    tenantId: string,
  ): Promise<void> {
    const campaign = await this.productCampaignModel
      .findOne({
        _id: new Types.ObjectId(campaignId),
        tenantId: new Types.ObjectId(tenantId),
      })
      .exec();

    if (!campaign) {
      throw new NotFoundException("Campaign not found");
    }

    if (!campaign.isAbTest || !campaign.variants || campaign.variants.length === 0) {
      return;
    }

    const customerIds = campaign.targetCustomerIds;
    if (!customerIds || customerIds.length === 0) {
      this.logger.warn(`Campaign ${campaign.name} has no target customers`);
      return;
    }

    // Shuffle customer IDs for random assignment
    const shuffledIds = [...customerIds].sort(() => Math.random() - 0.5);

    let assignedCount = 0;

    // Assign customers to variants based on traffic percentages
    for (const variant of campaign.variants) {
      const variantSize = Math.floor(
        (shuffledIds.length * variant.trafficPercentage) / 100,
      );
      const variantCustomers = shuffledIds.slice(
        assignedCount,
        assignedCount + variantSize,
      );

      variant.assignedCustomerIds = variantCustomers.map(
        (id) => new Types.ObjectId(id),
      );

      assignedCount += variantSize;

      this.logger.log(
        `Assigned ${variantCustomers.length} customers to variant "${variant.variantName}"`,
      );
    }

    // Assign remaining customers to last variant (due to rounding)
    if (assignedCount < shuffledIds.length) {
      const remaining = shuffledIds.slice(assignedCount);
      const lastVariant = campaign.variants[campaign.variants.length - 1];
      lastVariant.assignedCustomerIds.push(
        ...remaining.map((id) => new Types.ObjectId(id)),
      );

      this.logger.log(
        `Assigned ${remaining.length} remaining customers to variant "${lastVariant.variantName}"`,
      );
    }

    await campaign.save();
  }

  /**
   * Add a new variant to an existing A/B test campaign
   */
  async addVariant(
    campaignId: string,
    tenantId: string,
    variantData: any,
  ): Promise<ProductCampaign> {
    const campaign = await this.getCampaignById(campaignId, tenantId);

    if (!campaign.isAbTest) {
      throw new Error("Can only add variants to A/B test campaigns");
    }

    if (campaign.status !== "draft") {
      throw new Error("Can only add variants to draft campaigns");
    }

    // Check if variant name already exists
    const existingVariant = campaign.variants.find(
      (v) => v.variantName === variantData.variantName,
    );

    if (existingVariant) {
      throw new Error(`Variant "${variantData.variantName}" already exists`);
    }

    // Validate new traffic allocation
    const currentTotalTraffic = campaign.variants.reduce(
      (sum, v) => sum + v.trafficPercentage,
      0,
    );
    const newTotalTraffic = currentTotalTraffic + variantData.trafficPercentage;

    if (newTotalTraffic > 100) {
      throw new Error(
        `Traffic allocation exceeds 100% (current: ${currentTotalTraffic}%, adding: ${variantData.trafficPercentage}%)`,
      );
    }

    // Add variant
    campaign.variants.push(variantData);
    await campaign.save();

    // Re-assign customers to variants
    await this.assignCustomersToVariants(campaignId, tenantId);

    return campaign;
  }

  /**
   * Update an existing variant
   */
  async updateVariant(
    campaignId: string,
    variantName: string,
    tenantId: string,
    updates: any,
  ): Promise<ProductCampaign> {
    const campaign = await this.getCampaignById(campaignId, tenantId);

    const variant = campaign.variants.find((v) => v.variantName === variantName);

    if (!variant) {
      throw new NotFoundException(`Variant "${variantName}" not found`);
    }

    if (campaign.status === "running" || campaign.status === "completed") {
      // Only allow status updates for running/completed campaigns
      if (Object.keys(updates).some((key) => key !== "status")) {
        throw new Error(
          "Can only update variant status for running or completed campaigns",
        );
      }
    }

    // Apply updates
    Object.assign(variant, updates);

    // If traffic percentage changed, re-assign customers
    if (updates.trafficPercentage !== undefined) {
      await this.assignCustomersToVariants(campaignId, tenantId);
    }

    await campaign.save();
    return campaign;
  }

  /**
   * Remove a variant from an A/B test campaign
   */
  async removeVariant(
    campaignId: string,
    variantName: string,
    tenantId: string,
  ): Promise<ProductCampaign> {
    const campaign = await this.getCampaignById(campaignId, tenantId);

    if (campaign.status !== "draft") {
      throw new Error("Can only remove variants from draft campaigns");
    }

    const variantIndex = campaign.variants.findIndex(
      (v) => v.variantName === variantName,
    );

    if (variantIndex === -1) {
      throw new NotFoundException(`Variant "${variantName}" not found`);
    }

    if (campaign.variants.length <= 2) {
      throw new Error("A/B test must have at least 2 variants");
    }

    campaign.variants.splice(variantIndex, 1);
    await campaign.save();

    // Re-assign customers to remaining variants
    await this.assignCustomersToVariants(campaignId, tenantId);

    return campaign;
  }

  /**
   * Launch A/B test campaign (start sending to variants)
   */
  async launchAbTestCampaign(
    campaignId: string,
    tenantId: string,
  ): Promise<ProductCampaign> {
    const campaign = await this.getCampaignById(campaignId, tenantId);

    if (!campaign.isAbTest) {
      throw new Error("Campaign is not an A/B test");
    }

    if (campaign.status !== "draft" && campaign.status !== "scheduled") {
      throw new Error("Campaign must be in draft or scheduled status to launch");
    }

    if (!campaign.variants || campaign.variants.length < 2) {
      throw new Error("A/B test must have at least 2 variants");
    }

    // Refresh target segment and re-assign to variants
    await this.updateTargetSegment(campaignId, tenantId);
    await this.assignCustomersToVariants(campaignId, tenantId);

    campaign.status = "running";
    campaign.startedAt = new Date();
    campaign.testStartDate = new Date();

    await campaign.save();

    this.logger.log(
      `A/B Test Campaign ${campaign.name} launched with ${campaign.variants.length} variants`,
    );

    // Send campaign messages for each variant
    await this.sendAbTestCampaignMessages(campaign, tenantId);

    return campaign;
  }

  /**
   * Send A/B test campaign messages to all variants
   */
  private async sendAbTestCampaignMessages(
    campaign: ProductCampaign,
    tenantId: string,
  ): Promise<void> {
    for (const variant of campaign.variants) {
      if (variant.status !== "active") {
        this.logger.log(
          `Skipping variant "${variant.variantName}" (status: ${variant.status})`,
        );
        continue;
      }

      if (!variant.assignedCustomerIds || variant.assignedCustomerIds.length === 0) {
        this.logger.warn(`Variant "${variant.variantName}" has no assigned customers`);
        continue;
      }

      // Get customer contact information
      const customers = await this.customerModel
        .find({
          _id: { $in: variant.assignedCustomerIds },
          tenantId: new Types.ObjectId(tenantId),
        })
        .select("_id name contacts preferences whatsappChatId whatsappNumber")
        .lean();

      this.logger.log(
        `Sending variant "${variant.variantName}" to ${customers.length} customers via ${campaign.channel}`,
      );

      let sentCount = 0;
      let deliveredCount = 0;

      // Send to each customer
      for (const customer of customers) {
        try {
          const result = await this.sendVariantToCustomer(
            campaign,
            variant,
            customer,
            tenantId,
          );

          if (result.success) {
            sentCount++;
            if (result.delivered) deliveredCount++;
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Error sending variant "${variant.variantName}" to customer ${customer._id}: ${message}`,
          );
        }
      }

      // Update variant metrics
      await this.trackVariantPerformance(
        (campaign as any)._id.toString(),
        variant.variantName,
        tenantId,
        {
          sent: sentCount,
          delivered: deliveredCount,
        },
      );

      this.logger.log(
        `Variant "${variant.variantName}" sent: ${sentCount}/${customers.length} messages delivered`,
      );
    }
  }

  /**
   * Send variant to a single customer
   */
  private async sendVariantToCustomer(
    campaign: ProductCampaign,
    variant: any,
    customer: any,
    tenantId: string,
  ): Promise<{ success: boolean; delivered: boolean; error?: string }> {
    // Prepare variant message context
    const context = this.prepareVariantContext(campaign, variant, customer);

    // Type-safe channel validation
    const validChannels = ["email", "sms", "whatsapp"] as const;
    type ValidChannel = typeof validChannels[number];

    if (!validChannels.includes(campaign.channel as ValidChannel)) {
      return {
        success: false,
        delivered: false,
        error: `Invalid channel: ${campaign.channel}`,
      };
    }

    const channel = campaign.channel as ValidChannel;
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

      const results = await this.notificationsService.sendTemplateNotification(
        {
          tenantId,
          customerId: customer._id.toString(),
          templateId: "product-campaign",
          channels,
          context,
          customerEmail: channel === "email" ? contact : null,
          customerPhone: channel === "sms" ? contact : null,
          whatsappChatId:
            channel === "whatsapp"
              ? customer.whatsappChatId || contact
              : null,
        },
        {
          engagementDelta: 5,
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
   * Prepare variant message context
   */
  private prepareVariantContext(
    campaign: ProductCampaign,
    variant: any,
    customer: any,
  ): Record<string, any> {
    const productNames = campaign.productTargeting
      .map((t) => t.productName)
      .join(", ");

    return {
      customerName: customer.name || "Cliente",
      campaignName: campaign.name,
      variantName: variant.variantName,
      campaignSubject: variant.subject || campaign.subject || `Oferta especial: ${productNames}`,
      campaignMessage: variant.message || this.generateDefaultMessage(campaign),
      productNames,
      offerType: variant.offer?.type || campaign.offer?.type || "especial",
      offerValue: variant.offer?.value || campaign.offer?.value || 0,
      offerPercentage:
        variant.offer?.type === "percentage"
          ? variant.offer.value
          : campaign.offer?.type === "percentage"
            ? campaign.offer.value
            : null,
      offerAmount:
        variant.offer?.type === "fixed_amount"
          ? variant.offer.value
          : campaign.offer?.type === "fixed_amount"
            ? campaign.offer.value
            : null,
      couponCode: variant.offer?.couponCode || campaign.offer?.couponCode || null,
      expiresAt: variant.offer?.expiresAt || campaign.offer?.expiresAt || null,
      hotelName: "SmartKubik",
    };
  }

  /**
   * Track variant performance metrics
   */
  async trackVariantPerformance(
    campaignId: string,
    variantName: string,
    tenantId: string,
    metrics: {
      sent?: number;
      delivered?: number;
      opened?: number;
      clicked?: number;
      orders?: number;
      revenue?: number;
    },
  ): Promise<ProductCampaign> {
    const campaign = await this.getCampaignById(campaignId, tenantId);

    const variant = campaign.variants.find((v) => v.variantName === variantName);

    if (!variant) {
      throw new NotFoundException(`Variant "${variantName}" not found`);
    }

    // Update variant metrics
    if (metrics.sent) variant.totalSent += metrics.sent;
    if (metrics.delivered) variant.totalDelivered += metrics.delivered;
    if (metrics.opened) variant.totalOpened += metrics.opened;
    if (metrics.clicked) variant.totalClicked += metrics.clicked;
    if (metrics.orders) variant.totalOrders += metrics.orders;
    if (metrics.revenue) variant.totalRevenue += metrics.revenue;

    // Calculate rates
    variant.openRate =
      variant.totalDelivered > 0
        ? (variant.totalOpened / variant.totalDelivered) * 100
        : 0;

    variant.clickRate =
      variant.totalOpened > 0
        ? (variant.totalClicked / variant.totalOpened) * 100
        : 0;

    variant.conversionRate =
      variant.totalDelivered > 0
        ? (variant.totalOrders / variant.totalDelivered) * 100
        : 0;

    variant.revenuePerRecipient =
      variant.totalSent > 0 ? variant.totalRevenue / variant.totalSent : 0;

    await campaign.save();

    // Check if we should auto-select winner
    if (campaign.autoSelectWinner) {
      await this.checkAndSelectWinner(campaignId, tenantId);
    }

    return campaign;
  }

  /**
   * Check if winner should be selected and select it
   */
  async checkAndSelectWinner(
    campaignId: string,
    tenantId: string,
  ): Promise<ProductCampaign | null> {
    const campaign = await this.getCampaignById(campaignId, tenantId);

    if (!campaign.isAbTest || campaign.winningVariantName) {
      return null; // Already has a winner
    }

    // Check minimum sample size
    const totalSent = campaign.variants.reduce((sum, v) => sum + v.totalSent, 0);

    if (campaign.minimumSampleSize && totalSent < campaign.minimumSampleSize) {
      return null; // Not enough data yet
    }

    // Select winner based on test metric
    const metric = campaign.testMetric || "conversion_rate";
    let bestVariant = campaign.variants[0];

    for (const variant of campaign.variants) {
      if (this.compareVariantsByMetric(variant, bestVariant, metric) > 0) {
        bestVariant = variant;
      }
    }

    // Mark winner
    campaign.winningVariantName = bestVariant.variantName;
    campaign.testEndDate = new Date();

    for (const variant of campaign.variants) {
      if (variant.variantName === bestVariant.variantName) {
        variant.status = "winner";
      } else {
        variant.status = "loser";
      }
    }

    await campaign.save();

    this.logger.log(
      `A/B Test completed for campaign "${campaign.name}". Winner: "${bestVariant.variantName}" (${metric}: ${this.getVariantMetricValue(bestVariant, metric).toFixed(2)})`,
    );

    return campaign;
  }

  /**
   * Compare two variants by a specific metric
   */
  private compareVariantsByMetric(
    variantA: any,
    variantB: any,
    metric: string,
  ): number {
    const valueA = this.getVariantMetricValue(variantA, metric);
    const valueB = this.getVariantMetricValue(variantB, metric);

    return valueA - valueB;
  }

  /**
   * Get variant metric value
   */
  private getVariantMetricValue(variant: any, metric: string): number {
    switch (metric) {
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
  }

  /**
   * Manually select winner for an A/B test
   */
  async selectWinner(
    campaignId: string,
    variantName: string,
    tenantId: string,
  ): Promise<ProductCampaign> {
    const campaign = await this.getCampaignById(campaignId, tenantId);

    if (!campaign.isAbTest) {
      throw new Error("Campaign is not an A/B test");
    }

    const winner = campaign.variants.find((v) => v.variantName === variantName);

    if (!winner) {
      throw new NotFoundException(`Variant "${variantName}" not found`);
    }

    campaign.winningVariantName = variantName;
    campaign.testEndDate = new Date();

    for (const variant of campaign.variants) {
      if (variant.variantName === variantName) {
        variant.status = "winner";
      } else {
        variant.status = "loser";
      }
    }

    await campaign.save();

    this.logger.log(
      `Winner manually selected for campaign "${campaign.name}": "${variantName}"`,
    );

    return campaign;
  }

  /**
   * Get A/B test results comparison
   */
  async getAbTestResults(campaignId: string, tenantId: string): Promise<any> {
    const campaign = await this.getCampaignById(campaignId, tenantId);

    if (!campaign.isAbTest) {
      throw new Error("Campaign is not an A/B test");
    }

    const results = campaign.variants.map((variant) => ({
      variantName: variant.variantName,
      description: variant.description,
      status: variant.status,
      trafficPercentage: variant.trafficPercentage,
      assignedCustomers: variant.assignedCustomerIds.length,
      metrics: {
        sent: variant.totalSent,
        delivered: variant.totalDelivered,
        opened: variant.totalOpened,
        clicked: variant.totalClicked,
        orders: variant.totalOrders,
        revenue: variant.totalRevenue,
        openRate: variant.openRate.toFixed(2) + "%",
        clickRate: variant.clickRate.toFixed(2) + "%",
        conversionRate: variant.conversionRate.toFixed(2) + "%",
        revenuePerRecipient: variant.revenuePerRecipient.toFixed(2),
      },
    }));

    return {
      campaignId,
      campaignName: campaign.name,
      testMetric: campaign.testMetric,
      isCompleted: !!campaign.winningVariantName,
      winningVariantName: campaign.winningVariantName,
      testStartDate: campaign.testStartDate,
      testEndDate: campaign.testEndDate,
      variants: results,
    };
  }
}
