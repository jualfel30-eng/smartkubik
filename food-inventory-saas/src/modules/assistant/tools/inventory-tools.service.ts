import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  Inventory,
  InventoryDocument,
  InventoryMovement,
  InventoryMovementDocument,
} from "../../../schemas/inventory.schema";
import { Product, ProductDocument } from "../../../schemas/product.schema";
import { Tenant, TenantDocument } from "../../../schemas/tenant.schema";
import {
  Warehouse,
  WarehouseDocument,
} from "../../../schemas/warehouse.schema";

@Injectable()
export class InventoryToolsService {
  private readonly logger = new Logger(InventoryToolsService.name);

  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Inventory.name)
    private readonly inventoryModel: Model<InventoryDocument>,
    @InjectModel(InventoryMovement.name)
    private readonly inventoryMovementModel: Model<InventoryMovementDocument>,
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>,
    @InjectModel(Warehouse.name)
    private readonly warehouseModel: Model<WarehouseDocument>,
  ) {}

  // ─── 1. Add Inventory ──────────────────────────────────────────────

  async addInventory(
    tenantId: string,
    args: {
      productName: string;
      quantity: number;
      cost?: number;
      lotNumber?: string;
      expirationDate?: string;
    },
    user?: any,
  ): Promise<Record<string, any>> {
    try {
      const product = await this.resolveProduct(tenantId, args.productName);
      if (!product) {
        return {
          ok: false,
          message: `No se encontró el producto "${args.productName}".`,
        };
      }

      if (!args.quantity || args.quantity <= 0) {
        return {
          ok: false,
          message: "La cantidad debe ser mayor a 0.",
        };
      }

      const tid = new Types.ObjectId(tenantId);
      let inventory = await this.inventoryModel.findOne({
        tenantId: tid,
        productId: product._id,
        isActive: true,
      });

      if (inventory) {
        // Create an inventory movement to add stock
        const unitCost =
          args.cost || inventory.averageCostPrice || 0;

        await this.inventoryMovementModel.create({
          tenantId: tid,
          inventoryId: inventory._id,
          productId: product._id,
          productSku: product.sku,
          movementType: "adjustment",
          quantity: args.quantity,
          unitCost,
          totalCost: unitCost * args.quantity,
          reason: "Adición de inventario vía asistente AI",
          lotNumber: args.lotNumber,
          balanceBefore: {
            totalQuantity: inventory.totalQuantity,
            availableQuantity: inventory.availableQuantity,
            reservedQuantity: inventory.reservedQuantity,
            averageCostPrice: inventory.averageCostPrice,
          },
          balanceAfter: {
            totalQuantity: inventory.totalQuantity + args.quantity,
            availableQuantity: inventory.availableQuantity + args.quantity,
            reservedQuantity: inventory.reservedQuantity,
            averageCostPrice: inventory.averageCostPrice,
          },
          createdBy: user?._id || new Types.ObjectId(),
        });

        await this.inventoryModel.updateOne(
          { _id: inventory._id },
          { $inc: { totalQuantity: args.quantity, availableQuantity: args.quantity } },
        );

        // If lot info provided, push to lots array
        if (args.lotNumber) {
          const lotEntry: any = {
            lotNumber: args.lotNumber,
            quantity: args.quantity,
            availableQuantity: args.quantity,
            reservedQuantity: 0,
            costPrice: unitCost,
            receivedDate: new Date(),
            status: "available",
            createdBy: user?._id || new Types.ObjectId(),
          };
          if (args.expirationDate) {
            lotEntry.expirationDate = new Date(args.expirationDate);
          }
          await this.inventoryModel.updateOne(
            { _id: inventory._id },
            { $push: { lots: lotEntry } },
          );
        }
      } else {
        // Create new inventory record
        const warehouseId = await this.getDefaultWarehouseId(tenantId);
        const unitCost = args.cost || 0;

        const newInventory: any = {
          tenantId: tid,
          productId: product._id,
          productSku: product.sku,
          productName: product.name,
          totalQuantity: args.quantity,
          availableQuantity: args.quantity,
          reservedQuantity: 0,
          committedQuantity: 0,
          averageCostPrice: unitCost,
          lastCostPrice: unitCost,
          lots: [],
          isActive: true,
          createdBy: user?._id || new Types.ObjectId(),
        };

        if (warehouseId) {
          newInventory.warehouseId = warehouseId;
        }

        if (args.lotNumber) {
          const lotEntry: any = {
            lotNumber: args.lotNumber,
            quantity: args.quantity,
            availableQuantity: args.quantity,
            reservedQuantity: 0,
            costPrice: unitCost,
            receivedDate: new Date(),
            status: "available",
            createdBy: user?._id || new Types.ObjectId(),
          };
          if (args.expirationDate) {
            lotEntry.expirationDate = new Date(args.expirationDate);
          }
          newInventory.lots = [lotEntry];
        }

        inventory = await this.inventoryModel.create(newInventory);

        // Create initial movement
        await this.inventoryMovementModel.create({
          tenantId: tid,
          inventoryId: inventory._id,
          productId: product._id,
          productSku: product.sku,
          movementType: "adjustment",
          quantity: args.quantity,
          unitCost,
          totalCost: unitCost * args.quantity,
          reason: "Inventario inicial creado vía asistente AI",
          lotNumber: args.lotNumber,
          balanceBefore: { totalQuantity: 0, availableQuantity: 0, reservedQuantity: 0, averageCostPrice: 0 },
          balanceAfter: {
            totalQuantity: args.quantity,
            availableQuantity: args.quantity,
            reservedQuantity: 0,
            averageCostPrice: unitCost,
          },
          createdBy: user?._id || new Types.ObjectId(),
        });
      }

      return {
        ok: true,
        summary: `Se agregaron ${args.quantity} unidades de "${product.name}" al inventario.${args.lotNumber ? ` Lote: ${args.lotNumber}` : ""}`,
        productName: product.name,
        quantityAdded: args.quantity,
      };
    } catch (error) {
      this.logger.error(`addInventory failed: ${(error as Error).message}`);
      return {
        ok: false,
        message: `Error agregando inventario: ${(error as Error).message}`,
      };
    }
  }

  // ─── 2. Adjust Inventory ───────────────────────────────────────────

  async adjustInventory(
    tenantId: string,
    args: {
      productName: string;
      newQuantity: number;
      reason: string;
    },
    user?: any,
  ): Promise<Record<string, any>> {
    try {
      const product = await this.resolveProduct(tenantId, args.productName);
      if (!product) {
        return {
          ok: false,
          message: `No se encontró el producto "${args.productName}".`,
        };
      }

      if (args.newQuantity < 0) {
        return {
          ok: false,
          message: "La cantidad no puede ser negativa.",
        };
      }

      const tid = new Types.ObjectId(tenantId);
      const inventory = await this.inventoryModel.findOne({
        tenantId: tid,
        productId: product._id,
        isActive: true,
      });

      if (!inventory) {
        return {
          ok: false,
          message: `No existe registro de inventario para "${product.name}".`,
        };
      }

      const delta = args.newQuantity - inventory.totalQuantity;

      if (delta === 0) {
        return {
          ok: true,
          summary: `El inventario de "${product.name}" ya está en ${args.newQuantity} unidades. Sin cambios.`,
          productName: product.name,
          currentQuantity: args.newQuantity,
        };
      }

      await this.inventoryMovementModel.create({
        tenantId: tid,
        inventoryId: inventory._id,
        productId: product._id,
        productSku: product.sku,
        movementType: "adjustment",
        quantity: delta,
        unitCost: inventory.averageCostPrice || 0,
        totalCost: Math.abs(delta) * (inventory.averageCostPrice || 0),
        reason: args.reason || "Ajuste de inventario vía asistente AI",
        balanceBefore: {
          totalQuantity: inventory.totalQuantity,
          availableQuantity: inventory.availableQuantity,
          reservedQuantity: inventory.reservedQuantity,
          averageCostPrice: inventory.averageCostPrice,
        },
        balanceAfter: {
          totalQuantity: args.newQuantity,
          availableQuantity: inventory.availableQuantity + delta,
          reservedQuantity: inventory.reservedQuantity,
          averageCostPrice: inventory.averageCostPrice,
        },
        createdBy: user?._id || new Types.ObjectId(),
      });

      await this.inventoryModel.updateOne(
        { _id: inventory._id },
        { $inc: { totalQuantity: delta, availableQuantity: delta } },
      );

      const direction = delta > 0 ? "incrementó" : "redujo";
      return {
        ok: true,
        summary: `Inventario de "${product.name}" ${direction} de ${inventory.totalQuantity} a ${args.newQuantity} unidades (${delta > 0 ? "+" : ""}${delta}). Razón: ${args.reason}`,
        productName: product.name,
        previousQuantity: inventory.totalQuantity,
        newQuantity: args.newQuantity,
        delta,
      };
    } catch (error) {
      this.logger.error(`adjustInventory failed: ${(error as Error).message}`);
      return {
        ok: false,
        message: `Error ajustando inventario: ${(error as Error).message}`,
      };
    }
  }

  // ─── 3. Bulk Add Inventory ─────────────────────────────────────────

  async bulkAddInventory(
    tenantId: string,
    args: {
      items: Array<{
        productName: string;
        quantity: number;
        cost?: number;
      }>;
    },
    user?: any,
  ): Promise<Record<string, any>> {
    try {
      if (!args.items?.length) {
        return {
          ok: false,
          message: "No se proporcionaron productos para agregar.",
        };
      }

      const results: Array<{ productName: string; ok: boolean; message: string }> = [];
      let successCount = 0;
      let errorCount = 0;

      for (const item of args.items) {
        const result = await this.addInventory(tenantId, {
          productName: item.productName,
          quantity: item.quantity,
          cost: item.cost,
        }, user);

        if (result.ok) {
          successCount++;
          results.push({
            productName: item.productName,
            ok: true,
            message: result.summary as string,
          });
        } else {
          errorCount++;
          results.push({
            productName: item.productName,
            ok: false,
            message: result.message as string,
          });
        }
      }

      return {
        ok: errorCount === 0,
        summary: `${successCount} producto(s) actualizado(s), ${errorCount} error(es).`,
        successCount,
        errorCount,
        details: results,
      };
    } catch (error) {
      this.logger.error(
        `bulkAddInventory failed: ${(error as Error).message}`,
      );
      return {
        ok: false,
        message: `Error en carga masiva: ${(error as Error).message}`,
      };
    }
  }

  // ─── 4. Get Inventory Alerts ───────────────────────────────────────

  async getInventoryAlerts(
    tenantId: string,
  ): Promise<Record<string, any>> {
    try {
      const tid = new Types.ObjectId(tenantId);

      // Low stock: availableQuantity <= lowStock threshold or alerts.lowStock is true
      const lowStockItems = await this.inventoryModel
        .find({
          tenantId: tid,
          isActive: true,
          "alerts.lowStock": true,
        })
        .select("productName productSku totalQuantity availableQuantity")
        .lean();

      // Zero stock
      const zeroStockItems = await this.inventoryModel
        .find({
          tenantId: tid,
          isActive: true,
          availableQuantity: { $lte: 0 },
        })
        .select("productName productSku totalQuantity availableQuantity")
        .lean();

      // Near expiration: lots with expirationDate within 30 days
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const nearExpirationItems = await this.inventoryModel
        .find({
          tenantId: tid,
          isActive: true,
          "lots.expirationDate": {
            $lte: thirtyDaysFromNow,
            $gte: new Date(),
          },
          "lots.status": "available",
        })
        .select("productName productSku lots")
        .lean();

      // Format near-expiration with lot details
      const expirationAlerts = nearExpirationItems.map((inv: any) => {
        const expiringLots = (inv.lots || []).filter((lot: any) =>
          lot.expirationDate &&
          new Date(lot.expirationDate) <= thirtyDaysFromNow &&
          new Date(lot.expirationDate) >= new Date() &&
          lot.status === "available",
        );
        return {
          producto: inv.productName,
          sku: inv.productSku,
          lotes: expiringLots.map((lot: any) => ({
            lote: lot.lotNumber,
            cantidad: lot.availableQuantity,
            expira: new Date(lot.expirationDate).toLocaleDateString("es-VE"),
          })),
        };
      });

      const totalAlerts =
        lowStockItems.length + zeroStockItems.length + nearExpirationItems.length;

      if (totalAlerts === 0) {
        return {
          ok: true,
          summary: "No hay alertas de inventario activas.",
          alerts: { stockBajo: [], sinStock: [], proximoAExpirar: [] },
        };
      }

      return {
        ok: true,
        summary: `${totalAlerts} alerta(s) de inventario: ${zeroStockItems.length} sin stock, ${lowStockItems.length} stock bajo, ${nearExpirationItems.length} próximos a expirar.`,
        alerts: {
          sinStock: zeroStockItems.map((i: any) => ({
            producto: i.productName,
            sku: i.productSku,
            disponible: i.availableQuantity,
          })),
          stockBajo: lowStockItems.map((i: any) => ({
            producto: i.productName,
            sku: i.productSku,
            disponible: i.availableQuantity,
            total: i.totalQuantity,
          })),
          proximoAExpirar: expirationAlerts,
        },
      };
    } catch (error) {
      this.logger.error(
        `getInventoryAlerts failed: ${(error as Error).message}`,
      );
      return {
        ok: false,
        message: `Error obteniendo alertas: ${(error as Error).message}`,
      };
    }
  }

  // ─── 5. Get Inventory Summary ──────────────────────────────────────

  async getInventorySummary(
    tenantId: string,
    args: { search?: string; limit?: number },
  ): Promise<Record<string, any>> {
    try {
      const limit = Math.min(args.limit || 15, 50);
      const tid = new Types.ObjectId(tenantId);

      const matchStage: any = {
        tenantId: tid,
        isActive: true,
      };

      // If searching, first find matching products then filter inventory
      let productFilter: Types.ObjectId[] | null = null;
      if (args.search) {
        const regex = new RegExp(this.escapeRegExp(args.search), "i");
        const matchingProducts = await this.productModel
          .find({
            tenantId: tid,
            isActive: true,
            $or: [{ name: regex }, { sku: regex }, { brand: regex }],
          })
          .select("_id")
          .lean();
        productFilter = matchingProducts.map((p: any) => p._id);

        if (productFilter.length === 0) {
          return {
            ok: true,
            message: `No se encontraron productos con "${args.search}".`,
            inventory: [],
          };
        }

        matchStage.productId = { $in: productFilter };
      }

      const inventoryItems = await this.inventoryModel
        .find(matchStage)
        .sort({ productName: 1 })
        .limit(limit)
        .select(
          "productName productSku totalQuantity availableQuantity reservedQuantity averageCostPrice alerts warehouseId",
        )
        .lean();

      if (!inventoryItems.length) {
        return {
          ok: true,
          message: args.search
            ? `No se encontró inventario para "${args.search}".`
            : "No hay registros de inventario.",
          inventory: [],
        };
      }

      const formatted = inventoryItems.map((inv: any) => ({
        producto: inv.productName,
        sku: inv.productSku,
        total: inv.totalQuantity,
        disponible: inv.availableQuantity,
        reservado: inv.reservedQuantity || 0,
        costoPromedio: inv.averageCostPrice
          ? `$${inv.averageCostPrice.toFixed(2)}`
          : "—",
        alertas: this.formatAlertFlags(inv.alerts),
      }));

      return {
        ok: true,
        total: inventoryItems.length,
        inventory: formatted,
      };
    } catch (error) {
      this.logger.error(
        `getInventorySummary failed: ${(error as Error).message}`,
      );
      return {
        ok: false,
        message: `Error obteniendo inventario: ${(error as Error).message}`,
      };
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────

  /**
   * Resolves a product by name, SKU, or ObjectId.
   * Uses case-insensitive regex for name matching (fuzzy).
   */
  private async resolveProduct(
    tenantId: string,
    nameOrSku: string,
  ): Promise<ProductDocument | null> {
    const tid = new Types.ObjectId(tenantId);

    // Try ObjectId first
    if (Types.ObjectId.isValid(nameOrSku) && nameOrSku.length === 24) {
      const byId = await this.productModel
        .findOne({
          _id: new Types.ObjectId(nameOrSku),
          tenantId: tid,
          isActive: true,
        })
        .lean();
      if (byId) return byId as any;
    }

    // Try exact SKU match
    const bySku = await this.productModel
      .findOne({
        tenantId: tid,
        sku: nameOrSku.toUpperCase(),
        isActive: true,
      })
      .lean();
    if (bySku) return bySku as any;

    // Fuzzy name match (case-insensitive)
    const regex = new RegExp(this.escapeRegExp(nameOrSku), "i");
    const byName = await this.productModel
      .findOne({
        tenantId: tid,
        name: regex,
        isActive: true,
      })
      .lean();
    if (byName) return byName as any;

    // Try variant SKU
    const byVariantSku = await this.productModel
      .findOne({
        tenantId: tid,
        "variants.sku": nameOrSku.toUpperCase(),
        isActive: true,
      })
      .lean();
    if (byVariantSku) return byVariantSku as any;

    return null;
  }

  private escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /**
   * Gets the default warehouse ObjectId for a tenant.
   * Checks Tenant.settings.inventory.defaultWarehouse first,
   * then falls back to the warehouse marked isDefault,
   * then falls back to the first active warehouse.
   */
  private async getDefaultWarehouseId(
    tenantId: string,
  ): Promise<Types.ObjectId | null> {
    const tid = new Types.ObjectId(tenantId);

    // Check tenant settings
    const tenant = await this.tenantModel
      .findById(tid)
      .select("settings.inventory.defaultWarehouse")
      .lean();

    if (tenant?.settings?.inventory?.defaultWarehouse) {
      const defaultWarehouseRef = tenant.settings.inventory.defaultWarehouse;
      if (Types.ObjectId.isValid(defaultWarehouseRef)) {
        return new Types.ObjectId(defaultWarehouseRef);
      }
    }

    // Fallback: find warehouse marked as default
    const defaultWarehouse = await this.warehouseModel
      .findOne({
        tenantId: tid,
        isDefault: true,
        isActive: true,
        isDeleted: { $ne: true },
      })
      .select("_id")
      .lean();

    if (defaultWarehouse) return defaultWarehouse._id as Types.ObjectId;

    // Fallback: first active warehouse
    const anyWarehouse = await this.warehouseModel
      .findOne({
        tenantId: tid,
        isActive: true,
        isDeleted: { $ne: true },
      })
      .select("_id")
      .lean();

    return anyWarehouse ? (anyWarehouse._id as Types.ObjectId) : null;
  }

  /**
   * Formats alert flags into a human-readable string.
   */
  private formatAlertFlags(
    alerts?: {
      lowStock?: boolean;
      nearExpiration?: boolean;
      expired?: boolean;
      overstock?: boolean;
    },
  ): string {
    if (!alerts) return "—";
    const flags: string[] = [];
    if (alerts.lowStock) flags.push("Stock bajo");
    if (alerts.nearExpiration) flags.push("Por expirar");
    if (alerts.expired) flags.push("Expirado");
    if (alerts.overstock) flags.push("Sobrestock");
    return flags.length > 0 ? flags.join(", ") : "OK";
  }
}
