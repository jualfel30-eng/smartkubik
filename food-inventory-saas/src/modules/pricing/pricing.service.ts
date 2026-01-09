import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { OrderCalculationDto } from "../../dto/order.dto";
import { Product, ProductDocument } from "../../schemas/product.schema";
import { PurchasesService } from "../purchases/purchases.service";
import { AuditLog, AuditLogDocument } from "../../schemas/audit-log.schema";

export interface BulkUpdateCriteria {
  paymentMethod?: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  supplierId?: string;
  stockLevel?: 'low' | 'overstock' | 'all';
  velocity?: 'high' | 'low' | 'all';
}

export interface BulkPriceOperation {
  type: "inflation_formula" | "margin_update" | "percentage_increase" | "promotion" | "fixed_price";
  payload: {
    parallelRate?: number;
    bcvRate?: number;
    targetMargin?: number; // e.g., 0.30 for 30%
    percentage?: number; // e.g., 10 for 10%
    fixedPrice?: number;
    discountPercentage?: number;
    durationDays?: number;
    startDate?: Date;
  };
}

export interface PriceUpdatePreview {
  productId: string;
  productName: string;
  sku: string;
  currentPrice: number; // In VES (or base currency)
  newPrice: number;
  diffPercentage: number;
  costPrice: number; // Reference cost
  variantId?: string; // If specific variant
  isVariant: boolean;
}

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(AuditLog.name) private auditLogModel: Model<AuditLogDocument>,
    @InjectModel('Inventory') private inventoryModel: Model<any>, // Using any to avoid importing the doc type if not exported easily, or string name
    private readonly purchasesService: PurchasesService,
  ) { }

  async calculateOrder(calculationDto: OrderCalculationDto, tenant: any) {
    this.logger.log("Calculating order prices with Venezuelan taxes");

    const { discountAmount = 0, shippingCost = 0 } = calculationDto;

    // Configuración de impuestos desde el tenant
    const ivaRate = tenant.settings?.taxes?.ivaRate || 0.16;
    const igtfRate = tenant.settings?.taxes?.igtfRate || 0.03;

    const subtotal = 0;
    const itemsWithTaxes: any[] = [];

    // Note: The loop logic was commented out in original file, keeping it simple as before
    // for (const item of items) { ... }

    // Totales generales
    const totalIva = itemsWithTaxes.reduce(
      (sum, item) => sum + item.ivaAmount,
      0,
    );
    const totalIgtf = itemsWithTaxes.reduce(
      (sum, item) => sum + item.igtfAmount,
      0,
    );
    const totalAdjustments = itemsWithTaxes.reduce(
      (sum, item) => sum + item.adjustment,
      0,
    );

    const totalBeforeDiscount =
      subtotal + totalIva + totalIgtf + totalAdjustments + shippingCost;
    const finalTotal = totalBeforeDiscount - discountAmount;

    // Conversión a USD (tasa fija para demo)
    const usdRate = 36.5; // VES por USD
    const totalUSD = finalTotal / usdRate;

    return {
      items: itemsWithTaxes,
      summary: {
        subtotal,
        totalIva,
        totalIgtf,
        totalAdjustments,
        shippingCost,
        discountAmount,
        totalVES: finalTotal,
        totalUSD,
        exchangeRate: usdRate,
      },
      taxes: {
        ivaRate: ivaRate * 100, // Convertir a porcentaje
        igtfRate: igtfRate * 100,
        igtfApplied: itemsWithTaxes.some((item) => item.igtfAmount > 0),
      },
    };
  }

  async getExchangeRate(): Promise<number> {
    // En producción, esto consultaría una API externa
    // Por ahora retornamos una tasa fija
    return 36.5;
  }

  calculateMargin(costPrice: number, sellingPrice: number): number {
    if (costPrice === 0) return 0;
    return ((sellingPrice - costPrice) / sellingPrice) * 100;
  }

  applyPricingRules(basePrice: number, rules: any): number {
    let finalPrice = basePrice;

    // Aplicar margen mínimo
    if (rules.minimumMargin) {
      const minPrice = basePrice / (1 - rules.minimumMargin);
      finalPrice = Math.max(finalPrice, minPrice);
    }

    // Aplicar descuento máximo
    if (rules.maximumDiscount) {
      const maxDiscountPrice = basePrice * (1 - rules.maximumDiscount);
      finalPrice = Math.max(finalPrice, maxDiscountPrice);
    }

    return finalPrice;
  }

  /**
   * Bulk Pricing Engine: Preview
   */
  async previewBulkUpdate(
    tenantId: string,
    criteria: BulkUpdateCriteria,
    operation: BulkPriceOperation,
  ): Promise<PriceUpdatePreview[]> {
    const products = await this.findProductsByCriteria(tenantId, criteria);
    const previews: PriceUpdatePreview[] = [];

    for (const product of products) {
      // 1. Process Main Product Price (if used directly, though mostly variants are used)
      // Note: We'll focus on Variants if they exist, or main price if no variants.
      // But typically price is in variants. Let's check 'basePrice' in variants.

      if (product.variants && product.variants.length > 0) {
        for (const variant of product.variants) {
          const result = this.calculateNewPrice(
            variant.basePrice,
            variant.costPrice || 0,
            operation,
          );
          if (result) {
            previews.push({
              productId: product._id.toString(),
              productName: product.name,
              sku: variant.sku,
              variantId: (variant as any)._id?.toString(),
              isVariant: true,
              costPrice: variant.costPrice || 0,
              currentPrice: variant.basePrice,
              newPrice: result.newPrice,
              diffPercentage: result.diffPercentage,
            });
          }
        }
      } else {
        // Simple product without variants handling could go here.
        // For Safe implementation, we only touch variants for now.
      }
    }

    return previews;
  }

  /**
   * Bulk Pricing Engine: Execute
   */
  async executeBulkUpdate(
    tenantId: string,
    userId: string,
    criteria: BulkUpdateCriteria,
    operation: BulkPriceOperation,
  ): Promise<{ updatedCount: number; message: string }> {
    const products = await this.findProductsByCriteria(tenantId, criteria);
    let updatedCount = 0;

    const { Types } = require("mongoose");

    for (const product of products) {
      let modified = false;

      if (operation.type === 'promotion') {
        const { discountPercentage, startDate, durationDays } = operation.payload;
        if (discountPercentage) {
          const start = startDate ? new Date(startDate) : new Date();
          const duration = durationDays || 7;
          const end = new Date(start);
          end.setDate(end.getDate() + duration);

          product.hasActivePromotion = true;
          product.promotion = {
            isActive: true,
            discountPercentage: discountPercentage,
            reason: 'Bulk Strategy Update',
            startDate: start,
            endDate: end,
            durationDays: duration,
            autoDeactivate: true
          };
          modified = true;
          updatedCount++;
        }
      } else {
        // Standard Price Update
        if (product.variants && product.variants.length > 0) {
          for (const variant of product.variants) {
            const result = this.calculateNewPrice(
              variant.basePrice,
              variant.costPrice || 0,
              operation,
            );
            if (result && result.newPrice !== variant.basePrice) {
              variant.basePrice = result.newPrice;
              modified = true;
              updatedCount++;
            }
          }
        }
      }

      if (modified) {
        await product.save();
      }
    }

    // Audit Log
    try {
      await this.auditLogModel.create({
        tenantId: new Types.ObjectId(tenantId),
        action: "bulk_price_update",
        entity: "product",
        entityId: "bulk", // special ID for bulk ops
        performedBy: new Types.ObjectId(userId),
        details: {
          criteria,
          operation,
          updatedCount,
        },
        timestamp: new Date(),
      });
    } catch (e) {
      this.logger.error("Failed to create audit log", e);
    }

    return {
      updatedCount,
      message: `Successfully updated ${updatedCount} prices.`,
    };
  }

  // --- Helper Methods ---

  private async findProductsByCriteria(
    tenantId: string,
    criteria: BulkUpdateCriteria,
  ): Promise<ProductDocument[]> {
    const { Types } = require("mongoose");
    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
      isActive: true, // Only active products
    };

    if (criteria.category) {
      filter.category = criteria.category;
    }

    if (criteria.subcategory) {
      filter.subcategory = criteria.subcategory;
    }

    if (criteria.brand) {
      filter.brand = criteria.brand;
    }

    if (criteria.supplierId) {
      // This requires advanced lookup if supplier is not directly on product root
      // But we have 'suppliers' array.
      // This is a simplified check on the array.
      filter["suppliers.supplierId"] = new Types.ObjectId(criteria.supplierId);
    }

    // Payment Method Filter (The "Smart" part)
    if (criteria.paymentMethod) {
      const productIds =
        await this.purchasesService.findProductIdsByPaymentMethod(
          tenantId,
          criteria.paymentMethod,
        );

      // If no products found for this payment method, return empty to avoid full scan
      if (productIds.length === 0) {
        return [];
      }

      filter._id = { $in: productIds.map((id) => new Types.ObjectId(id)) };
    }

    // --- Advanced Filters using Inventory Model ---
    const inventoryFilter: any = { tenantId: new Types.ObjectId(tenantId) };
    let useInventoryFilter = false;

    if (criteria.stockLevel && criteria.stockLevel !== 'all') {
      useInventoryFilter = true;
      if (criteria.stockLevel === 'low') {
        inventoryFilter['alerts.lowStock'] = true;
      } else if (criteria.stockLevel === 'overstock') {
        inventoryFilter['alerts.overstock'] = true;
      }
    }

    if (criteria.velocity && criteria.velocity !== 'all') {
      useInventoryFilter = true;
      // Heuristic: High velocity = Top 20% by turnoverRate? 
      // Simplified: turnoverRate > 5 is high, < 1 is low (Just example thresholds)
      // Better: Sort by turnoverRate and take top X% would be ideal but complex.
      // Let's use thresholds for now based on 'metrics'.
      if (criteria.velocity === 'high') {
        inventoryFilter['metrics.turnoverRate'] = { $gte: 2.0 }; // Assume > 2.0 is high
      } else {
        inventoryFilter['metrics.turnoverRate'] = { $lt: 2.0 };
      }
    }

    if (useInventoryFilter) {
      const inventories = await this.inventoryModel.find(inventoryFilter).select('productId').exec();
      const productIdsFromInventory = inventories.map(i => i.productId);

      // Merge with existing ID filter if any
      if (filter._id) {
        // MUST match both (Payment Method AND Inventory Filter)
        filter._id = {
          $in: productIdsFromInventory.filter(id =>
            (filter._id as any).$in.some((pid: any) => pid.toString() === id.toString())
          )
        };
      } else {
        filter._id = { $in: productIdsFromInventory };
      }
    }

    return this.productModel.find(filter).exec();
  }

  private calculateNewPrice(
    currentPrice: number,
    costPrice: number,
    operation: BulkPriceOperation,
  ): { newPrice: number; diffPercentage: number } | null {
    let newPrice = currentPrice;

    switch (operation.type) {
      case "inflation_formula":
        // Formula: New_Price_Bs = (Cost_Bs / BCV_Rate) * (1 + Margin) * Parallel_Rate
        // Assumes Cost_Bs is the cost stored in system.

        const { parallelRate, bcvRate, targetMargin } = operation.payload;
        if (!parallelRate || !bcvRate || targetMargin === undefined) return null;

        // Estimated Cost in USD (Official)
        const estimatedCostUSD = costPrice / bcvRate;

        const targetSellingPriceBs = estimatedCostUSD * (1 + targetMargin) * parallelRate;
        newPrice = Math.ceil(targetSellingPriceBs); // Round up to nearest integer
        break;

      case "margin_update":
        // Set price to Cost * (1 + Margin)
        if (!operation.payload.targetMargin) return null;
        newPrice = costPrice * (1 + operation.payload.targetMargin);
        break;

      case "percentage_increase":
        if (!operation.payload.percentage) return null;
        newPrice = currentPrice * (1 + operation.payload.percentage / 100);
        break;

      case "fixed_price":
        if (!operation.payload.fixedPrice) return null;
        newPrice = operation.payload.fixedPrice;
        break;

      case "promotion":
        // This is tricky. Do we change the base price or set a 'discount'?
        // The service contract implies updating 'basePrice' effectively permanently unless reversed.
        // For a true promotion, we should probably toggle 'hasActivePromotion'.
        // BUT, for this specific request "Corrections", let's assume price update for now,
        // OR return a new effective price.
        // Let's implement as a direct discount to base price for simplicity in this 'Pricing Engine' context.
        if (!operation.payload.discountPercentage) return null;
        newPrice = currentPrice * (1 - operation.payload.discountPercentage / 100);
        break;
    }

    if (newPrice <= 0) return null;

    // Rounding
    newPrice = Math.ceil(newPrice);

    return {
      newPrice,
      diffPercentage: ((newPrice - currentPrice) / currentPrice) * 100,
    };
  }
}
