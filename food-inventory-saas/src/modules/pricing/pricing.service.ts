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
  ids?: string[]; // New: Support for specific product selection
  status?: 'active' | 'inactive' | 'all';

  // === NEW: Supplier Payment Configuration Filters ===
  // Filtra productos por la moneda de pago configurada en el proveedor
  supplierPaymentCurrency?: string; // USD, USD_PARALELO, VES, EUR
  // Filtra productos por método de pago preferido del proveedor
  supplierPaymentMethod?: string; // zelle, efectivo_usd, transferencia_ves, pago_movil
  // Filtra solo productos adquiridos a tasa paralela
  usesParallelRate?: boolean;
  // Filtra productos por múltiples proveedores
  supplierIds?: string[];
}

export interface BulkPriceOperation {
  type: "inflation_formula" | "margin_update" | "percentage_increase" | "promotion" | "fixed_price" | "supplier_rate_adjustment";
  payload: {
    parallelRate?: number;
    bcvRate?: number;
    targetMargin?: number; // e.g., 0.30 for 30%
    percentage?: number; // e.g., 10 for 10%
    fixedPrice?: number;
    discountPercentage?: number;
    durationDays?: number;
    startDate?: Date;

    // === NEW: Supplier Rate Adjustment Payload ===
    // Para ajustar precios cuando un proveedor cambia sus tasas
    oldRate?: number; // Tasa anterior del proveedor
    newRate?: number; // Nueva tasa del proveedor
    rateType?: 'parallel' | 'bcv' | 'custom'; // Tipo de tasa que cambió
    adjustCostPrice?: boolean; // Si también actualizar el costPrice
    preserveMargin?: boolean; // Mantener el margen actual al ajustar
  };
}

export interface PriceUpdatePreview {
  productId: string;
  productName: string;
  sku: string;
  currentPrice: number; // In VES (or base currency)
  newPrice: number;
  newPriceUSD?: number;
  diffPercentage: number;
  costPrice: number; // Reference cost
  variantId?: string; // If specific variant
  isVariant: boolean;
  hasError?: boolean;
  errorMessage?: string;
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
              newPriceUSD: result.newPriceUSD,
              diffPercentage: result.diffPercentage,
              hasError: result.hasError,
              errorMessage: result.errorMessage
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
    console.log("---------------------------------------------------");
    console.log("PRICING ENGINE: findProductsByCriteria called");
    console.log("CRITERIA:", JSON.stringify(criteria, null, 2));

    const { Types } = require("mongoose");
    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
    };

    // Status Filter - ROBUST CHECK
    console.log("Status param received:", criteria.status);

    if (criteria.status === 'inactive') {
      filter.isActive = false;
      console.log("Filter set to INACTIVE only");
    } else if (criteria.status === 'all') {
      // Explicitly remove isActive if it exists
      delete filter.isActive;
      console.log("Filter set to ALL (Active + Inactive)");
    } else {
      // Default to Active only (backward compatibility)
      filter.isActive = true;
      console.log("Filter defaulted to ACTIVE only");
    }

    // Explicit ID Filter (from manual selection)
    if (criteria.ids && criteria.ids.length > 0) {
      filter._id = { $in: criteria.ids.map(id => new Types.ObjectId(id)) };
    }

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

    // Multiple Suppliers Filter
    if (criteria.supplierIds && criteria.supplierIds.length > 0) {
      filter["suppliers.supplierId"] = {
        $in: criteria.supplierIds.map(id => new Types.ObjectId(id))
      };
    }

    // === NEW: SUPPLIER PAYMENT CONFIGURATION FILTERS ===
    // These filters work directly on the product's supplier configuration,
    // NOT on purchase order history. This allows updating ALL products
    // from suppliers that sell in a specific currency, regardless of
    // whether they were recently purchased.

    // Filter by supplier's payment currency (USD, USD_PARALELO, VES, EUR)
    if (criteria.supplierPaymentCurrency) {
      filter["suppliers.paymentCurrency"] = criteria.supplierPaymentCurrency;
      console.log(`FILTER: Supplier Payment Currency = ${criteria.supplierPaymentCurrency}`);
    }

    // Filter by supplier's preferred payment method
    if (criteria.supplierPaymentMethod) {
      // Match products where ANY supplier uses this payment method
      filter["$or"] = [
        { "suppliers.preferredPaymentMethod": criteria.supplierPaymentMethod },
        { "suppliers.acceptedPaymentMethods": criteria.supplierPaymentMethod }
      ];
      console.log(`FILTER: Supplier Payment Method = ${criteria.supplierPaymentMethod}`);
    }

    // Filter products acquired at parallel rate
    if (criteria.usesParallelRate !== undefined) {
      filter["suppliers.usesParallelRate"] = criteria.usesParallelRate;
      console.log(`FILTER: Uses Parallel Rate = ${criteria.usesParallelRate}`);
    }

    // Legacy Payment Method Filter (from purchase orders - kept for backward compatibility)
    if (criteria.paymentMethod && !criteria.supplierPaymentMethod && !criteria.supplierPaymentCurrency) {
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

    console.log("FINAL MONGO FILTER:", JSON.stringify(filter));

    // DEBUG: Count before returning
    const count = await this.productModel.countDocuments(filter);
    console.log(`FOUND PRODUCTS COUNT: ${count}`);
    console.log("---------------------------------------------------");

    return this.productModel.find(filter).exec();
  }

  private calculateNewPrice(
    currentPrice: number,
    costPrice: number,
    operation: BulkPriceOperation,
  ): { newPrice: number; diffPercentage: number; newPriceUSD?: number; hasError?: boolean; errorMessage?: string } | null {
    let newPrice = currentPrice;
    let newPriceUSD: number | undefined;

    switch (operation.type) {
      case "inflation_formula":
        // Formula specified by user: 
        // 1. Adjusted Cost = (Cost in $) * (Parallel Rate) / (BCV Rate)
        // 2. Final Price = Adjusted Cost + Margin %

        const { parallelRate, bcvRate, targetMargin } = operation.payload;
        if (!parallelRate || !bcvRate || targetMargin === undefined) return null;

        if (costPrice <= 0) {
          return {
            newPrice: 0,
            diffPercentage: 0,
            hasError: true,
            errorMessage: "Sin Costo de Referencia"
          };
        }

        // Step 1: Calculate "Real" Cost in terms of official inventory currency value
        // Note: Interpreting 'costPrice' as USD based on user request "Precio de costo en $"
        const adjustedCost = costPrice * (parallelRate / bcvRate);

        // Step 2: Apply Margin
        // "Sumar el porcentaje de margen" -> Cost * (1 + Margin)
        const targetPriceOfficialUSD = adjustedCost * (1 + targetMargin);

        // Step 3: Convert to VES (System Base Price)
        // The result above is in "Official USD terms", so we multiply by BCV to get VES.
        // Math check: (CostUSD * Par / BCV) * (1+M) * BCV = CostUSD * Par * (1+M)
        newPrice = Math.ceil(targetPriceOfficialUSD * bcvRate);
        newPriceUSD = targetPriceOfficialUSD;
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

      case "supplier_rate_adjustment":
        // === NEW: Supplier Rate Adjustment ===
        // Ajusta precios cuando un proveedor cambia su tasa de venta
        // Ejemplo: Proveedor vendía a 50 Bs/$, ahora vende a 55 Bs/$
        // Todos los productos de ese proveedor deben ajustarse proporcionalmente
        const { oldRate, newRate, preserveMargin } = operation.payload;

        if (!oldRate || !newRate || oldRate <= 0) {
          return {
            newPrice: currentPrice,
            diffPercentage: 0,
            hasError: true,
            errorMessage: "Tasas inválidas"
          };
        }

        // Calcular el factor de ajuste: newRate / oldRate
        const adjustmentFactor = newRate / oldRate;

        if (preserveMargin && costPrice > 0) {
          // Calcular el margen actual
          const currentMargin = (currentPrice - costPrice) / currentPrice;
          // Ajustar el costo proporcionalmente
          const newCost = costPrice * adjustmentFactor;
          // Aplicar el mismo margen al nuevo costo
          newPrice = newCost / (1 - currentMargin);
        } else {
          // Ajuste directo proporcional
          newPrice = currentPrice * adjustmentFactor;
        }
        break;
    }

    if (newPrice <= 0) {
      // If we fall here but not because of cost error (handled above), it might be calculation error
      // But let's return null to exclude it if it's truly invalid, OR return error if it's relevant.
      // For now, if cost was > 0 but result is <= 0 (unlikely with positive inputs), we return null.
      return null;
    }

    // Rounding
    newPrice = Math.ceil(newPrice);

    return {
      newPrice,
      newPriceUSD,
      diffPercentage: ((newPrice - currentPrice) / currentPrice) * 100,
    };
  }
}
