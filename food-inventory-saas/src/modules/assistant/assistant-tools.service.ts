import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Product, ProductDocument } from "../../schemas/product.schema";
import { Inventory, InventoryDocument } from "../../schemas/inventory.schema";
import { Service, ServiceDocument } from "../../schemas/service.schema";
import { Resource, ResourceDocument } from "../../schemas/resource.schema";
import { AppointmentsService } from "../appointments/appointments.service";

interface InventoryLookupArgs {
  productQuery: string;
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
    const regex = new RegExp(this.escapeRegExp(query), "i");

    const matchedProducts = await this.productModel
      .find({
        tenantId: tenantObjectId,
        $or: [
          { name: regex },
          { sku: regex },
          { tags: regex },
          { description: regex },
          { "variants.sku": regex },
          { "variants.name": regex },
        ],
      })
      .limit(limit * 3)
      .lean();

    this.logger.log(
      `[DEBUG] Found ${matchedProducts.length} products matching query "${query}"`,
    );
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

        const matchingVariant =
          product.variants?.find(
            (variant) => variant.sku === inventory.variantSku,
          ) ?? product.variants?.[0];
        const defaultSellingUnit =
          product.sellingUnits?.find((unit) => unit.isDefault) ?? null;

        const sellingPrice =
          defaultSellingUnit?.pricePerUnit ??
          matchingVariant?.basePrice ??
          product.pricingRules?.usdPrice ??
          null;

        // Obtener información de lotes para próximas expiraciones
        const nextExpiringLot = inventory.lots
          ?.filter((lot: any) => lot.status === "available" && lot.expirationDate)
          .sort((a: any, b: any) => {
            const dateA = new Date(a.expirationDate).getTime();
            const dateB = new Date(b.expirationDate).getTime();
            return dateA - dateB;
          })[0];

        return {
          productId: product._id.toString(),
          productName: inventory.productName || product.name,
          sku: inventory.variantSku || inventory.productSku || product.sku,
          baseSku: product.sku,
          // Información del producto
          brand: product.brand,
          category: product.category,
          subcategory: product.subcategory,
          description: product.description,
          ingredients: product.ingredients,
          isPerishable: product.isPerishable,
          // Inventario
          availableQuantity: inventory.availableQuantity,
          reservedQuantity: inventory.reservedQuantity,
          committedQuantity: inventory.committedQuantity,
          totalQuantity: inventory.totalQuantity,
          unit: matchingVariant?.unit || product.unitOfMeasure,
          // Precios
          sellingPrice,
          averageCostPrice: inventory.averageCostPrice,
          lastCostPrice: inventory.lastCostPrice,
          // Alertas
          alerts: inventory.alerts,
          // Próxima expiración (si aplica)
          nextExpirationDate: nextExpiringLot?.expirationDate || null,
          nextExpiringQuantity: nextExpiringLot?.availableQuantity || null,
        };
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
