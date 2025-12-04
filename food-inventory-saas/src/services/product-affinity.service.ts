import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  ProductAffinity,
  ProductAffinityDocument,
} from "../schemas/product-affinity.schema";
import {
  CustomerProductAffinity,
  CustomerProductAffinityDocument,
} from "../schemas/customer-product-affinity.schema";
import {
  CustomerTransactionHistory,
  CustomerTransactionHistoryDocument,
} from "../schemas/customer-transaction-history.schema";

@Injectable()
export class ProductAffinityService {
  private readonly logger = new Logger(ProductAffinityService.name);

  constructor(
    @InjectModel(ProductAffinity.name)
    private productAffinityModel: Model<ProductAffinityDocument>,
    @InjectModel(CustomerProductAffinity.name)
    private customerProductAffinityModel: Model<CustomerProductAffinityDocument>,
    @InjectModel(CustomerTransactionHistory.name)
    private transactionModel: Model<CustomerTransactionHistoryDocument>,
  ) {}

  /**
   * Update product affinity matrix when a new transaction is recorded
   * This is called automatically from TransactionHistoryService
   */
  async updateAffinityFromTransaction(
    transactionId: string,
    tenantId: string,
  ): Promise<void> {
    try {
      const transaction = await this.transactionModel
        .findById(transactionId)
        .lean()
        .exec();

      if (!transaction) {
        this.logger.warn(
          `Transaction ${transactionId} not found for affinity update`,
        );
        return;
      }

      // Update affinity for each product in the transaction
      for (const item of transaction.items) {
        await this.updateProductCustomerAffinity(
          item.productId.toString(),
          transaction.customerId.toString(),
          tenantId,
          {
            orderDate: transaction.orderDate,
            quantity: item.quantity,
            totalPrice: item.totalPrice,
            category: item.category,
          },
        );
      }

      // Update co-purchase patterns if multiple products in order
      if (transaction.items.length > 1) {
        await this.updateCoPurchasePatterns(
          transaction.items.map((i) => i.productId.toString()),
          transaction.customerId.toString(),
          tenantId,
        );
      }

      this.logger.log(
        `Affinity matrix updated for transaction ${transaction.orderNumber}`,
      );
    } catch (error) {
      this.logger.error(
        `Error updating affinity from transaction ${transactionId}:`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Update customer purchase record for a specific product
   */
  private async updateProductCustomerAffinity(
    productId: string,
    customerId: string,
    tenantId: string,
    purchaseData: {
      orderDate: Date;
      quantity: number;
      totalPrice: number;
      category?: string;
    },
  ): Promise<void> {
    const productObjectId = new Types.ObjectId(productId);
    const customerObjectId = new Types.ObjectId(customerId);
    const tenantObjectId = new Types.ObjectId(tenantId);

    // Find or create ProductAffinity record
    let affinity = await this.productAffinityModel
      .findOne({
        productId: productObjectId,
        tenantId: tenantObjectId,
      })
      .exec();

    if (!affinity) {
      // Create new affinity record
      affinity = new this.productAffinityModel({
        productId: productObjectId,
        productName: "Unknown", // Will be updated from transaction
        tenantId: tenantObjectId,
        customerPurchaseMatrix: [],
        coPurchasePatterns: [],
        customerIds: [],
        totalUniqueCustomers: 0,
        totalTransactions: 0,
        totalQuantitySold: 0,
        totalRevenue: 0,
      });
    }

    // Find existing customer record in matrix
    const existingCustomerIndex = affinity.customerPurchaseMatrix.findIndex(
      (c) => c.customerId.toString() === customerId,
    );

    if (existingCustomerIndex >= 0) {
      // Update existing customer record
      const customerRecord =
        affinity.customerPurchaseMatrix[existingCustomerIndex];
      customerRecord.totalPurchaseCount += 1;
      customerRecord.totalQuantityPurchased += purchaseData.quantity;
      customerRecord.totalSpent += purchaseData.totalPrice;
      customerRecord.lastPurchaseDate = purchaseData.orderDate;
      customerRecord.averageOrderValue =
        customerRecord.totalSpent / customerRecord.totalPurchaseCount;

      // Calculate purchase frequency in days
      if (customerRecord.firstPurchaseDate) {
        const daysDiff =
          (purchaseData.orderDate.getTime() -
            customerRecord.firstPurchaseDate.getTime()) /
          (1000 * 60 * 60 * 24);
        customerRecord.purchaseFrequencyDays =
          daysDiff / customerRecord.totalPurchaseCount;
      }
    } else {
      // Add new customer to matrix
      affinity.customerPurchaseMatrix.push({
        customerId: customerObjectId,
        customerName: "Customer", // TODO: Fetch from Customer collection
        totalPurchaseCount: 1,
        totalQuantityPurchased: purchaseData.quantity,
        totalSpent: purchaseData.totalPrice,
        firstPurchaseDate: purchaseData.orderDate,
        lastPurchaseDate: purchaseData.orderDate,
        averageOrderValue: purchaseData.totalPrice,
        purchaseFrequencyDays: 0,
      } as any);

      // Add to customerIds array
      affinity.customerIds.push(customerObjectId);
      affinity.totalUniqueCustomers += 1;
    }

    // Update aggregate metrics
    affinity.totalTransactions += 1;
    affinity.totalQuantitySold += purchaseData.quantity;
    affinity.totalRevenue += purchaseData.totalPrice;

    if (
      !affinity.firstSaleDate ||
      purchaseData.orderDate < affinity.firstSaleDate
    ) {
      affinity.firstSaleDate = purchaseData.orderDate;
    }

    if (
      !affinity.lastSaleDate ||
      purchaseData.orderDate > affinity.lastSaleDate
    ) {
      affinity.lastSaleDate = purchaseData.orderDate;
    }

    affinity.lastUpdated = new Date();

    await affinity.save();
  }

  /**
   * Update co-purchase patterns for products bought together
   */
  private async updateCoPurchasePatterns(
    productIds: string[],
    customerId: string,
    tenantId: string,
  ): Promise<void> {
    const customerObjectId = new Types.ObjectId(customerId);

    // For each product, update its co-purchase patterns with other products
    for (let i = 0; i < productIds.length; i++) {
      const productId = productIds[i];
      const otherProductIds = productIds.filter((_, index) => index !== i);

      const affinity = await this.productAffinityModel
        .findOne({
          productId: new Types.ObjectId(productId),
          tenantId: new Types.ObjectId(tenantId),
        })
        .exec();

      if (!affinity) continue;

      for (const otherProductId of otherProductIds) {
        const existingPatternIndex = affinity.coPurchasePatterns.findIndex(
          (p) => p.productId.toString() === otherProductId,
        );

        if (existingPatternIndex >= 0) {
          // Update existing pattern
          const pattern = affinity.coPurchasePatterns[existingPatternIndex];
          pattern.coPurchaseCount += 1;
          pattern.lastCoPurchaseDate = new Date();

          // Add customer if not already in list
          if (!pattern.customerIds.some((id) => id.toString() === customerId)) {
            pattern.customerIds.push(customerObjectId);
          }

          // Recalculate affinity score (0-100)
          pattern.affinityScore = Math.min(
            100,
            (pattern.coPurchaseCount / affinity.totalTransactions) * 100,
          );
        } else {
          // Add new co-purchase pattern
          affinity.coPurchasePatterns.push({
            productId: new Types.ObjectId(otherProductId),
            productName: "Unknown", // TODO: Fetch from Product collection
            productCode: undefined,
            coPurchaseCount: 1,
            affinityScore: (1 / affinity.totalTransactions) * 100,
            lastCoPurchaseDate: new Date(),
            customerIds: [customerObjectId],
          } as any);
        }
      }

      await affinity.save();
    }
  }

  /**
   * Get customer purchase matrix for a specific product
   * Returns all customers who purchased this product with their purchase stats
   */
  async getProductCustomerMatrix(
    productId: string,
    tenantId: string,
    filters?: {
      minPurchaseCount?: number;
      minTotalSpent?: number;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<any> {
    const affinity = await this.productAffinityModel
      .findOne({
        productId: new Types.ObjectId(productId),
        tenantId: new Types.ObjectId(tenantId),
      })
      .lean()
      .exec();

    if (!affinity) {
      return {
        productId,
        productName: "Unknown",
        customers: [],
        totalCustomers: 0,
      };
    }

    let customers = affinity.customerPurchaseMatrix;

    // Apply filters
    if (filters) {
      if (filters.minPurchaseCount) {
        customers = customers.filter(
          (c) => c.totalPurchaseCount >= filters.minPurchaseCount!,
        );
      }
      if (filters.minTotalSpent) {
        customers = customers.filter(
          (c) => c.totalSpent >= filters.minTotalSpent!,
        );
      }
      if (filters.startDate) {
        customers = customers.filter(
          (c) => c.lastPurchaseDate >= filters.startDate!,
        );
      }
      if (filters.endDate) {
        customers = customers.filter(
          (c) => c.lastPurchaseDate <= filters.endDate!,
        );
      }
    }

    // Sort by total spent (descending)
    customers.sort((a, b) => b.totalSpent - a.totalSpent);

    return {
      productId: affinity.productId,
      productName: affinity.productName,
      productCode: affinity.productCode,
      customers,
      totalCustomers: customers.length,
      totalUniqueCustomers: affinity.totalUniqueCustomers,
      totalRevenue: affinity.totalRevenue,
      totalTransactions: affinity.totalTransactions,
    };
  }

  /**
   * Get product purchase matrix for a specific customer
   * Returns all products purchased by this customer with their purchase stats
   */
  async getCustomerProductMatrix(
    customerId: string,
    tenantId: string,
    filters?: {
      minPurchaseCount?: number;
      category?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<any> {
    const customerObjectId = new Types.ObjectId(customerId);
    const tenantObjectId = new Types.ObjectId(tenantId);

    // Find all products where this customer is in customerIds
    const affinities = await this.productAffinityModel
      .find({
        tenantId: tenantObjectId,
        customerIds: customerObjectId,
      })
      .lean()
      .exec();

    const products: any[] = [];

    for (const affinity of affinities) {
      const customerRecord = affinity.customerPurchaseMatrix.find(
        (c) => c.customerId.toString() === customerId,
      );

      if (!customerRecord) continue;

      // Apply filters
      if (filters?.minPurchaseCount) {
        if (customerRecord.totalPurchaseCount < filters.minPurchaseCount)
          continue;
      }

      if (filters?.category) {
        if (!affinity.productCategories.includes(filters.category)) continue;
      }

      if (filters?.startDate) {
        if (customerRecord.lastPurchaseDate < filters.startDate) continue;
      }

      if (filters?.endDate) {
        if (customerRecord.lastPurchaseDate > filters.endDate) continue;
      }

      products.push({
        productId: affinity.productId,
        productName: affinity.productName,
        productCode: affinity.productCode,
        productCategories: affinity.productCategories,
        totalPurchaseCount: customerRecord.totalPurchaseCount,
        totalQuantityPurchased: customerRecord.totalQuantityPurchased,
        totalSpent: customerRecord.totalSpent,
        firstPurchaseDate: customerRecord.firstPurchaseDate,
        lastPurchaseDate: customerRecord.lastPurchaseDate,
        averageOrderValue: customerRecord.averageOrderValue,
        purchaseFrequencyDays: customerRecord.purchaseFrequencyDays,
      });
    }

    // Sort by total spent (descending)
    products.sort((a, b) => b.totalSpent - a.totalSpent);

    return {
      customerId,
      products,
      totalProducts: products.length,
      totalSpent: products.reduce((sum, p) => sum + p.totalSpent, 0),
      totalTransactions: products.reduce(
        (sum, p) => sum + p.totalPurchaseCount,
        0,
      ),
    };
  }

  /**
   * Calculate purchase affinity - products frequently bought together
   * Returns top N products purchased with the given product
   */
  async calculatePurchaseAffinity(
    productId: string,
    tenantId: string,
    options?: {
      limit?: number;
      minAffinityScore?: number;
      customerId?: string; // Optional: Filter by specific customer
    },
  ): Promise<any> {
    const affinity = await this.productAffinityModel
      .findOne({
        productId: new Types.ObjectId(productId),
        tenantId: new Types.ObjectId(tenantId),
      })
      .lean()
      .exec();

    if (!affinity) {
      return {
        productId,
        coPurchasePatterns: [],
        totalPatterns: 0,
      };
    }

    let patterns = affinity.coPurchasePatterns;

    // Apply filters
    if (options) {
      if (options.minAffinityScore) {
        patterns = patterns.filter(
          (p) => p.affinityScore >= options.minAffinityScore!,
        );
      }

      if (options.customerId) {
        patterns = patterns.filter((p) =>
          p.customerIds.some((id) => id.toString() === options.customerId),
        );
      }
    }

    // Sort by affinity score (descending)
    patterns.sort((a, b) => b.affinityScore - a.affinityScore);

    // Limit results
    const limit = options?.limit || 10;
    patterns = patterns.slice(0, limit);

    return {
      productId: affinity.productId,
      productName: affinity.productName,
      coPurchasePatterns: patterns,
      totalPatterns: patterns.length,
    };
  }

  /**
   * Get top customers for a product
   */
  async getTopCustomersForProduct(
    productId: string,
    tenantId: string,
    limit: number = 10,
  ): Promise<any> {
    const result = await this.getProductCustomerMatrix(productId, tenantId);

    return {
      ...result,
      customers: result.customers.slice(0, limit),
    };
  }

  /**
   * Get top products for a customer
   */
  async getTopProductsForCustomer(
    customerId: string,
    tenantId: string,
    limit: number = 10,
  ): Promise<any> {
    const result = await this.getCustomerProductMatrix(customerId, tenantId);

    return {
      ...result,
      products: result.products.slice(0, limit),
    };
  }

  // ========================================================================
  // PHASE 2: CUSTOMER-PRODUCT AFFINITY CACHE METHODS
  // ========================================================================

  /**
   * Calculate affinity score for a customer-product pair
   * Score based on:
   * - Purchase frequency (40%)
   * - Recency (30%)
   * - Quantity purchased (20%)
   * - Consistency (10%)
   */
  private calculateAffinityScore(metrics: {
    purchaseCount: number;
    daysSinceLastPurchase: number;
    totalQuantityPurchased: number;
    purchaseFrequencyDays: number;
    firstPurchaseDate: Date;
  }): number {
    // Frequency score (0-40 points)
    let frequencyScore = 0;
    if (metrics.purchaseCount >= 20) frequencyScore = 40;
    else if (metrics.purchaseCount >= 10) frequencyScore = 35;
    else if (metrics.purchaseCount >= 5) frequencyScore = 25;
    else if (metrics.purchaseCount >= 3) frequencyScore = 15;
    else frequencyScore = 10;

    // Recency score (0-30 points)
    let recencyScore = 0;
    if (metrics.daysSinceLastPurchase <= 7) recencyScore = 30;
    else if (metrics.daysSinceLastPurchase <= 30) recencyScore = 25;
    else if (metrics.daysSinceLastPurchase <= 90) recencyScore = 15;
    else if (metrics.daysSinceLastPurchase <= 180) recencyScore = 10;
    else recencyScore = 5;

    // Quantity score (0-20 points)
    let quantityScore = 0;
    if (metrics.totalQuantityPurchased >= 100) quantityScore = 20;
    else if (metrics.totalQuantityPurchased >= 50) quantityScore = 15;
    else if (metrics.totalQuantityPurchased >= 20) quantityScore = 10;
    else quantityScore = 5;

    // Consistency score (0-10 points)
    let consistencyScore = 0;
    if (metrics.purchaseFrequencyDays > 0) {
      // More consistent = higher score
      if (metrics.purchaseFrequencyDays <= 30) consistencyScore = 10;
      else if (metrics.purchaseFrequencyDays <= 60) consistencyScore = 7;
      else if (metrics.purchaseFrequencyDays <= 90) consistencyScore = 5;
      else consistencyScore = 3;
    }

    return Math.min(
      100,
      frequencyScore + recencyScore + quantityScore + consistencyScore,
    );
  }

  /**
   * Calculate customer segment based on purchase count
   */
  private calculateCustomerSegment(purchaseCount: number): string {
    if (purchaseCount >= 20) return "champion";
    if (purchaseCount >= 11) return "frequent";
    if (purchaseCount >= 6) return "regular";
    if (purchaseCount >= 3) return "occasional";
    return "new";
  }

  /**
   * Calculate engagement level based on recency
   */
  private calculateEngagementLevel(daysSinceLastPurchase: number): string {
    if (daysSinceLastPurchase <= 7) return "very_high";
    if (daysSinceLastPurchase <= 30) return "high";
    if (daysSinceLastPurchase <= 90) return "medium";
    if (daysSinceLastPurchase <= 180) return "low";
    return "at_risk";
  }

  /**
   * Update or create customer-product affinity record
   * This is called after each transaction or during daily recalculation
   */
  async updateCustomerProductAffinity(
    customerId: string,
    productId: string,
    tenantId: string,
  ): Promise<CustomerProductAffinity | null> {
    try {
      // Get all transactions for this customer-product combination
      const transactions = await this.transactionModel
        .find({
          customerId: new Types.ObjectId(customerId),
          productIds: new Types.ObjectId(productId),
          tenantId: tenantId,
          isPaid: true,
        })
        .sort({ orderDate: 1 })
        .lean();

      if (transactions.length === 0) {
        this.logger.warn(
          `No transactions found for customer ${customerId} and product ${productId}`,
        );
        return null;
      }

      // Calculate metrics
      let totalQuantity = 0;
      let totalSpent = 0;
      const purchaseDates: Date[] = [];

      transactions.forEach((tx) => {
        const item = tx.items.find((i) => i.productId.toString() === productId);
        if (item) {
          totalQuantity += item.quantity;
          totalSpent += item.totalPrice;
          purchaseDates.push(tx.orderDate);
        }
      });

      const purchaseCount = transactions.length;
      const firstPurchaseDate = purchaseDates[0];
      const lastPurchaseDate = purchaseDates[purchaseDates.length - 1];
      const averageQuantity = totalQuantity / purchaseCount;
      const averageOrderValue = totalSpent / purchaseCount;

      // Calculate purchase frequency (average days between purchases)
      let purchaseFrequencyDays = 0;
      if (purchaseDates.length > 1) {
        let totalDays = 0;
        for (let i = 1; i < purchaseDates.length; i++) {
          const diff =
            (purchaseDates[i].getTime() - purchaseDates[i - 1].getTime()) /
            (1000 * 60 * 60 * 24);
          totalDays += diff;
        }
        purchaseFrequencyDays = Math.round(
          totalDays / (purchaseDates.length - 1),
        );
      }

      // Days since last purchase
      const now = new Date();
      const daysSinceLastPurchase = Math.floor(
        (now.getTime() - lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Calculate affinity score
      const affinityScore = this.calculateAffinityScore({
        purchaseCount,
        daysSinceLastPurchase,
        totalQuantityPurchased: totalQuantity,
        purchaseFrequencyDays,
        firstPurchaseDate,
      });

      // Calculate segment and engagement
      const customerSegment = this.calculateCustomerSegment(purchaseCount);
      const engagementLevel = this.calculateEngagementLevel(
        daysSinceLastPurchase,
      );

      // Predict next purchase date
      let nextPredictedPurchaseDate: Date | undefined;
      if (purchaseFrequencyDays > 0) {
        nextPredictedPurchaseDate = new Date(
          lastPurchaseDate.getTime() +
            purchaseFrequencyDays * 24 * 60 * 60 * 1000,
        );
      }

      // Get product details from first transaction
      const firstTx = transactions[0];
      const productItem = firstTx.items.find(
        (i) => i.productId.toString() === productId,
      );

      // Update or create affinity record
      const affinityData = {
        customerId: new Types.ObjectId(customerId),
        customerName: firstTx.customerId?.toString() || "Unknown", // Should be populated
        productId: new Types.ObjectId(productId),
        productName: productItem?.productName || "Unknown",
        productCode: productItem?.productCode,
        productCategory: productItem?.category,
        affinityScore,
        purchaseCount,
        totalQuantityPurchased: totalQuantity,
        totalSpent,
        averageQuantity,
        averageOrderValue,
        firstPurchaseDate,
        lastPurchaseDate,
        purchaseFrequencyDays,
        nextPredictedPurchaseDate,
        daysSinceLastPurchase,
        customerSegment,
        engagementLevel,
        tenantId: tenantId,
        lastCalculated: new Date(),
      };

      const result = await this.customerProductAffinityModel.findOneAndUpdate(
        {
          customerId: new Types.ObjectId(customerId),
          productId: new Types.ObjectId(productId),
          tenantId: tenantId,
        },
        { $set: affinityData },
        { upsert: true, new: true },
      );

      this.logger.log(
        `Updated affinity for customer ${customerId} and product ${productId}: score ${affinityScore}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Error updating customer-product affinity: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get customer's product affinities (sorted by score)
   */
  async getCustomerProductAffinities(
    customerId: string,
    tenantId: string,
    options?: {
      limit?: number;
      minScore?: number;
      category?: string;
      segment?: string;
    },
  ): Promise<CustomerProductAffinity[]> {
    const query: any = {
      customerId: new Types.ObjectId(customerId),
      tenantId: tenantId,
    };

    if (options?.minScore) {
      query.affinityScore = { $gte: options.minScore };
    }

    if (options?.category) {
      query.productCategory = options.category;
    }

    if (options?.segment) {
      query.customerSegment = options.segment;
    }

    const affinities = await this.customerProductAffinityModel
      .find(query)
      .sort({ affinityScore: -1 })
      .limit(options?.limit || 50)
      .lean();

    return affinities;
  }

  /**
   * Get predictive recommendations for a customer
   * Based on high affinity products that haven't been purchased recently
   */
  async getPredictiveRecommendations(
    customerId: string,
    tenantId: string,
    limit: number = 10,
  ): Promise<any[]> {
    const now = new Date();

    // Find products with:
    // 1. High affinity score (>60)
    // 2. Purchase frequency established
    // 3. Next predicted purchase date is near (within 7 days)
    const recommendations = await this.customerProductAffinityModel
      .find({
        customerId: new Types.ObjectId(customerId),
        tenantId: tenantId,
        affinityScore: { $gte: 60 },
        purchaseFrequencyDays: { $gt: 0 },
        nextPredictedPurchaseDate: {
          $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
        },
      })
      .sort({ affinityScore: -1, nextPredictedPurchaseDate: 1 })
      .limit(limit)
      .lean();

    return recommendations.map((r) => ({
      ...r,
      recommendationReason: "Predicted repurchase window",
      daysUntilPredictedPurchase: Math.floor(
        (r.nextPredictedPurchaseDate!.getTime() - now.getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    }));
  }

  /**
   * Get customers at risk for a product (haven't purchased in expected timeframe)
   */
  async getAtRiskCustomersForProduct(
    productId: string,
    tenantId: string,
  ): Promise<any[]> {
    const now = new Date();

    // Customers who:
    // 1. Have high affinity (>50)
    // 2. Expected to purchase but haven't (past predicted date)
    // 3. Engagement level is "at_risk" or "low"
    const atRiskCustomers = await this.customerProductAffinityModel
      .find({
        productId: new Types.ObjectId(productId),
        tenantId: tenantId,
        affinityScore: { $gte: 50 },
        nextPredictedPurchaseDate: { $lt: now },
        engagementLevel: { $in: ["at_risk", "low"] },
      })
      .sort({ daysSinceLastPurchase: -1 })
      .lean();

    return atRiskCustomers.map((c) => ({
      ...c,
      daysPastExpected: Math.floor(
        (now.getTime() - c.nextPredictedPurchaseDate!.getTime()) /
          (1000 * 60 * 60 * 24),
      ),
    }));
  }

  /**
   * Recalculate all affinity scores for a tenant
   * This is called by the cron job
   */
  async recalculateAllAffinityScores(tenantId: string): Promise<{
    processed: number;
    updated: number;
    errors: number;
  }> {
    this.logger.log(`Starting affinity recalculation for tenant ${tenantId}`);

    let processed = 0;
    let updated = 0;
    let errors = 0;

    try {
      // Get all unique customer-product combinations from transactions
      const combinations = await this.transactionModel.aggregate([
        {
          $match: {
            tenantId: tenantId,
            isPaid: true,
          },
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: {
              customerId: "$customerId",
              productId: "$items.productId",
            },
          },
        },
      ]);

      this.logger.log(
        `Found ${combinations.length} customer-product combinations to process`,
      );

      for (const combo of combinations) {
        try {
          processed++;
          await this.updateCustomerProductAffinity(
            combo._id.customerId.toString(),
            combo._id.productId.toString(),
            tenantId,
          );
          updated++;

          if (processed % 100 === 0) {
            this.logger.log(`Processed ${processed}/${combinations.length}...`);
          }
        } catch (error) {
          errors++;
          this.logger.error(
            `Error updating affinity for customer ${combo._id.customerId} and product ${combo._id.productId}: ${error.message}`,
          );
        }
      }

      this.logger.log(
        `Affinity recalculation completed: ${updated} updated, ${errors} errors`,
      );

      return { processed, updated, errors };
    } catch (error) {
      this.logger.error(
        `Fatal error in recalculateAllAffinityScores: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
