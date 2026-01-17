import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Product, ProductDocument } from "../../schemas/product.schema";
import { Inventory, InventoryDocument } from "../../schemas/inventory.schema";
import { Service, ServiceDocument } from "../../schemas/service.schema";
import { Resource, ResourceDocument } from "../../schemas/resource.schema";
import { AppointmentsService } from "../appointments/appointments.service";
import { Tenant, TenantDocument } from "../../schemas/tenant.schema";
import { OrdersService } from "../orders/orders.service";
import {
  AttributeDescriptor,
  VerticalProfile,
  getVerticalProfile,
} from "../../config/vertical-profiles";
import { UnitConversionUtil } from "../../utils/unit-conversion.util";
import { ExchangeRateService } from "../exchange-rate/exchange-rate.service";
import {
  PublicCreateAppointmentDto,
  PublicRescheduleAppointmentDto,
  PublicCancelAppointmentDto,
} from "../appointments/dto/public-appointment.dto";

interface InventoryLookupArgs {
  productQuery: string;
  limit?: number;
  attributes?: Record<string, any>;
  quantity?: number | string;
  unit?: string;
}

interface PromotionLookupArgs {
  limit?: number;
}

interface ServiceAvailabilityArgs {
  serviceId?: string;
  serviceQuery?: string;
  resourceId?: string;
  resourceName?: string;
  date: string;
  limit?: number;
}

interface ServiceBookingArgs {
  serviceId?: string;
  serviceQuery?: string;
  startTime?: string;
  date?: string;
  time?: string;
  resourceId?: string;
  resourceName?: string;
  partySize?: number;
  notes?: string;
  customer?: {
    firstName?: string;
    lastName?: string;
    name?: string;
    email?: string;
    phone?: string;
    preferredLanguage?: string;
  };
  addons?: Array<{ name: string; price?: number; quantity?: number }>;
  metadata?: Record<string, any>;
  acceptPolicies?: boolean;
}

interface CreateOrderArgs {
  customer: {
    name: string;
    phone?: string;
    rif?: string;
    email?: string;
  };
  customerId?: string;
  items: {
    productId: string;
    quantity: number;
    variantId?: string;
  }[];
  deliveryMethod?: "pickup" | "delivery" | "store";
  paymentMethod?: string;
  notes?: string;
}

interface ModifyBookingArgs {
  appointmentId: string;
  cancellationCode: string;
  newStartTime: string;
  notes?: string;
}

interface CancelBookingArgs {
  appointmentId: string;
  cancellationCode: string;
  reason?: string;
}

interface RequestedMeasurement {
  quantity: number;
  unit: string;
  normalizedUnit?: string;
  source: "args" | "query" | "combined";
  rawInput?: string;
}

interface AssistantTenantContext {
  verticalProfile: VerticalProfile | null;
  currencyCode?: string;
  currencySymbol?: string;
  exchangeRates?: {
    ves?: {
      rate: number;
      source?: string;
      fetchedAt?: string;
    };
  };
}

@Injectable()
export class AssistantToolsService {
  private readonly logger = new Logger(AssistantToolsService.name);

  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Inventory.name)
    private readonly inventoryModel: Model<InventoryDocument>,
    @InjectModel(Service.name)
    private readonly serviceModel: Model<ServiceDocument>,
    @InjectModel(Resource.name)
    private readonly resourceModel: Model<ResourceDocument>,
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>,
    private readonly appointmentsService: AppointmentsService,
    private readonly ordersService: OrdersService,
    private readonly exchangeRateService: ExchangeRateService,
  ) { }

  async executeTool(
    tenantId: string,
    toolName: string,
    rawArgs: Record<string, any>,
  ): Promise<Record<string, any>> {
    try {
      switch (toolName) {
        case "get_inventory_status":
          return await this.lookupProductInventory(
            tenantId,
            rawArgs as InventoryLookupArgs,
          );
        case "list_active_promotions":
          return await this.listActivePromotions(
            tenantId,
            rawArgs as PromotionLookupArgs,
          );
        case "check_service_availability":
          return await this.checkServiceAvailability(
            tenantId,
            rawArgs as ServiceAvailabilityArgs,
          );
        case "create_service_booking":
          return await this.createServiceBooking(
            tenantId,
            rawArgs as ServiceBookingArgs,
          );
        case "modify_service_booking":
          return await this.modifyServiceBooking(
            tenantId,
            rawArgs as ModifyBookingArgs,
          );
        case "cancel_service_booking":
          return await this.cancelServiceBooking(
            tenantId,
            rawArgs as CancelBookingArgs,
          );
        case "create_order":
          return await this.create_order(
            rawArgs as CreateOrderArgs,
            tenantId,
          );
        default:
          this.logger.warn(`Tool "${toolName}" is not implemented.`);
          return {
            ok: false,
            message: `La herramienta "${toolName}" no está disponible.`,
          };
      }
    } catch (error) {
      this.logger.error(
        `Tool "${toolName}" execution failed for tenant ${tenantId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      return {
        ok: false,
        message:
          (error as Error).message ||
          "Error ejecutando la herramienta solicitada.",
      };
    }
  }

  private async lookupProductInventory(
    tenantId: string,
    args: InventoryLookupArgs,
  ): Promise<Record<string, any>> {
    const query = args?.productQuery?.trim();
    const limit = Math.min(Math.max(Number(args?.limit) || 5, 1), 10);

    if (!query) {
      return {
        ok: false,
        message: "Debes proporcionar un nombre, SKU o referencia del producto.",
      };
    }

    const tenantObjectId = new Types.ObjectId(tenantId);
    const tenantContext = await this.resolveTenantContext(tenantId);
    const { sanitizedQuery, measurement: requestedMeasurement } =
      this.buildRequestedMeasurement(query, args);

    const queryForFilters = sanitizedQuery || query;
    const { baseQuery, normalizedFilters, displayFilters } =
      this.extractAttributeFilters(
        queryForFilters,
        tenantContext.verticalProfile?.attributeSchema || [],
        args?.attributes,
      );

    const searchTerm =
      baseQuery && baseQuery.length >= 2 ? baseQuery : queryForFilters;
    const regex = new RegExp(this.escapeRegExp(searchTerm), "i");
    const hasAttributeFilters = Object.keys(normalizedFilters).length > 0;

    const matchedProducts = await this.productModel
      .find({
        tenantId: tenantObjectId,
        $or: [
          { name: regex },
          { sku: regex },
          { tags: regex },
          { description: regex },
          { ingredients: regex },
          { brand: regex },
          { category: regex },
          { subcategory: regex },
          { "variants.sku": regex },
          { "variants.name": regex },
          { "variants.description": regex },
        ],
      })
      .limit(limit * 3)
      .lean();

    this.logger.log(
      `[DEBUG] Found ${matchedProducts.length} products matching query "${searchTerm}"`,
    );
    if (hasAttributeFilters) {
      this.logger.log(
        `[DEBUG] Attribute filters detected: ${JSON.stringify(displayFilters)}`,
      );
    }
    if (matchedProducts.length > 0) {
      this.logger.log(
        `[DEBUG] Product IDs: ${matchedProducts.map((p) => p._id.toString()).join(", ")}`,
      );
      this.logger.log(
        `[DEBUG] Product names: ${matchedProducts.map((p) => p.name).join(", ")}`,
      );
    }

    if (!matchedProducts.length) {
      return {
        ok: true,
        query,
        matches: [],
        message: "No se encontraron productos que coincidan con la búsqueda.",
        timestamp: new Date().toISOString(),
      };
    }

    const productIds = matchedProducts.map((product) => product._id);
    // El productId en el inventario puede ser string o ObjectId, así que buscamos ambos
    const productIdsAsStrings = productIds.map((id) => id.toString());

    const inventories = await this.inventoryModel
      .find({
        tenantId: tenantObjectId,
        $or: [
          { productId: { $in: productIds } },
          { productId: { $in: productIdsAsStrings } },
        ],
        isActive: { $ne: false },
      })
      .lean();

    this.logger.log(
      `[DEBUG] Found ${inventories.length} inventory records for ${productIds.length} products`,
    );
    if (inventories.length > 0) {
      this.logger.log(
        `[DEBUG] Inventory productIds: ${inventories.map((i: any) => i.productId?.toString()).join(", ")}`,
      );
    }

    const inventoryByProductId = new Map<string, InventoryDocument>();
    for (const inventory of inventories) {
      inventoryByProductId.set(
        inventory.productId.toString(),
        inventory as InventoryDocument,
      );
    }

    const matches = matchedProducts
      .map((product) => {
        const inventory = inventoryByProductId.get(product._id.toString());
        if (!inventory) {
          return null;
        }

        return this.buildInventoryMatch({
          product,
          inventory,
          normalizedFilters,
          displayFilters,
          verticalProfile: tenantContext.verticalProfile,
          hasAttributeFilters,
          requestedMeasurement,
          tenantContext,
        });
      })
      .filter(Boolean)
      .slice(0, limit);

    return {
      ok: true,
      query,
      matches,
      relatedPromotions: await this.findRelatedPromotions(
        tenantId,
        matchedProducts,
      ),
      timestamp: new Date().toISOString(),
    };
  }

  private async listActivePromotions(
    tenantId: string,
    args: PromotionLookupArgs = {},
  ): Promise<Record<string, any>> {
    const limit = Math.min(Math.max(Number(args?.limit) || 5, 1), 10);
    const tenantObjectId = new Types.ObjectId(tenantId);
    const tenantContext = await this.resolveTenantContext(tenantId);
    const now = new Date();

    const promotionProducts = await this.productModel
      .find({
        tenantId: tenantObjectId,
        hasActivePromotion: true,
        "promotion.isActive": true,
        "promotion.startDate": { $lte: now },
        "promotion.endDate": { $gte: now },
      })
      .limit(limit * 2)
      .lean();

    if (!promotionProducts.length) {
      return {
        ok: true,
        promotions: [],
        message: "No hay promociones activas registradas en este momento.",
        timestamp: new Date().toISOString(),
      };
    }

    const productIds = promotionProducts.map((product) => product._id);
    const inventories = await this.inventoryModel
      .find({
        tenantId: tenantObjectId,
        productId: { $in: productIds },
        isActive: { $ne: false },
      })
      .lean();

    const inventoryMap = new Map<
      string,
      InventoryDocument & { [key: string]: any }
    >();
    inventories.forEach((inventory) => {
      inventoryMap.set(inventory.productId.toString(), inventory as any);
    });

    const promotions = promotionProducts
      .map((product) => {
        const inventory =
          inventoryMap.get(product._id.toString()) || ({} as any);

        const defaultSellingUnit =
          (product as any).sellingUnits?.find((unit: any) => unit.isDefault) ??
          (product as any).sellingUnits?.find((unit: any) => unit.isActive) ??
          null;

        let selectedVariant: any = null;
        if (
          Array.isArray((product as any).variants) &&
          (product as any).variants.length
        ) {
          selectedVariant =
            (product as any).variants.find(
              (variant: any) => variant?.isActive,
            ) || (product as any).variants[0];
        }

        let promotionInfo: any = null;
        if ((product as any).promotion?.isActive) {
          const discountPercentage =
            (product as any).promotion.discountPercentage || 0;
          const baselinePrice =
            defaultSellingUnit?.pricePerUnit ??
            selectedVariant?.basePrice ??
            (product as any).pricingRules?.usdPrice ??
            0;
          const discountedPrice =
            baselinePrice * (1 - discountPercentage / 100);

          promotionInfo = {
            discountPercentage,
            originalPrice: baselinePrice,
            discountedPrice,
            reason: (product as any).promotion.reason,
            startDate: (product as any).promotion.startDate,
            endDate: (product as any).promotion.endDate,
          };
        }

        const pricing = this.buildPricingDetails({
          product,
          inventory,
          defaultSellingUnit,
          selectedVariant,
          tenantContext,
          promotionInfo,
        });

        // Hide exact stock quantities unless limited (< 10 units) to create urgency
        const availQty = inventory.availableQuantity;
        const hasLimitedStock = typeof availQty === "number" && availQty < 10;
        const stockStatus =
          typeof availQty === "number" && availQty > 0
            ? hasLimitedStock
              ? "limitado"
              : "disponible"
            : "agotado";

        return {
          productId: product._id.toString(),
          productName: (product as any).name,
          brand: (product as any).brand,
          category: (product as any).category,
          subcategory: (product as any).subcategory,
          promotion: promotionInfo,
          pricing,
          availableQuantity: hasLimitedStock ? availQty : null,
          stockStatus,
          hasLimitedStock,
          attributes: (product as any).attributes || undefined,
        };
      })
      .slice(0, limit);

    return {
      ok: true,
      promotions,
      timestamp: new Date().toISOString(),
    };
  }

  private buildRequestedMeasurement(
    rawQuery: string,
    args: InventoryLookupArgs,
  ): {
    sanitizedQuery: string;
    measurement?: RequestedMeasurement | null;
  } {
    const query = rawQuery?.trim() || "";
    const extraction = UnitConversionUtil.extractMeasurement(query);
    const sanitizedQuery = extraction.normalizedText || query;

    const explicitQuantity = this.parseQuantityArg(args?.quantity);
    const explicitUnit =
      typeof args?.unit === "string" && args.unit.trim()
        ? args.unit.trim()
        : undefined;

    let quantity: number | undefined;
    let unit: string | undefined;
    let normalizedUnit: string | undefined;
    let source: RequestedMeasurement["source"] | undefined;

    if (explicitQuantity !== undefined) {
      quantity = explicitQuantity;
      source = "args";
    }

    if (
      extraction.quantity !== undefined &&
      Number.isFinite(extraction.quantity)
    ) {
      if (quantity !== undefined && source === "args") {
        source = "combined";
      } else if (quantity === undefined) {
        quantity = extraction.quantity;
        source = source || "query";
      }
    }

    if (explicitUnit) {
      unit = explicitUnit;
      normalizedUnit =
        UnitConversionUtil.normalizeWeightUnit(explicitUnit) || undefined;
      source = source === "query" ? "combined" : source || "args";
    }

    if (!unit && extraction.unit) {
      unit = extraction.unit;
      normalizedUnit =
        extraction.normalizedUnit ||
        UnitConversionUtil.normalizeWeightUnit(extraction.unit) ||
        undefined;
      source = source === "args" ? "combined" : source || "query";
    }

    if (
      quantity === undefined ||
      unit === undefined ||
      !Number.isFinite(quantity)
    ) {
      return { sanitizedQuery };
    }

    return {
      sanitizedQuery,
      measurement: {
        quantity,
        unit,
        normalizedUnit: normalizedUnit || undefined,
        rawInput: extraction.rawMatch,
        source: source || "query",
      },
    };
  }

  private parseQuantityArg(value: unknown): number | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }
    if (typeof value === "number") {
      return Number.isFinite(value) ? value : undefined;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) {
        return undefined;
      }
      const normalized = trimmed.replace(",", ".");
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  }

  private async findRelatedPromotions(
    tenantId: string,
    matchedProducts: any[],
  ): Promise<any[]> {
    if (!matchedProducts.length) return [];

    const tenantObjectId = new Types.ObjectId(tenantId);
    const now = new Date();

    // Extract categories and brands from matched products
    const categories = new Set<string>();
    const brands = new Set<string>();
    matchedProducts.forEach((product) => {
      if (Array.isArray(product.category)) {
        product.category.forEach((cat: string) => categories.add(cat));
      }
      if (product.brand) brands.add(product.brand);
    });

    // Find products with active promotions in same categories or brands
    const promotionProducts = await this.productModel
      .find({
        tenantId: tenantObjectId,
        hasActivePromotion: true,
        "promotion.isActive": true,
        "promotion.startDate": { $lte: now },
        "promotion.endDate": { $gte: now },
        $or: [
          { category: { $in: Array.from(categories) } },
          { brand: { $in: Array.from(brands) } },
        ],
      })
      .limit(5)
      .lean();

    if (!promotionProducts.length) return [];

    // Get inventory for promoted products
    const productIds = promotionProducts.map((p) => p._id);
    const inventories = await this.inventoryModel
      .find({
        tenantId: tenantObjectId,
        productId: { $in: productIds },
        isActive: { $ne: false },
        availableQuantity: { $gt: 0 },
      })
      .lean();

    const inventoryMap = new Map();
    inventories.forEach((inv) => {
      inventoryMap.set(inv.productId.toString(), inv);
    });

    // Build promotion info
    return promotionProducts
      .filter((product) => inventoryMap.has(product._id.toString()))
      .map((product) => {
        const inventory = inventoryMap.get(product._id.toString());
        const variant = product.variants?.[0];
        const basePrice = variant?.basePrice || 0;
        const discountPercentage = product.promotion?.discountPercentage || 0;
        const discountedPrice = basePrice * (1 - discountPercentage / 100);

        return {
          productId: product._id.toString(),
          productName: product.name,
          brand: product.brand,
          category: product.category,
          originalPrice: basePrice,
          discountedPrice,
          discountPercentage,
          availableQuantity: inventory.availableQuantity,
          reason: product.promotion?.reason,
          endDate: product.promotion?.endDate,
        };
      });
  }

  private buildInventoryMatch(params: {
    product: ProductDocument & { [key: string]: any };
    inventory: InventoryDocument & { [key: string]: any };
    normalizedFilters: Record<string, string>;
    displayFilters: Record<string, string>;
    verticalProfile?: VerticalProfile | null;
    hasAttributeFilters: boolean;
    requestedMeasurement?: RequestedMeasurement | null;
    tenantContext: AssistantTenantContext;
  }): Record<string, any> | null {
    const {
      product,
      inventory,
      normalizedFilters,
      displayFilters,
      hasAttributeFilters,
      requestedMeasurement,
      tenantContext,
    } = params;

    const filtersApplied = Object.keys(normalizedFilters);
    const variants: any[] = Array.isArray((product as any).variants)
      ? ((product as any).variants as any[])
      : [];

    let selectedVariant =
      filtersApplied.length > 0
        ? this.findVariantMatch(variants, normalizedFilters)
        : null;

    if (!selectedVariant && inventory.variantSku) {
      selectedVariant =
        variants.find((variant) => variant.sku === inventory.variantSku) ||
        null;
    }
    if (!selectedVariant && variants.length) {
      selectedVariant = variants[0];
    }

    const attributeCombination = this.findAttributeCombination(
      inventory,
      normalizedFilters,
    );

    if (
      attributeCombination &&
      !selectedVariant &&
      attributeCombination.attributes
    ) {
      const comboAttributes = attributeCombination.attributes;
      if (comboAttributes.variantSku) {
        selectedVariant =
          variants.find(
            (variant) => variant.sku === comboAttributes.variantSku,
          ) || null;
      } else {
        selectedVariant =
          this.findVariantMatch(variants, comboAttributes) || selectedVariant;
      }
    }

    const productMatches = this.matchesAttributes(
      (product as any).attributes,
      normalizedFilters,
    );
    const inventoryMatches = this.matchesAttributes(
      (inventory as any).attributes,
      normalizedFilters,
    );
    const variantMatches =
      selectedVariant &&
      this.matchesAttributes(selectedVariant.attributes, normalizedFilters);

    if (
      hasAttributeFilters &&
      !(
        productMatches ||
        inventoryMatches ||
        variantMatches ||
        attributeCombination
      )
    ) {
      return null;
    }

    let availableQuantity = inventory.availableQuantity;
    let averageCostPrice = inventory.averageCostPrice;
    const lastCostPrice = inventory.lastCostPrice;

    if (attributeCombination) {
      availableQuantity =
        attributeCombination.availableQuantity ?? availableQuantity;
      averageCostPrice =
        attributeCombination.averageCostPrice ?? averageCostPrice;
    }

    const defaultSellingUnit =
      (product as any).sellingUnits?.find((unit: any) => unit.isDefault) ??
      null;

    const sellingPrice =
      defaultSellingUnit?.pricePerUnit ??
      selectedVariant?.basePrice ??
      (product as any).pricingRules?.usdPrice ??
      null;

    const nextExpiringLot = (inventory as any).lots
      ?.filter((lot: any) => lot.status === "available" && lot.expirationDate)
      .sort((a: any, b: any) => {
        const dateA = new Date(a.expirationDate).getTime();
        const dateB = new Date(b.expirationDate).getTime();
        return dateA - dateB;
      })[0];

    // Check if product has active promotion
    let promotionInfo: any = null;
    if (
      (product as any).hasActivePromotion &&
      (product as any).promotion?.isActive
    ) {
      const now = new Date();
      const startDate = new Date((product as any).promotion.startDate);
      const endDate = new Date((product as any).promotion.endDate);

      if (now >= startDate && now <= endDate) {
        const discountPercentage =
          (product as any).promotion.discountPercentage || 0;
        const originalPrice = sellingPrice || 0;
        const discountedPrice = originalPrice * (1 - discountPercentage / 100);

        promotionInfo = {
          discountPercentage,
          originalPrice,
          discountedPrice,
          reason: (product as any).promotion.reason,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        };
      }
    }

    const pricingDetails = this.buildPricingDetails({
      product,
      inventory,
      defaultSellingUnit,
      selectedVariant,
      requestedMeasurement,
      tenantContext,
      promotionInfo,
    });

    // Hide exact stock quantities unless limited (< 10 units) to create urgency
    const hasLimitedStock =
      typeof availableQuantity === "number" && availableQuantity < 10;
    const stockStatus =
      typeof availableQuantity === "number" && availableQuantity > 0
        ? hasLimitedStock
          ? "limitado"
          : "disponible"
        : "agotado";

    return {
      productId: product._id.toString(),
      productName: inventory.productName || (product as any).name,
      sku:
        inventory.variantSku ||
        selectedVariant?.sku ||
        inventory.productSku ||
        (product as any).sku,
      baseSku: (product as any).sku,
      brand: (product as any).brand,
      category: (product as any).category,
      subcategory: (product as any).subcategory,
      description: (product as any).description,
      ingredients: (product as any).ingredients,
      isPerishable: (product as any).isPerishable,
      availableQuantity: hasLimitedStock ? availableQuantity : null,
      stockStatus,
      hasLimitedStock,
      unit: selectedVariant?.unit || (product as any).unitOfMeasure,
      sellingPrice: promotionInfo?.discountedPrice ?? sellingPrice,
      originalPrice: promotionInfo?.originalPrice,
      averageCostPrice,
      lastCostPrice,
      promotion: promotionInfo,
      alerts: (inventory as any).alerts,
      nextExpirationDate: nextExpiringLot?.expirationDate || null,
      nextExpiringQuantity: nextExpiringLot?.availableQuantity || null,
      productAttributes: (product as any).attributes || undefined,
      variantAttributes: selectedVariant?.attributes || undefined,
      inventoryAttributes: (inventory as any).attributes || undefined,
      attributeCombination: attributeCombination
        ? {
          attributes: attributeCombination.attributes,
          availableQuantity: attributeCombination.availableQuantity,
          reservedQuantity: attributeCombination.reservedQuantity,
          committedQuantity: attributeCombination.committedQuantity,
          totalQuantity: attributeCombination.totalQuantity,
          averageCostPrice: attributeCombination.averageCostPrice,
        }
        : undefined,
      attributeFiltersApplied: filtersApplied.length
        ? displayFilters
        : undefined,
      requestedMeasurement: requestedMeasurement
        ? {
          quantity: requestedMeasurement.quantity,
          unit: requestedMeasurement.unit,
          normalizedUnit: requestedMeasurement.normalizedUnit,
          source: requestedMeasurement.source,
        }
        : undefined,
      pricing: pricingDetails || undefined,
    };
  }

  private buildPricingDetails(params: {
    product: ProductDocument & { [key: string]: any };
    inventory: InventoryDocument & { [key: string]: any };
    defaultSellingUnit: any | null;
    selectedVariant: any | null;
    requestedMeasurement?: RequestedMeasurement | null;
    tenantContext: AssistantTenantContext;
    promotionInfo?: any | null;
  }): Record<string, any> | null {
    const {
      product,
      defaultSellingUnit,
      selectedVariant,
      requestedMeasurement,
      tenantContext,
      promotionInfo,
    } = params;

    const unitPriceContext = this.resolveUnitPrice({
      product,
      defaultSellingUnit,
      selectedVariant,
      promotionInfo,
    });

    const { unitPrice, unitLabel, source: unitPriceSource } = unitPriceContext;

    const baseCurrencyCode = "USD";
    const baseCurrencySymbol = "$";

    const measurementUnitNormalized = requestedMeasurement?.normalizedUnit
      ? requestedMeasurement.normalizedUnit
      : UnitConversionUtil.normalizeWeightUnit(
        requestedMeasurement?.unit || "",
      );
    const priceUnitNormalized = UnitConversionUtil.normalizeWeightUnit(
      unitLabel || "",
    );

    const baseUnitNormalized =
      UnitConversionUtil.normalizeWeightUnit(product.unitOfMeasure || "") ||
      UnitConversionUtil.normalizeWeightUnit(
        defaultSellingUnit?.abbreviation || "",
      ) ||
      UnitConversionUtil.normalizeWeightUnit(selectedVariant?.unit || "");

    let quantityInUnitPrice: number | null = null;
    let quantityInBaseUnit: number | null = null;

    if (
      requestedMeasurement &&
      typeof requestedMeasurement.quantity === "number" &&
      Number.isFinite(requestedMeasurement.quantity)
    ) {
      if (
        measurementUnitNormalized &&
        (priceUnitNormalized ||
          (unitLabel &&
            unitLabel.toLowerCase() ===
            (requestedMeasurement.unit || "").toLowerCase()))
      ) {
        if (priceUnitNormalized) {
          quantityInUnitPrice = UnitConversionUtil.convertWeight(
            requestedMeasurement.quantity,
            measurementUnitNormalized,
            priceUnitNormalized,
          );
        }

        if (
          quantityInUnitPrice === null &&
          unitLabel &&
          requestedMeasurement.unit &&
          unitLabel.toLowerCase() === requestedMeasurement.unit.toLowerCase()
        ) {
          quantityInUnitPrice = requestedMeasurement.quantity;
        }
      }

      if (measurementUnitNormalized && baseUnitNormalized) {
        quantityInBaseUnit = UnitConversionUtil.convertWeight(
          requestedMeasurement.quantity,
          measurementUnitNormalized,
          baseUnitNormalized,
        );
      } else if (
        baseUnitNormalized &&
        requestedMeasurement.unit &&
        requestedMeasurement.unit.toLowerCase() === baseUnitNormalized
      ) {
        quantityInBaseUnit = requestedMeasurement.quantity;
      }
    }

    const baseUnit =
      baseUnitNormalized ||
      priceUnitNormalized ||
      product.unitOfMeasure ||
      unitLabel ||
      null;

    let totalPrice: number | null = null;
    if (
      unitPrice !== null &&
      quantityInUnitPrice !== null &&
      Number.isFinite(quantityInUnitPrice)
    ) {
      totalPrice = UnitConversionUtil.calculateTotalPrice(
        quantityInUnitPrice,
        unitPrice,
      );
    }

    const formattedUnitPrice =
      unitPrice !== null
        ? this.formatCurrency(unitPrice, baseCurrencySymbol, baseCurrencyCode)
        : undefined;

    const formattedTotalPrice =
      totalPrice !== null
        ? this.formatCurrency(totalPrice, baseCurrencySymbol, baseCurrencyCode)
        : undefined;

    const conversions: Record<
      string,
      {
        currencyCode: string;
        currencySymbol?: string;
        rate?: number;
        source?: string;
        fetchedAt?: string;
        unitPrice?: number;
        formattedUnitPrice?: string;
        totalPrice?: number;
        formattedTotalPrice?: string;
      }
    > = {};

    const vesRate = tenantContext.exchangeRates?.ves?.rate;
    if (vesRate && unitPrice !== null) {
      const symbol = tenantContext.currencySymbol || "Bs";
      const unitPriceVes = unitPrice * vesRate;
      const totalPriceVes =
        totalPrice !== null ? totalPrice * vesRate : undefined;
      conversions.ves = {
        currencyCode: "VES",
        currencySymbol: symbol,
        rate: vesRate,
        source: tenantContext.exchangeRates?.ves?.source,
        fetchedAt: tenantContext.exchangeRates?.ves?.fetchedAt,
        unitPrice: unitPriceVes,
        formattedUnitPrice: this.formatCurrency(unitPriceVes, symbol, "VES"),
        totalPrice: totalPriceVes,
        formattedTotalPrice:
          totalPriceVes !== undefined
            ? this.formatCurrency(totalPriceVes, symbol, "VES")
            : undefined,
      };
    }

    const requestedDisplay =
      requestedMeasurement &&
        typeof requestedMeasurement.quantity === "number" &&
        requestedMeasurement.unit
        ? this.formatQuantityDisplay(
          requestedMeasurement.quantity,
          requestedMeasurement.unit,
        )
        : undefined;

    const baseDisplay =
      quantityInBaseUnit !== null && baseUnit
        ? this.formatQuantityDisplay(quantityInBaseUnit, baseUnit)
        : undefined;

    const summaryParts: string[] = [];
    if (requestedDisplay) {
      summaryParts.push(requestedDisplay);
    }
    if (baseDisplay && baseDisplay !== requestedDisplay) {
      summaryParts.push(`≈ ${baseDisplay}`);
    }
    if (formattedTotalPrice) {
      summaryParts.push(`→ ${formattedTotalPrice}`);
    }
    const vesConversion = conversions.ves?.formattedTotalPrice;
    if (vesConversion) {
      summaryParts.push(
        `≈ ${vesConversion} ${conversions.ves?.source ? `(BCV)` : ""}`.trim(),
      );
    }

    const conversionSummary =
      summaryParts.length > 0 ? summaryParts.join(" ") : undefined;

    if (unitPrice === null && totalPrice === null && !requestedMeasurement) {
      return {
        unitPrice: null,
        unitLabel,
        unitPriceSource,
        currencySymbol: baseCurrencySymbol,
        currencyCode: baseCurrencyCode,
      };
    }

    return {
      unitPrice,
      unitLabel,
      unitPriceSource,
      currencySymbol: baseCurrencySymbol,
      currencyCode: baseCurrencyCode,
      formattedUnitPrice,
      requestedQuantity: requestedMeasurement?.quantity,
      requestedUnit: requestedMeasurement?.unit,
      requestedUnitNormalized: measurementUnitNormalized,
      quantityInUnitPrice:
        quantityInUnitPrice !== null ? quantityInUnitPrice : undefined,
      baseUnit: baseUnit || undefined,
      quantityInBaseUnit:
        quantityInBaseUnit !== null ? quantityInBaseUnit : undefined,
      totalPrice: totalPrice !== null ? totalPrice : undefined,
      formattedTotalPrice,
      conversionSummary,
      hasMeasurement: !!requestedMeasurement,
      conversions: Object.keys(conversions).length ? conversions : undefined,
    };
  }

  private resolveUnitPrice(params: {
    product: ProductDocument & { [key: string]: any };
    defaultSellingUnit: any | null;
    selectedVariant: any | null;
    promotionInfo?: any | null;
  }): {
    unitPrice: number | null;
    unitLabel: string | null;
    source: "promotion" | "selling_unit" | "variant" | "pricing_rules" | null;
  } {
    const { product, defaultSellingUnit, selectedVariant, promotionInfo } =
      params;

    if (
      defaultSellingUnit &&
      typeof defaultSellingUnit.pricePerUnit === "number" &&
      Number.isFinite(defaultSellingUnit.pricePerUnit)
    ) {
      const hasPromotion =
        promotionInfo &&
        typeof promotionInfo.discountedPrice === "number" &&
        Number.isFinite(promotionInfo.discountedPrice);

      const unitPrice = hasPromotion
        ? promotionInfo.discountedPrice
        : defaultSellingUnit.pricePerUnit;

      return {
        unitPrice,
        unitLabel: defaultSellingUnit.abbreviation || product.unitOfMeasure,
        source: hasPromotion ? "promotion" : "selling_unit",
      };
    }

    if (
      selectedVariant &&
      typeof selectedVariant.basePrice === "number" &&
      Number.isFinite(selectedVariant.basePrice)
    ) {
      return {
        unitPrice: selectedVariant.basePrice,
        unitLabel: selectedVariant.unit || product.unitOfMeasure || null,
        source: "variant",
      };
    }

    const usdPrice = product?.pricingRules?.usdPrice;
    if (typeof usdPrice === "number" && Number.isFinite(usdPrice)) {
      return {
        unitPrice: usdPrice,
        unitLabel: product.unitOfMeasure || "unidad",
        source: "pricing_rules",
      };
    }

    return {
      unitPrice: null,
      unitLabel: product.unitOfMeasure || null,
      source: null,
    };
  }

  private formatQuantityDisplay(
    quantity: number,
    unit?: string | null,
  ): string {
    const formattedQuantity = this.formatNumber(quantity);
    return unit ? `${formattedQuantity} ${unit}`.trim() : formattedQuantity;
  }

  private formatNumber(value: number, maximumFractionDigits = 3): string {
    if (!Number.isFinite(value)) {
      return String(value);
    }

    const absValue = Math.abs(value);
    const minimumFractionDigits =
      absValue >= 1 ? 0 : Math.min(2, maximumFractionDigits);

    return new Intl.NumberFormat("es-VE", {
      maximumFractionDigits,
      minimumFractionDigits,
    }).format(Number(value));
  }

  private formatCurrency(
    value: number,
    currencySymbol?: string,
    currencyCode?: string,
  ): string {
    if (!Number.isFinite(value)) {
      return "";
    }

    const formatted = new Intl.NumberFormat("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value));

    if (currencySymbol) {
      return `${currencySymbol} ${formatted}`.trim();
    }
    if (currencyCode) {
      return `${currencyCode} ${formatted}`.trim();
    }
    return formatted;
  }

  private findVariantMatch(
    variants: any[] | undefined,
    filters: Record<string, string>,
  ): any | null {
    if (!variants?.length || !Object.keys(filters).length) {
      return null;
    }

    return (
      variants.find((variant) =>
        this.matchesAttributes(variant?.attributes || {}, filters),
      ) ||
      variants.find((variant) =>
        this.matchesAttributes(variant as Record<string, any>, filters),
      ) ||
      null
    );
  }

  private findAttributeCombination(
    inventory: InventoryDocument & { [key: string]: any },
    filters: Record<string, string>,
  ) {
    if (!Object.keys(filters).length) {
      return null;
    }
    const combinations = inventory.attributeCombinations;
    if (!Array.isArray(combinations) || !combinations.length) {
      return null;
    }

    return (
      combinations.find((combination: any) =>
        this.matchesAttributes(combination?.attributes, filters),
      ) || null
    );
  }

  private matchesAttributes(
    source: Record<string, any> | undefined,
    filters: Record<string, string>,
  ): boolean {
    if (!source || !Object.keys(filters).length) {
      return false;
    }

    for (const [key, value] of Object.entries(filters)) {
      if (!this.attributeValueMatches(source[key], value)) {
        return false;
      }
    }

    return true;
  }

  private attributeValueMatches(target: any, expected: string): boolean {
    if (target === undefined || target === null) {
      return false;
    }
    if (Array.isArray(target)) {
      return target.some((entry) =>
        this.attributeValueMatches(entry, expected),
      );
    }
    const normalizedTarget = this.normalizeString(String(target));
    const normalizedExpected = this.normalizeString(expected);
    if (!normalizedTarget || !normalizedExpected) {
      return false;
    }
    return (
      normalizedTarget === normalizedExpected ||
      normalizedTarget.includes(normalizedExpected)
    );
  }

  private async resolveTenantContext(
    tenantId: string,
  ): Promise<AssistantTenantContext> {
    const tenant = await this.tenantModel
      .findById(tenantId)
      .select("verticalProfile settings.currency")
      .lean();

    const key = tenant?.verticalProfile?.key;
    const overrides = tenant?.verticalProfile?.overrides;
    const verticalProfile = getVerticalProfile(key, overrides);

    const currencyCode = tenant?.settings?.currency?.primary;
    const exchangeRates: AssistantTenantContext["exchangeRates"] = {};

    try {
      const bcvRate = await this.exchangeRateService.getBCVRate();
      if (bcvRate?.rate) {
        exchangeRates.ves = {
          rate: bcvRate.rate,
          source: bcvRate.source,
          fetchedAt: bcvRate.lastUpdate
            ? new Date(bcvRate.lastUpdate).toISOString()
            : undefined,
        };
      }
    } catch (error) {
      this.logger.warn(
        `No se pudo obtener la tasa BCV para tenant ${tenantId}: ${(error as Error).message}`,
      );
    }

    return {
      verticalProfile,
      currencyCode: currencyCode || undefined,
      currencySymbol: this.resolveCurrencySymbol(currencyCode),
      exchangeRates: Object.keys(exchangeRates).length
        ? exchangeRates
        : undefined,
    };
  }

  private resolveCurrencySymbol(
    currencyCode?: string | null,
  ): string | undefined {
    if (!currencyCode) {
      return undefined;
    }

    const upper = currencyCode.toUpperCase();
    switch (upper) {
      case "VES":
      case "VEF":
        return "Bs";
      case "USD":
        return "$";
      case "EUR":
        return "€";
      case "COP":
      case "ARS":
      case "MXN":
        return "$";
      case "PEN":
        return "S/";
      case "BRL":
        return "R$";
      default:
        return undefined;
    }
  }

  private extractAttributeFilters(
    rawQuery: string,
    descriptors: AttributeDescriptor[],
    explicit?: Record<string, any>,
  ): {
    baseQuery: string;
    normalizedFilters: Record<string, string>;
    displayFilters: Record<string, string>;
  } {
    const normalizedFilters: Record<string, string> = {};
    const displayFilters: Record<string, string> = {};

    if (explicit && typeof explicit === "object") {
      for (const [key, value] of Object.entries(explicit)) {
        if (value === undefined || value === null) {
          continue;
        }
        const valueStr = String(value).trim();
        if (!valueStr) {
          continue;
        }
        normalizedFilters[key] = this.normalizeString(valueStr);
        displayFilters[key] = valueStr;
      }
    }

    let baseQuery = rawQuery;

    for (const descriptor of descriptors) {
      const tokens = [descriptor.key, descriptor.label]
        .map((token) => token?.trim())
        .filter(Boolean)
        .map((token) =>
          token
            ?.split(/\s+/)
            .map((part) => this.escapeRegExp(part))
            .join("\\s+"),
        )
        .filter(Boolean);

      if (!tokens.length) {
        continue;
      }

      const tokenPattern = tokens.join("|");
      const attributeRegex = new RegExp(
        `\\b(?:${tokenPattern})\\b\\s*(?:[:=]?\\s*)([\\wÁÉÍÓÚÜáéíóúüñ0-9\\-_/]+(?:\\s+[\\wÁÉÍÓÚÜáéíóúüñ0-9\\-_/]+){0,2})`,
        "gi",
      );

      baseQuery = baseQuery.replace(
        attributeRegex,
        (fullMatch: string, rawValue: string) => {
          if (displayFilters[descriptor.key]) {
            return fullMatch;
          }
          const cleanedValue = rawValue
            ?.trim()
            ?.replace(/^[=:]/, "")
            ?.replace(/[.,;]+$/g, "")
            ?.trim();
          if (!cleanedValue) {
            return fullMatch;
          }

          normalizedFilters[descriptor.key] =
            this.normalizeString(cleanedValue);
          displayFilters[descriptor.key] = cleanedValue;
          return " ";
        },
      );
    }

    baseQuery = baseQuery.replace(/\s+/g, " ").trim();

    return {
      baseQuery,
      normalizedFilters,
      displayFilters,
    };
  }

  private normalizeString(value: string | undefined | null): string {
    if (!value) {
      return "";
    }
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  private async checkServiceAvailability(
    tenantId: string,
    args: ServiceAvailabilityArgs,
  ): Promise<Record<string, any>> {
    const { serviceId, serviceQuery, resourceId, resourceName, date } =
      args || {};

    if (!date) {
      return {
        ok: false,
        message: "Debes indicar la fecha a consultar (formato YYYY-MM-DD).",
      };
    }

    const candidateServices = await this.findCandidateServices(
      tenantId,
      serviceId,
      serviceQuery,
      args?.limit,
    );
    if (!candidateServices.length) {
      return {
        ok: true,
        query: { serviceId, serviceQuery, date },
        matches: [],
        message:
          "No se encontraron servicios activos que coincidan con la consulta.",
        timestamp: new Date().toISOString(),
      };
    }

    let resolvedResourceId: string | undefined;
    if (resourceId) {
      resolvedResourceId = resourceId;
    } else if (resourceName) {
      const resource = await this.resourceModel
        .findOne({
          tenantId,
          name: new RegExp(this.escapeRegExp(resourceName), "i"),
          status: "active",
        })
        .lean();
      resolvedResourceId = resource?._id?.toString();
    }

    const matches: Array<{
      serviceId: string;
      serviceName: string;
      durationMinutes: number;
      price: number;
      requiresResource: boolean;
      resourceId?: string;
      availableSlots: Array<{ start: string; end: string }>;
      note?: string;
    }> = [];
    for (const service of candidateServices) {
      try {
        const slots = await this.appointmentsService.getAvailableSlots(
          tenantId,
          {
            serviceId: service._id.toString(),
            resourceId: resolvedResourceId,
            date,
          },
        );
        matches.push({
          serviceId: service._id.toString(),
          serviceName: service.name,
          durationMinutes: service.duration,
          price: service.price,
          requiresResource: service.requiresResource,
          resourceId: resolvedResourceId,
          availableSlots: slots,
        });
      } catch (error) {
        this.logger.warn(
          `Availability check failed for service ${service._id.toString()} (tenant ${tenantId}): ${(error as Error).message
          }`,
        );
        matches.push({
          serviceId: service._id.toString(),
          serviceName: service.name,
          durationMinutes: service.duration,
          price: service.price,
          requiresResource: service.requiresResource,
          resourceId: resolvedResourceId,
          availableSlots: [],
          note: (error as Error).message,
        });
      }
    }

    return {
      ok: true,
      query: { serviceId, serviceQuery, resourceId: resolvedResourceId, date },
      matches,
      timestamp: new Date().toISOString(),
    };
  }

  private async create_order(
    args: CreateOrderArgs,
    tenantId: string,
    user?: any,
  ) {
    try {
      this.logger.log(`Creating order for tenant ${tenantId}`);

      // We need a user object for auditing (createdBy). If user is not present (e.g. public chat),
      // we might need a system user or handle it.
      // Assuming 'user' passed here is valid (it comes from the controller/gateway).
      // If user is undefined, we construct a minimal one or defaults.

      const orderUser = user || { id: "assistant-bot", tenantId };

      const itemsWithResolvedIds = await Promise.all(
        args.items.map(async (item) => {
          let productId = item.productId;
          // Check if productId is a valid ObjectId
          if (!Types.ObjectId.isValid(productId)) {
            this.logger.log(
              `Invalid ObjectId '${productId}' for order item. Attempting lookup by name/sku...`,
            );
            // Try to find product by name or SKU
            const safeRegex = new RegExp(this.escapeRegExp(productId), "i");
            const product = await this.productModel
              .findOne({
                tenantId: new Types.ObjectId(tenantId),
                $or: [
                  { name: { $regex: safeRegex } },
                  { sku: { $regex: safeRegex } },
                  { "variants.sku": { $regex: safeRegex } },
                ],
              })
              .select("_id")
              .lean();

            if (product) {
              this.logger.log(
                `Resolved product '${productId}' to ID ${product._id}`,
              );
              productId = product._id.toString();
            } else {
              this.logger.warn(
                `Could not resolve product '${productId}' to a valid ID.`,
              );
              // Leave it as is, it might fail in ordersService but we tried.
            }
          }
          return {
            productId,
            quantity: item.quantity,
            variantId: item.variantId,
          };
        }),
      );

      const createOrderDto = {
        items: itemsWithResolvedIds,
        customerId: args.customerId,
        customerName: args.customer?.name || "Cliente WhatsApp",
        customerPhone: args.customer?.phone,
        customerRif: args.customer?.rif, // If provided
        taxType: "V", // Default or extract from string
        customerAddress: "", // Optional
        deliveryMethod: args.deliveryMethod || "pickup",
        notes: args.paymentMethod
          ? `${args.notes || ""} [Pago: ${args.paymentMethod}]`.trim()
          : args.notes,
        channel: "whatsapp",
      };

      const order = await this.ordersService.create(createOrderDto as any, orderUser);

      return {
        ok: true,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        message: `Orden #${order.orderNumber} creada exitosamente. Total: $${order.totalAmount}.`,
      };
    } catch (error) {
      this.logger.error(`Error creating order: ${error.message}`, error.stack);
      return {
        ok: false,
        message: `No se pudo crear la orden: ${error.message}`,
      };
    }
  }

  private async createServiceBooking(
    tenantId: string,
    args: ServiceBookingArgs,
  ): Promise<Record<string, any>> {
    if (!args) {
      return {
        ok: false,
        message: "Debes indicar los datos de la reserva que deseas crear.",
      };
    }

    const services = await this.findCandidateServices(
      tenantId,
      args.serviceId,
      args.serviceQuery,
      1,
    );

    if (!services.length) {
      return {
        ok: false,
        message:
          "No encontré un servicio activo que coincida con tu solicitud. Especifica el nombre exacto o el ID del servicio.",
      };
    }

    const service = services[0];
    const startTimeIso = this.resolveStartTimeISO({
      explicit: args.startTime,
      date: args.date,
      time: args.time,
    });

    if (!startTimeIso) {
      return {
        ok: false,
        message:
          "No pude interpretar la fecha y hora solicitadas. Proporciónalas en formato ISO o incluye `date` (YYYY-MM-DD) y `time` (HH:mm).",
      };
    }

    const customerFirstName =
      args.customer?.firstName ||
      this.extractFirstName(args.customer?.name) ||
      undefined;
    const customerLastName =
      args.customer?.lastName || this.extractLastName(args.customer?.name);
    const customerEmail = args.customer?.email?.trim();
    const customerPhone = args.customer?.phone?.trim();

    if (!customerFirstName || !customerEmail || !customerPhone) {
      return {
        ok: false,
        message:
          "Para crear la reserva necesito nombre, correo electrónico y teléfono del huésped principal.",
      };
    }

    const resolvedResourceId = await this.resolveResourceId(
      tenantId,
      args.resourceId,
      args.resourceName,
    );

    const normalizedAddons = (args.addons || []).map((addon) => ({
      name: addon.name,
      price: Number.isFinite(addon.price) ? Number(addon.price) : 0,
      quantity:
        addon.quantity && addon.quantity > 0 ? Math.floor(addon.quantity) : 1,
    }));

    const payload: PublicCreateAppointmentDto = {
      tenantId,
      serviceId: service._id.toString(),
      startTime: startTimeIso,
      notes: args.notes,
      resourceId: resolvedResourceId,
      locationId: (service as any)?.locationId?.toString(),
      partySize:
        args.partySize && args.partySize > 0
          ? Math.floor(args.partySize)
          : undefined,
      addons: normalizedAddons,
      metadata: {
        ...(args.metadata || {}),
        assistantTool: "create_service_booking",
        requestedAt: new Date().toISOString(),
      },
      acceptPolicies: args.acceptPolicies !== false,
      customer: {
        firstName: customerFirstName,
        lastName: customerLastName,
        email: customerEmail,
        phone: customerPhone,
        preferredLanguage: args.customer?.preferredLanguage,
      },
      guests: [],
    } as PublicCreateAppointmentDto;

    try {
      const result = await this.appointmentsService.createFromPublic(payload);
      const normalizedStart = this.normalizeDateOutput(result.startTime);
      const normalizedEnd = this.normalizeDateOutput(result.endTime);
      const startTime =
        normalizedStart ?? this.coerceToString(result.startTime);
      const endTime = normalizedEnd ?? this.coerceToString(result.endTime);
      return {
        ok: true,
        appointmentId: result.appointmentId,
        status: result.status,
        cancellationCode: result.cancellationCode,
        startTime,
        endTime,
        message: "Reserva creada correctamente.",
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No fue posible crear la reserva.";
      return {
        ok: false,
        message,
      };
    }
  }

  private async modifyServiceBooking(
    tenantId: string,
    args: ModifyBookingArgs,
  ): Promise<Record<string, any>> {
    if (!args?.appointmentId || !args?.cancellationCode) {
      return {
        ok: false,
        message:
          "Debes indicar el ID de la reserva y el código de cancelación para modificarla.",
      };
    }

    const newStartTimeIso = this.resolveStartTimeISO({
      explicit: args.newStartTime,
    });

    if (!newStartTimeIso) {
      return {
        ok: false,
        message:
          "No pude interpretar la nueva fecha/hora. Envíala en formato ISO (YYYY-MM-DDTHH:mm:ssZ).",
      };
    }

    const payload: PublicRescheduleAppointmentDto = {
      tenantId,
      cancellationCode: args.cancellationCode,
      newStartTime: newStartTimeIso,
      notes: args.notes,
    } as PublicRescheduleAppointmentDto;

    try {
      const result = await this.appointmentsService.rescheduleFromPublic(
        args.appointmentId,
        payload,
      );
      const normalizedStart = this.normalizeDateOutput(result.startTime);
      const normalizedEnd = this.normalizeDateOutput(result.endTime);
      const startTime =
        normalizedStart ?? this.coerceToString(result.startTime);
      const endTime = normalizedEnd ?? this.coerceToString(result.endTime);
      return {
        ok: true,
        appointmentId: result.appointmentId,
        status: result.status,
        startTime,
        endTime,
        message: "Reserva reprogramada exitosamente.",
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No fue posible reprogramar la reserva.";
      return {
        ok: false,
        message,
      };
    }
  }

  private async cancelServiceBooking(
    tenantId: string,
    args: CancelBookingArgs,
  ): Promise<Record<string, any>> {
    if (!args?.appointmentId || !args?.cancellationCode) {
      return {
        ok: false,
        message:
          "Debes indicar el ID de la reserva y el código de cancelación para anularla.",
      };
    }

    const payload: PublicCancelAppointmentDto = {
      tenantId,
      cancellationCode: args.cancellationCode,
      reason: args.reason,
    } as PublicCancelAppointmentDto;

    try {
      const result = await this.appointmentsService.cancelFromPublic(
        args.appointmentId,
        payload,
      );
      return {
        ok: true,
        appointmentId: result.appointmentId,
        previousStatus: result.previousStatus,
        newStatus: result.newStatus,
        cancelledAt:
          (result.cancelledAt instanceof Date
            ? result.cancelledAt.toISOString()
            : result.cancelledAt) || new Date().toISOString(),
        message: "Reserva cancelada correctamente.",
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No fue posible cancelar la reserva.";
      return {
        ok: false,
        message,
      };
    }
  }

  private async findCandidateServices(
    tenantId: string,
    serviceId?: string,
    serviceQuery?: string,
    limit = 3,
  ): Promise<ServiceDocument[]> {
    if (serviceId) {
      const service = await this.serviceModel
        .findOne({ tenantId, _id: serviceId, status: "active" })
        .lean();
      return service ? [service as ServiceDocument] : [];
    }

    if (!serviceQuery?.trim()) {
      return [];
    }

    const regex = new RegExp(this.escapeRegExp(serviceQuery.trim()), "i");
    return this.serviceModel
      .find({
        tenantId,
        status: "active",
        $or: [{ name: regex }, { category: regex }],
      })
      .limit(Math.min(Math.max(Number(limit) || 3, 1), 10))
      .lean();
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  private resolveStartTimeISO(args: {
    explicit?: string;
    date?: string;
    time?: string;
  }): string | null {
    if (args.explicit) {
      const explicitDate = new Date(args.explicit);
      if (!Number.isNaN(explicitDate.getTime())) {
        return explicitDate.toISOString();
      }
    }

    if (args.date && args.time) {
      const combined = new Date(`${args.date}T${args.time}`);
      if (!Number.isNaN(combined.getTime())) {
        return combined.toISOString();
      }
    }

    if (args.date) {
      const dateOnly = new Date(`${args.date}T12:00:00`);
      if (!Number.isNaN(dateOnly.getTime())) {
        return dateOnly.toISOString();
      }
    }

    return null;
  }

  private extractFirstName(name?: string): string | undefined {
    if (!name) {
      return undefined;
    }
    const parts = name.trim().split(/\s+/);
    return parts.length ? parts[0] : undefined;
  }

  private extractLastName(name?: string): string | undefined {
    if (!name) {
      return undefined;
    }
    const parts = name.trim().split(/\s+/);
    if (parts.length <= 1) {
      return undefined;
    }
    return parts.slice(1).join(" ");
  }

  private normalizeDateOutput(value: unknown): string | undefined {
    if (!value) {
      return undefined;
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === "string") {
      return value;
    }
    if (
      typeof value === "object" &&
      typeof (value as any)?.toISOString === "function"
    ) {
      try {
        return (value as any).toISOString();
      } catch (error) {
        this.logger.warn(
          `No se pudo normalizar la fecha devuelta por el servicio de citas: ${(error as Error).message}`,
        );
      }
    }
    return undefined;
  }

  private coerceToString(value: unknown): string | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }
    try {
      return String(value);
    } catch (error) {
      this.logger.warn(
        `No fue posible convertir el valor a texto en assistant-tools: ${(error as Error).message}`,
      );
      return undefined;
    }
  }

  private async resolveResourceId(
    tenantId: string,
    resourceId?: string,
    resourceName?: string,
  ): Promise<string | undefined> {
    if (resourceId) {
      return resourceId;
    }
    if (!resourceName) {
      return undefined;
    }

    const resource = await this.resourceModel
      .findOne({
        tenantId,
        status: "active",
        name: new RegExp(this.escapeRegExp(resourceName.trim()), "i"),
      })
      .lean();

    return resource?._id?.toString();
  }
}
