import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Product } from "../../../schemas/product.schema";

export interface BulkDiscountResult {
  applied: boolean;
  discountPercentage: number;
  originalPrice: number;
  discountedPrice: number;
  rule?: {
    minQuantity: number;
    discountPercentage: number;
  };
}

@Injectable()
export class DiscountService {
  private readonly logger = new Logger(DiscountService.name);

  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<Product>,
  ) {}

  /**
   * Calculate and apply bulk discount based on product's bulkDiscountRules
   * OPTIMIZED: Accept product object directly to avoid redundant database queries
   * @param product - Product object OR Product ID (for backwards compatibility)
   * @param quantity - Quantity being ordered
   * @param unitPrice - Original unit price
   * @returns Discount result with applied percentage and new price
   */
  async calculateBulkDiscount(
    product: Product | string,
    quantity: number,
    unitPrice: number,
  ): Promise<BulkDiscountResult> {
    try {
      // OPTIMIZED: If product object is passed, use it directly (no query needed!)
      let productObj: Product | null;

      if (typeof product === "string") {
        // Backwards compatibility: if string (ID) is passed, fetch from DB
        productObj = await this.productModel.findById(product).exec();

        if (!productObj) {
          this.logger.warn(`Product not found: ${product}`);
          return {
            applied: false,
            discountPercentage: 0,
            originalPrice: unitPrice,
            discountedPrice: unitPrice,
          };
        }
      } else {
        // New optimized path: use the product object directly
        productObj = product;
      }

      // Check if bulk discounts are enabled
      if (
        !productObj.pricingRules?.bulkDiscountEnabled ||
        !productObj.pricingRules?.bulkDiscountRules ||
        productObj.pricingRules.bulkDiscountRules.length === 0
      ) {
        return {
          applied: false,
          discountPercentage: 0,
          originalPrice: unitPrice,
          discountedPrice: unitPrice,
        };
      }

      // Find the highest applicable discount rule
      // Rules are sorted by minQuantity descending to apply the best discount
      const sortedRules = [...productObj.pricingRules.bulkDiscountRules].sort(
        (a, b) => b.minQuantity - a.minQuantity,
      );

      let applicableRule: {
        minQuantity: number;
        discountPercentage: number;
      } | null = null;
      for (const rule of sortedRules) {
        if (quantity >= rule.minQuantity) {
          applicableRule = rule;
          break;
        }
      }

      if (!applicableRule) {
        return {
          applied: false,
          discountPercentage: 0,
          originalPrice: unitPrice,
          discountedPrice: unitPrice,
        };
      }

      // Calculate discounted price
      const discountPercentage = applicableRule.discountPercentage;
      const discountedPrice = unitPrice * (1 - discountPercentage / 100);

      this.logger.log(
        `Bulk discount applied: ${discountPercentage}% for ${quantity} units of product ${productObj.name}`,
      );

      return {
        applied: true,
        discountPercentage,
        originalPrice: unitPrice,
        discountedPrice,
        rule: {
          minQuantity: applicableRule.minQuantity,
          discountPercentage: applicableRule.discountPercentage,
        },
      };
    } catch (error) {
      this.logger.error("Error calculating bulk discount:", error);
      return {
        applied: false,
        discountPercentage: 0,
        originalPrice: unitPrice,
        discountedPrice: unitPrice,
      };
    }
  }

  /**
   * Calculate promotional discount for a product
   * OPTIMIZED: Accept product object directly to avoid redundant database queries
   * @param product - Product object OR Product ID (for backwards compatibility)
   * @param unitPrice - Original unit price
   * @returns Discount result with applied percentage and new price
   */
  async calculatePromotionalDiscount(
    product: Product | string,
    unitPrice: number,
  ): Promise<BulkDiscountResult> {
    try {
      // OPTIMIZED: If product object is passed, use it directly (no query needed!)
      let productObj: Product | null;

      if (typeof product === "string") {
        // Backwards compatibility: if string (ID) is passed, fetch from DB
        productObj = await this.productModel.findById(product).exec();

        if (!productObj) {
          this.logger.warn(`Product not found: ${product}`);
          return {
            applied: false,
            discountPercentage: 0,
            originalPrice: unitPrice,
            discountedPrice: unitPrice,
          };
        }
      } else {
        // New optimized path: use the product object directly
        productObj = product;
      }

      // Check if promotion is active
      if (
        !productObj.hasActivePromotion ||
        !productObj.promotion?.isActive ||
        !productObj.promotion?.discountPercentage
      ) {
        return {
          applied: false,
          discountPercentage: 0,
          originalPrice: unitPrice,
          discountedPrice: unitPrice,
        };
      }

      // Check promotion dates
      const now = new Date();
      const startDate = new Date(productObj.promotion.startDate);
      const endDate = new Date(productObj.promotion.endDate);

      // Set end date to end of day to be inclusive
      endDate.setHours(23, 59, 59, 999);

      if (now < startDate || now > endDate) {
        return {
          applied: false,
          discountPercentage: 0,
          originalPrice: unitPrice,
          discountedPrice: unitPrice,
        };
      }

      // Calculate discounted price
      const discountPercentage = productObj.promotion.discountPercentage;
      const discountedPrice = unitPrice * (1 - discountPercentage / 100);

      this.logger.log(
        `Promotional discount applied: ${discountPercentage}% for product ${productObj.name}`,
      );

      return {
        applied: true,
        discountPercentage,
        originalPrice: unitPrice,
        discountedPrice,
      };
    } catch (error) {
      this.logger.error("Error calculating promotional discount:", error);
      return {
        applied: false,
        discountPercentage: 0,
        originalPrice: unitPrice,
        discountedPrice: unitPrice,
      };
    }
  }

  /**
   * Calculate best discount (bulk or promotional) for a product
   * Applies the discount that gives the best price to the customer
   * @param productId - Product ID
   * @param quantity - Quantity being ordered
   * @param unitPrice - Original unit price
   * @returns Best discount result
   */
  /**
   * Calculate the best discount (bulk or promotional)
   * OPTIMIZED: Accept product object directly to avoid redundant database queries
   * @param product - Product object OR Product ID (for backwards compatibility)
   * @param quantity - Quantity being ordered
   * @param unitPrice - Original unit price
   * @returns The best discount result
   */
  async calculateBestDiscount(
    product: Product | string,
    quantity: number,
    unitPrice: number,
  ): Promise<BulkDiscountResult> {
    // OPTIMIZED: Pass product object to child methods - they'll use it directly
    const [bulkDiscount, promoDiscount] = await Promise.all([
      this.calculateBulkDiscount(product, quantity, unitPrice),
      this.calculatePromotionalDiscount(product, unitPrice),
    ]);

    // Return the discount that gives the lowest price
    if (bulkDiscount.discountedPrice <= promoDiscount.discountedPrice) {
      return bulkDiscount;
    }

    return promoDiscount;
  }
}
