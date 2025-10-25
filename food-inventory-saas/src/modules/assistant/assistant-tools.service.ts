import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Product, ProductDocument } from "../../schemas/product.schema";
import { Inventory, InventoryDocument } from "../../schemas/inventory.schema";
import { Service, ServiceDocument } from "../../schemas/service.schema";
import { Resource, ResourceDocument } from "../../schemas/resource.schema";
import { AppointmentsService } from "../appointments/appointments.service";
import { Tenant, TenantDocument } from "../../schemas/tenant.schema";
import {
  AttributeDescriptor,
  VerticalProfile,
  getVerticalProfile,
} from "../../config/vertical-profiles";

interface InventoryLookupArgs {
  productQuery: string;
  limit?: number;
  attributes?: Record<string, any>;
}

interface ServiceAvailabilityArgs {
  serviceId?: string;
  serviceQuery?: string;
  resourceId?: string;
  resourceName?: string;
  date: string;
  limit?: number;
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
  ) {}

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
        case "check_service_availability":
          return await this.checkServiceAvailability(
            tenantId,
            rawArgs as ServiceAvailabilityArgs,
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
    const verticalProfile = await this.resolveTenantVerticalProfile(tenantId);
    const { baseQuery, normalizedFilters, displayFilters } =
      this.extractAttributeFilters(
        query,
        verticalProfile?.attributeSchema || [],
        args?.attributes,
      );

    const searchTerm =
      baseQuery && baseQuery.length >= 2 ? baseQuery : query;
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
          verticalProfile,
          hasAttributeFilters,
        });
      })
      .filter(Boolean)
      .slice(0, limit);

    return {
      ok: true,
      query,
      matches,
      timestamp: new Date().toISOString(),
    };
  }

  private buildInventoryMatch(params: {
    product: ProductDocument & { [key: string]: any };
    inventory: InventoryDocument & { [key: string]: any };
    normalizedFilters: Record<string, string>;
    displayFilters: Record<string, string>;
    verticalProfile?: VerticalProfile | null;
    hasAttributeFilters: boolean;
  }): Record<string, any> | null {
    const {
      product,
      inventory,
      normalizedFilters,
      displayFilters,
      hasAttributeFilters,
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
          variants.find((variant) => variant.sku === comboAttributes.variantSku) ||
          null;
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
    let reservedQuantity = inventory.reservedQuantity;
    let committedQuantity = inventory.committedQuantity;
    let totalQuantity = inventory.totalQuantity;
    let averageCostPrice = inventory.averageCostPrice;
    let lastCostPrice = inventory.lastCostPrice;

    if (attributeCombination) {
      availableQuantity =
        attributeCombination.availableQuantity ?? availableQuantity;
      reservedQuantity =
        attributeCombination.reservedQuantity ?? reservedQuantity;
      committedQuantity =
        attributeCombination.committedQuantity ?? committedQuantity;
      totalQuantity = attributeCombination.totalQuantity ?? totalQuantity;
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
      ?.filter(
        (lot: any) => lot.status === "available" && lot.expirationDate,
      )
      .sort((a: any, b: any) => {
        const dateA = new Date(a.expirationDate).getTime();
        const dateB = new Date(b.expirationDate).getTime();
        return dateA - dateB;
      })[0];

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
      availableQuantity,
      reservedQuantity,
      committedQuantity,
      totalQuantity,
      unit: selectedVariant?.unit || (product as any).unitOfMeasure,
      sellingPrice,
      averageCostPrice,
      lastCostPrice,
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
    };
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
      return target.some((entry) => this.attributeValueMatches(entry, expected));
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

  private async resolveTenantVerticalProfile(
    tenantId: string,
  ): Promise<VerticalProfile> {
    const tenant = await this.tenantModel
      .findById(tenantId)
      .select("verticalProfile")
      .lean();
    const key = tenant?.verticalProfile?.key;
    const overrides = tenant?.verticalProfile?.overrides;
    return getVerticalProfile(key, overrides);
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
          `Availability check failed for service ${service._id.toString()} (tenant ${tenantId}): ${
            (error as Error).message
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
}
