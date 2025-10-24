import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product } from '../../../schemas/product.schema';

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
   * @param productId - Product ID
   * @param quantity - Quantity being ordered
   * @param unitPrice - Original unit price
   * @returns Discount result with applied percentage and new price
   */
  async calculateBulkDiscount(
    productId: string,
    quantity: number,
    unitPrice: number,
  ): Promise<BulkDiscountResult> {
    try {
      // Fetch product with discount rules
      const product = await this.productModel.findById(productId).exec();

      if (!product) {
        this.logger.warn(`Product not found: ${productId}`);
        return {
          applied: false,
          discountPercentage: 0,
          originalPrice: unitPrice,
          discountedPrice: unitPrice,
        };
      }

      // Check if bulk discounts are enabled
      if (
        !product.pricingRules?.bulkDiscountEnabled ||
        !product.pricingRules?.bulkDiscountRules ||
        product.pricingRules.bulkDiscountRules.length === 0
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
      const sortedRules = [...product.pricingRules.bulkDiscountRules].sort(
        (a, b) => b.minQuantity - a.minQuantity,
      );

      let applicableRule: { minQuantity: number; discountPercentage: number } | null = null;
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
        `Bulk discount applied: ${discountPercentage}% for ${quantity} units of product ${product.name}`,
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
      this.logger.error('Error calculating bulk discount:', error);
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
   * @param productId - Product ID
   * @param unitPrice - Original unit price
   * @returns Discount result with applied percentage and new price
   */
  async calculatePromotionalDiscount(
    productId: string,
    unitPrice: number,
  ): Promise<BulkDiscountResult> {
    try {
      const product = await this.productModel.findById(productId).exec();

      if (!product) {
        return {
          applied: false,
          discountPercentage: 0,
          originalPrice: unitPrice,
          discountedPrice: unitPrice,
        };
      }

      // Check if promotion is active
      if (
        !product.hasActivePromotion ||
        !product.promotion?.isActive ||
        !product.promotion?.discountPercentage
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
      const startDate = new Date(product.promotion.startDate);
      const endDate = new Date(product.promotion.endDate);

      if (now < startDate || now > endDate) {
        return {
          applied: false,
          discountPercentage: 0,
          originalPrice: unitPrice,
          discountedPrice: unitPrice,
        };
      }

      // Calculate discounted price
      const discountPercentage = product.promotion.discountPercentage;
      const discountedPrice = unitPrice * (1 - discountPercentage / 100);

      this.logger.log(
        `Promotional discount applied: ${discountPercentage}% for product ${product.name}`,
      );

      return {
        applied: true,
        discountPercentage,
        originalPrice: unitPrice,
        discountedPrice,
      };
    } catch (error) {
      this.logger.error('Error calculating promotional discount:', error);
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
  async calculateBestDiscount(
    productId: string,
    quantity: number,
    unitPrice: number,
  ): Promise<BulkDiscountResult> {
    const [bulkDiscount, promoDiscount] = await Promise.all([
      this.calculateBulkDiscount(productId, quantity, unitPrice),
      this.calculatePromotionalDiscount(productId, unitPrice),
    ]);

    // Return the discount that gives the lowest price
    if (bulkDiscount.discountedPrice <= promoDiscount.discountedPrice) {
      return bulkDiscount;
    }

    return promoDiscount;
  }
}
