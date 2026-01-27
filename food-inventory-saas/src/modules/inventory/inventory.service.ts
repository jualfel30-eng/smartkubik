import { Injectable, Logger } from "@nestjs/common";
import { InjectModel, InjectConnection } from "@nestjs/mongoose";
import { Model, Types, ClientSession, Connection, SortOrder } from "mongoose";
import {
  Inventory,
  InventoryDocument,
  InventoryMovement,
  InventoryMovementDocument,
} from "../../schemas/inventory.schema";
import { Product, ProductDocument } from "../../schemas/product.schema";
import {
  CreateInventoryDto,
  InventoryMovementDto,
  ReserveInventoryDto,
  ReleaseInventoryDto,
  AdjustInventoryDto,
  InventoryQueryDto,
  InventoryMovementQueryDto,
  UpdateInventoryLotsDto,
} from "../../dto/inventory.dto";
import { EventsService } from "../events/events.service";
import { BulkAdjustInventoryDto } from "./dto/bulk-adjust-inventory.dto";

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectModel(Inventory.name)
    private inventoryModel: Model<InventoryDocument>,
    @InjectModel(InventoryMovement.name)
    private movementModel: Model<InventoryMovementDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    private readonly eventsService: EventsService,
    @InjectConnection() private connection: Connection,
  ) {
    this.inventoryModel.collection
      .dropIndex("productId_1_tenantId_1")
      .catch((error: any) => {
        if (error?.codeName !== "IndexNotFound" && error?.message) {
          this.logger.warn?.(
            `No se pudo eliminar el índice legacy productId_1_tenantId_1: ${error.message}`,
          );
        }
      });
  }

  async create(
    createInventoryDto: CreateInventoryDto,
    user: any,
    session?: ClientSession,
  ): Promise<InventoryDocument> {
    const productObjectId = new Types.ObjectId(createInventoryDto.productId);
    const inventoryFilter: Record<string, any> = {
      productId: productObjectId,
      tenantId: this.buildTenantFilter(user.tenantId),
    };

    if (createInventoryDto.variantId) {
      inventoryFilter.variantId = new Types.ObjectId(
        createInventoryDto.variantId,
      );
    } else {
      inventoryFilter.$or = [
        { variantId: { $exists: false } },
        { variantId: null },
      ];
    }

    const existingInventory = await this.inventoryModel
      .findOne(inventoryFilter)
      .session(session ?? null);
    if (existingInventory && existingInventory.isActive !== false) {
      throw new Error("Ya existe inventario para este producto/variante");
    }

    const processedLots =
      createInventoryDto.lots?.map((lot) => ({
        ...lot,
        availableQuantity: lot.quantity,
        reservedQuantity: 0,
        createdBy: user.id,
      })) || [];

    const inventoryData = {
      ...createInventoryDto,
      productId: productObjectId,
      ...(createInventoryDto.variantId && {
        variantId: new Types.ObjectId(createInventoryDto.variantId),
      }),
      lots: processedLots,
      availableQuantity: createInventoryDto.totalQuantity,
      reservedQuantity: 0,
      committedQuantity: 0,
      lastCostPrice: createInventoryDto.averageCostPrice,
      alerts: {
        lowStock: false,
        nearExpiration: false,
        expired: false,
        overstock: false,
      },
      metrics: {
        turnoverRate: 0,
        daysOnHand: 0,
        averageDailySales: 0,
        seasonalityFactor: 1,
      },
      createdBy: user.id,
      tenantId: this.normalizeTenantValue(user.tenantId),
    };
    let inventory = existingInventory;

    if (inventory && inventory.isActive === false) {
      inventory.set({
        ...inventoryData,
        isActive: true,
        updatedBy: user.id,
      });
    } else {
      inventory = new this.inventoryModel(inventoryData);
    }

    const savedInventory = await inventory.save({ session });

    if (createInventoryDto.totalQuantity > 0) {
      await this.createMovementRecord(
        {
          inventoryId: savedInventory._id.toString(),
          productId: createInventoryDto.productId,
          productSku: createInventoryDto.productSku,
          movementType: "in",
          quantity: createInventoryDto.totalQuantity,
          unitCost: createInventoryDto.averageCostPrice,
          totalCost:
            createInventoryDto.totalQuantity *
            createInventoryDto.averageCostPrice,
          reason: "Inventario inicial",
          balanceAfter: {
            totalQuantity: savedInventory.totalQuantity,
            availableQuantity: savedInventory.availableQuantity,
            reservedQuantity: savedInventory.reservedQuantity,
            averageCostPrice: savedInventory.averageCostPrice,
          },
        },
        user,
        session,
      );
    }
    return savedInventory;
  }

  async getTopInventoryItems(tenantId: string, limit: number = 20): Promise<any[]> {
    const inventoryItems = await this.inventoryModel
      .find({
        tenantId: this.buildTenantFilter(tenantId),
        isActive: true,
        totalQuantity: { $gt: 0 },
      })
      .sort({ availableQuantity: -1 }) // Show highest stock first
      .limit(limit)
      .populate("productId", "name sku brand category")
      .lean()
      .exec();

    return inventoryItems.map((item: any) => ({
      productName: item.productId?.name || "Producto Desconocido",
      sku: item.productSku,
      variant: item.variantSku || "N/A",
      available: item.availableQuantity,
      reserved: item.reservedQuantity,
      price: item.averageCostPrice, // Internal view only
      category: item.productId?.category,
    }));
  }

  async remove(id: string, tenantId: string, user: any): Promise<boolean> {
    const inventory = await this.inventoryModel.findOne({
      _id: id,
      tenantId: this.buildTenantFilter(tenantId),
    });

    if (!inventory) {
      return false;
    }

    if (inventory.reservedQuantity > 0) {
      throw new Error(
        "No se puede eliminar el inventario porque hay unidades reservadas.",
      );
    }

    inventory.isActive = false;
    inventory.totalQuantity = 0;
    inventory.availableQuantity = 0;
    inventory.reservedQuantity = 0;
    inventory.committedQuantity = 0;
    inventory.lots = [];
    inventory.alerts = {
      lowStock: false,
      nearExpiration: false,
      expired: false,
      overstock: false,
    };
    inventory.metrics = {
      turnoverRate: 0,
      daysOnHand: 0,
      averageDailySales: 0,
      seasonalityFactor: 1,
    };
    inventory.updatedBy = user.id;

    await inventory.save();
    return true;
  }

  async createMovement(
    movementDto: InventoryMovementDto,
    user: any,
    session?: ClientSession,
  ) {
    const inventory = await this.inventoryModel
      .findById(movementDto.inventoryId)
      .session(session ?? null);
    if (!inventory) throw new Error("Inventario no encontrado");
    const updatedInventory = await this.updateInventoryQuantities(
      inventory,
      movementDto,
      session,
    );
    const movement = await this.createMovementRecord(
      {
        ...movementDto,
        productId: inventory.productId.toString(),
        totalCost: movementDto.quantity * movementDto.unitCost,
        balanceAfter: {
          totalQuantity: updatedInventory.totalQuantity,
          availableQuantity: updatedInventory.availableQuantity,
          reservedQuantity: updatedInventory.reservedQuantity,
          averageCostPrice: updatedInventory.averageCostPrice,
        },
      },
      user,
      session,
    );
    return movement;
  }

  async reserveInventory(
    reserveDto: ReserveInventoryDto,
    user: any,
    session?: ClientSession,
  ) {
    for (const item of reserveDto.items) {
      // BACKWARD COMPATIBILITY: Buscar por variantSku primero, luego por productSku
      const inventoryQuery: any = {
        tenantId: this.buildTenantFilter(user.tenantId),
      };

      // Si el item tiene variantSku, buscar por ese campo
      if (item.productSku && item.productSku.includes("-VAR")) {
        inventoryQuery.variantSku = item.productSku;
      } else {
        // Si no, buscar por productSku (productos antiguos sin variantes)
        inventoryQuery.productSku = item.productSku;
      }

      const inventory = await this.inventoryModel
        .findOne(inventoryQuery)
        .session(session ?? null);

      if (!inventory) {
        // Intentar buscar de la otra manera si no se encontró
        const alternativeQuery: any = {
          tenantId: this.buildTenantFilter(user.tenantId),
        };

        if (item.productSku && item.productSku.includes("-VAR")) {
          alternativeQuery.productSku = item.productSku;
        } else {
          alternativeQuery.variantSku = item.productSku;
        }

        const alternativeInventory = await this.inventoryModel
          .findOne(alternativeQuery)
          .session(session ?? null);

        if (!alternativeInventory) {
          throw new Error(
            `Inventario no encontrado para SKU: ${item.productSku}`,
          );
        }

        // Si encontramos con la búsqueda alternativa, continuar con ese inventario
        await this.processInventoryReservation(
          alternativeInventory,
          item,
          reserveDto.orderId,
          session,
        );
      } else {
        // Si encontramos con la búsqueda principal, continuar con ese inventario
        await this.processInventoryReservation(
          inventory,
          item,
          reserveDto.orderId,
          session,
        );
      }
    }
  }

  private async processInventoryReservation(
    inventory: any,
    item: any,
    orderId: string,
    session?: ClientSession,
  ) {
    if (inventory.availableQuantity < item.quantity) {
      throw new Error(`Stock insuficiente para SKU: ${item.productSku}`);
    }

    inventory.availableQuantity -= item.quantity;
    inventory.reservedQuantity += item.quantity;
    await inventory.save({ session });

    await this.createMovementRecord(
      {
        inventoryId: inventory._id.toString(),
        productId: inventory.productId.toString(),
        productSku: item.productSku,
        movementType: "reservation",
        quantity: item.quantity,
        unitCost: inventory.averageCostPrice,
        totalCost: item.quantity * inventory.averageCostPrice,
        reason: "Reserva para orden",
        reference: orderId,
        orderId: orderId,
        balanceAfter: {
          totalQuantity: inventory.totalQuantity,
          availableQuantity: inventory.availableQuantity,
          reservedQuantity: inventory.reservedQuantity,
          averageCostPrice: inventory.averageCostPrice,
        },
      },
      { id: inventory.createdBy, tenantId: inventory.tenantId } as any, // user context
      session,
    );
  }

  async releaseInventory(
    releaseDto: ReleaseInventoryDto,
    user: any,
    session?: ClientSession,
  ) {
    const reservationMovements = await this.movementModel
      .find({
        orderId: releaseDto.orderId,
        movementType: "reservation",
        tenantId: this.buildTenantFilter(user.tenantId),
      })
      .session(session ?? null);
    if (reservationMovements.length === 0)
      throw new Error("No se encontraron reservas para esta orden");
    for (const movement of reservationMovements) {
      if (
        releaseDto.productSkus &&
        !releaseDto.productSkus.includes(movement.productSku)
      )
        continue;
      const inventory = await this.inventoryModel
        .findById(movement.inventoryId)
        .session(session ?? null);
      if (inventory) {
        inventory.availableQuantity += movement.quantity;
        inventory.reservedQuantity -= movement.quantity;
        await inventory.save({ session });
        await this.createMovementRecord(
          {
            inventoryId: inventory._id.toString(),
            productId: inventory.productId.toString(),
            productSku: movement.productSku,
            movementType: "release",
            quantity: movement.quantity,
            unitCost: movement.unitCost,
            totalCost: movement.totalCost,
            reason: "Liberación de reserva",
            reference: releaseDto.orderId,
            orderId: releaseDto.orderId,
            balanceAfter: {
              totalQuantity: inventory.totalQuantity,
              availableQuantity: inventory.availableQuantity,
              reservedQuantity: inventory.reservedQuantity,
              averageCostPrice: inventory.averageCostPrice,
            },
          },
          user,
          session,
        );
      }
    }
  }

  async commitInventory(order: any, user: any, session?: ClientSession) {
    for (const item of order.items) {
      const skuForInventory = item.variantSku || item.productSku;
      const quantityToApply = item.quantityInBaseUnit ?? item.quantity;
      const inventory = await this.inventoryModel
        .findOne({
          productSku: skuForInventory,
          tenantId: this.buildTenantFilter(user.tenantId),
        })
        .session(session ?? null);
      if (!inventory) {
        this.logger.warn(
          `Inventory not found for SKU: ${skuForInventory} while committing order ${order.orderNumber}. Skipping.`,
        );
        continue;
      }

      inventory.reservedQuantity -= quantityToApply;
      inventory.totalQuantity -= quantityToApply;

      await inventory.save({ session });

      await this.createMovementRecord(
        {
          inventoryId: inventory._id.toString(),
          productId: inventory.productId.toString(),
          productSku: skuForInventory,
          movementType: "out",
          quantity: quantityToApply,
          unitCost: item.costPrice,
          totalCost: quantityToApply * item.costPrice,
          reason: "Venta de producto",
          reference: order.orderNumber,
          orderId: order._id.toString(),
          balanceAfter: {
            totalQuantity: inventory.totalQuantity,
            availableQuantity: inventory.availableQuantity,
            reservedQuantity: inventory.reservedQuantity,
            averageCostPrice: inventory.averageCostPrice,
          },
        },
        user,
        session,
      );

      await this.checkAndCreateAlerts(inventory, user, session);
    }
  }

  async adjustInventory(
    adjustDto: AdjustInventoryDto,
    user: any,
    session?: ClientSession,
  ) {
    const inventory = await this.inventoryModel
      .findById(adjustDto.inventoryId)
      .session(session ?? null);
    if (!inventory) throw new Error("Inventario no encontrado");
    const difference = adjustDto.newQuantity - inventory.totalQuantity;
    inventory.totalQuantity = adjustDto.newQuantity;
    inventory.availableQuantity += difference;
    if (adjustDto.newCostPrice)
      inventory.averageCostPrice = adjustDto.newCostPrice;
    // Update bin location if provided
    if (adjustDto.binLocationId) {
      inventory.binLocationId = new Types.ObjectId(adjustDto.binLocationId);
    }
    await inventory.save({ session });
    await this.createMovementRecord(
      {
        inventoryId: inventory._id.toString(),
        productId: inventory.productId.toString(),
        productSku: inventory.productSku,
        movementType: "adjustment",
        quantity: Math.abs(difference),
        unitCost: inventory.averageCostPrice,
        totalCost: Math.abs(difference) * inventory.averageCostPrice,
        reason: adjustDto.reason,
        binLocationId: adjustDto.binLocationId,
        balanceAfter: {
          totalQuantity: inventory.totalQuantity,
          availableQuantity: inventory.availableQuantity,
          reservedQuantity: inventory.reservedQuantity,
          averageCostPrice: inventory.averageCostPrice,
        },
      },
      user,
      session,
    );

    await this.checkAndCreateAlerts(inventory, user, session);

    return inventory;
  }

  async bulkAdjustInventory(bulkAdjustDto: BulkAdjustInventoryDto, user: any) {
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const results: InventoryDocument[] = [];
      for (const item of bulkAdjustDto.items) {
        const inventoryQuery: any = {
          productSku: item.SKU,
          tenantId: this.buildTenantFilter(user.tenantId),
        };

        if (item.variantSku) {
          inventoryQuery.variantSku = item.variantSku;
        }

        const inventory = await this.inventoryModel
          .findOne(inventoryQuery)
          .session(session);
        if (!inventory) {
          this.logger.warn(
            `Inventario no encontrado para SKU: ${item.SKU} durante ajuste masivo. Omitiendo.`,
          );
          continue;
        }

        inventory.availableQuantity = inventory.availableQuantity ?? 0;
        inventory.reservedQuantity = inventory.reservedQuantity ?? 0;
        inventory.committedQuantity = inventory.committedQuantity ?? 0;

        const previousTotals = {
          totalQuantity: inventory.totalQuantity ?? 0,
          availableQuantity: inventory.availableQuantity ?? 0,
          reservedQuantity: inventory.reservedQuantity ?? 0,
          committedQuantity: inventory.committedQuantity ?? 0,
        };

        const hasAttributeFilters =
          (item.attributes && Object.keys(item.attributes).length > 0) ||
          Boolean(item.variantSku);

        if (hasAttributeFilters) {
          inventory.attributeCombinations = Array.isArray(
            inventory.attributeCombinations,
          )
            ? inventory.attributeCombinations
            : [];

          const normalizedFilters = this.normalizeAttributeRecord(
            item.attributes ?? {},
          );
          if (item.variantSku) {
            normalizedFilters.variantSku = this.normalizeString(
              item.variantSku,
            );
          }

          let combination = inventory.attributeCombinations.find((combo: any) =>
            this.attributesMatch(combo?.attributes, normalizedFilters),
          );

          const previousCombinationTotals = combination
            ? {
              total: combination.totalQuantity ?? 0,
              reserved: combination.reservedQuantity ?? 0,
              committed: combination.committedQuantity ?? 0,
              available:
                combination.availableQuantity ??
                Math.max(
                  0,
                  (combination.totalQuantity ?? 0) -
                  (combination.reservedQuantity ?? 0) -
                  (combination.committedQuantity ?? 0),
                ),
            }
            : {
              total: 0,
              reserved: 0,
              committed: 0,
              available: 0,
            };

          if (!combination) {
            combination = {
              attributes: {
                ...(item.attributes || {}),
                ...(item.variantSku ? { variantSku: item.variantSku } : {}),
              },
              totalQuantity: 0,
              availableQuantity: 0,
              reservedQuantity: 0,
              committedQuantity: 0,
              averageCostPrice: inventory.averageCostPrice,
            };
            inventory.attributeCombinations.push(combination);
          } else {
            combination.attributes = {
              ...combination.attributes,
              ...(item.attributes || {}),
              ...(item.variantSku ? { variantSku: item.variantSku } : {}),
            };
          }

          combination.totalQuantity = item.NuevaCantidad;
          const reserved = combination.reservedQuantity ?? 0;
          const committed = combination.committedQuantity ?? 0;
          combination.availableQuantity = Math.max(
            0,
            item.NuevaCantidad - reserved - committed,
          );

          const combinationAvailable =
            combination.availableQuantity ??
            Math.max(0, item.NuevaCantidad - reserved - committed);

          const totalDifference =
            combination.totalQuantity - previousCombinationTotals.total;
          const availableDifference =
            combinationAvailable - previousCombinationTotals.available;
          const reservedDifference =
            reserved - previousCombinationTotals.reserved;
          const committedDifference =
            committed - previousCombinationTotals.committed;

          inventory.totalQuantity =
            previousTotals.totalQuantity + totalDifference;
          inventory.availableQuantity = Math.max(
            0,
            previousTotals.availableQuantity + availableDifference,
          );
          inventory.reservedQuantity = Math.max(
            0,
            previousTotals.reservedQuantity + reservedDifference,
          );
          inventory.committedQuantity = Math.max(
            0,
            previousTotals.committedQuantity + committedDifference,
          );
        } else {
          const difference = item.NuevaCantidad - inventory.totalQuantity;
          inventory.totalQuantity = item.NuevaCantidad;
          inventory.availableQuantity = Math.max(
            0,
            inventory.availableQuantity + difference,
          );
        }

        await inventory.save({ session });

        const totalDifference =
          inventory.totalQuantity - previousTotals.totalQuantity;
        if (totalDifference !== 0) {
          await this.createMovementRecord(
            {
              inventoryId: inventory._id.toString(),
              productId: inventory.productId.toString(),
              productSku: inventory.productSku,
              movementType: "adjustment",
              quantity: Math.abs(totalDifference),
              unitCost: inventory.averageCostPrice,
              totalCost: Math.abs(totalDifference) * inventory.averageCostPrice,
              reason: bulkAdjustDto.reason,
              balanceAfter: {
                totalQuantity: inventory.totalQuantity,
                availableQuantity: inventory.availableQuantity,
                reservedQuantity: inventory.reservedQuantity,
                averageCostPrice: inventory.averageCostPrice,
              },
            },
            user,
            session,
          );
        }

        await this.checkAndCreateAlerts(inventory, user, session);
        results.push(inventory);
      }

      await session.commitTransaction();
      return {
        success: true,
        message: `${results.length} registros de inventario ajustados exitosamente.`,
      };
    } catch (error) {
      await session.abortTransaction();
      this.logger.error(
        `Error durante el ajuste masivo de inventario: ${error.message}`,
        error.stack,
      );
      throw new Error("Error al ajustar el inventario masivamente.");
    } finally {
      session.endSession();
    }
  }

  private normalizeString(value: any): string {
    if (value === undefined || value === null) {
      return "";
    }
    return value
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  private normalizeAttributeRecord(
    attributes: Record<string, any>,
  ): Record<string, string> {
    const normalized: Record<string, string> = {};
    if (!attributes) {
      return normalized;
    }

    Object.entries(attributes).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }
      const normalizedKey = key?.toString().trim();
      const normalizedValue = this.normalizeString(value);
      if (normalizedKey && normalizedValue) {
        normalized[normalizedKey] = normalizedValue;
      }
    });

    return normalized;
  }

  private attributesMatch(
    source: Record<string, any> | undefined,
    filters: Record<string, string>,
  ): boolean {
    if (!source) {
      return false;
    }
    const normalizedSource = this.normalizeAttributeRecord(source);
    return Object.entries(filters).every(
      ([key, value]) => normalizedSource[key] === value,
    );
  }

  private calculateTotalsFromCombinations(combinations: any[]) {
    if (!Array.isArray(combinations) || combinations.length === 0) {
      return {
        total: 0,
        available: 0,
        reserved: 0,
        committed: 0,
      };
    }

    return combinations.reduce(
      (acc, combination) => {
        const total = combination?.totalQuantity ?? 0;
        const reserved = combination?.reservedQuantity ?? 0;
        const committed = combination?.committedQuantity ?? 0;
        const available =
          combination?.availableQuantity ??
          Math.max(0, total - reserved - committed);

        acc.total += total;
        acc.available += available;
        acc.reserved += reserved;
        acc.committed += committed;
        return acc;
      },
      { total: 0, available: 0, reserved: 0, committed: 0 },
    );
  }

  private async checkAndCreateAlerts(
    inventory: InventoryDocument,
    user: any,
    session?: ClientSession,
  ) {
    const product = await this.productModel
      .findById(inventory.productId)
      .session(session ?? null);
    if (!product) {
      this.logger.warn(
        `Product with ID ${inventory.productId} not found when checking alerts for inventory ${inventory._id}`,
      );
      return;
    }

    const today = new Date();
    const oneDayAgo = new Date(today.valueOf() - 24 * 60 * 60 * 1000);
    if (
      inventory.alerts.lastAlertSent &&
      inventory.alerts.lastAlertSent > oneDayAgo
    ) {
      return;
    }

    const minStock = product.inventoryConfig?.minimumStock ?? 0;
    if (minStock > 0 && inventory.availableQuantity <= minStock) {
      inventory.alerts.lowStock = true;

      // Crear evento y tarea automáticamente para stock bajo
      await this.eventsService.createFromInventoryAlert(
        {
          productName: product.name,
          alertType: "low_stock",
          currentStock: inventory.availableQuantity,
          minimumStock: minStock,
        },
        user,
      );

      inventory.alerts.lastAlertSent = today;
      this.logger.log(
        `Low stock alert and task created for product: ${product.sku}`,
      );
    } else {
      inventory.alerts.lowStock = false;
    }

    if (product.inventoryConfig?.trackExpiration && inventory.lots.length > 0) {
      const notificationDays = product.shelfLifeDays
        ? Math.floor(product.shelfLifeDays * 0.2)
        : 7;
      const alertDate = new Date(
        today.valueOf() + notificationDays * 24 * 60 * 60 * 1000,
      );
      let nearExpirationFound = false;

      for (const lot of inventory.lots) {
        if (
          lot.expirationDate &&
          lot.expirationDate <= alertDate &&
          lot.availableQuantity > 0
        ) {
          nearExpirationFound = true;

          // Crear evento y tarea automáticamente para producto por vencer
          await this.eventsService.createFromInventoryAlert(
            {
              productName: `${product.name} (Lote: ${lot.lotNumber})`,
              alertType: "expiring_soon",
              expirationDate: lot.expirationDate,
            },
            user,
          );

          inventory.alerts.lastAlertSent = today;
          this.logger.log(
            `Near expiration alert and task created for product: ${product.sku}, Lot: ${lot.lotNumber}`,
          );
          break;
        }
      }
      inventory.alerts.nearExpiration = nearExpirationFound;
    }

    await inventory.save({ session });
  }

  async getMovements(query: InventoryMovementQueryDto, tenantId: string) {
    const {
      page = 1,
      limit = 20,
      inventoryId,
      productSku,
      movementType,
      dateFrom,
      dateTo,
      orderId,
    } = query;
    const filter: any = { tenantId: this.buildTenantFilter(tenantId) };
    const inventoryObjectId = this.toObjectIdIfValid(inventoryId);
    if (inventoryObjectId) filter.inventoryId = inventoryObjectId;
    else if (inventoryId) filter.inventoryId = inventoryId;
    if (productSku) filter.productSku = productSku;
    if (movementType) filter.movementType = movementType;
    const orderObjectId = this.toObjectIdIfValid(orderId);
    if (orderObjectId) filter.orderId = orderObjectId;
    else if (orderId) filter.orderId = orderId;
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }
    const skip = (page - 1) * limit;
    const [movements, total] = await Promise.all([
      this.movementModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "firstName lastName")
        .exec(),
      this.movementModel.countDocuments(filter),
    ]);
    return {
      movements,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getLowStockAlerts(tenantId: string) {
    return this.inventoryModel.aggregate([
      {
        $match: {
          tenantId: this.buildTenantFilter(tenantId),
          isActive: { $ne: false },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "productId",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      {
        $unwind: "$productInfo",
      },
      {
        $match: {
          $expr: {
            $lte: [
              "$availableQuantity",
              "$productInfo.inventoryConfig.minimumStock",
            ],
          },
        },
      },
      {
        $project: {
          _id: 1,
          productName: 1,
          productSku: 1,
          availableQuantity: 1,
          productId: "$productInfo", // Populate productId with the full product info
        },
      },
    ]);
  }

  async getExpirationAlerts(tenantId: string, days: number = 7) {
    const alertDate = new Date();
    alertDate.setDate(alertDate.getDate() + days);
    return this.inventoryModel
      .find({
        tenantId: this.buildTenantFilter(tenantId),
        "lots.expirationDate": { $lte: alertDate },
        "lots.status": "available",
        isActive: { $ne: false },
      })
      .populate("productId", "name category")
      .exec();
  }

  async getInventorySummary(tenantId: string) {
    const [totalProducts, lowStockCount, expirationCount, totalValue] =
      await Promise.all([
        this.inventoryModel.countDocuments({
          tenantId: this.buildTenantFilter(tenantId),
          isActive: { $ne: false },
        }),
        this.inventoryModel.countDocuments({
          tenantId: this.buildTenantFilter(tenantId),
          "alerts.lowStock": true,
          isActive: { $ne: false },
        }),
        this.inventoryModel.countDocuments({
          tenantId: this.buildTenantFilter(tenantId),
          "alerts.nearExpiration": true,
          isActive: { $ne: false },
        }),
        this.inventoryModel.aggregate([
          {
            $match: {
              tenantId: this.buildTenantFilter(tenantId),
              isActive: { $ne: false },
            },
          },
          {
            $group: {
              _id: null,
              totalValue: {
                $sum: { $multiply: ["$totalQuantity", "$averageCostPrice"] },
              },
            },
          },
        ]),
      ]);
    return {
      totalProducts,
      lowStockCount,
      expirationCount,
      totalValue: totalValue[0]?.totalValue || 0,
    };
  }

  private async updateInventoryQuantities(
    inventory: InventoryDocument,
    movementDto: InventoryMovementDto,
    session?: ClientSession,
  ): Promise<InventoryDocument> {
    // ... (implementation remains the same)
    return inventory.save({ session });
  }

  async findAll(query: InventoryQueryDto, tenantId: string) {
    const {
      page = 1,
      limit = 20,
      search,
      warehouse,
      lowStock,
      nearExpiration,
      expired,
      minAvailable,
      sortBy = "lastUpdated",
      sortOrder = "desc",
      includeInactive = false,
    } = query;

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.max(Number(limit) || 20, 1);
    const searchTerm = typeof search === "string" ? search.trim() : "";
    const isSearching = searchTerm.length > 0;

    const filter: any = {
      tenantId: this.buildTenantFilter(tenantId),
    };

    if (!includeInactive) {
      filter.isActive = { $ne: false };
    }

    if (warehouse) filter["location.warehouse"] = warehouse;
    if (lowStock) filter["alerts.lowStock"] = true;
    if (nearExpiration) filter["alerts.nearExpiration"] = true;
    if (expired) filter["alerts.expired"] = true;
    if (minAvailable !== undefined) {
      filter.availableQuantity = { $gte: minAvailable };
    }
    // PERFORMANCE OPTIMIZATION: Use indexed fields for search, avoid extra DB query
    if (isSearching) {
      // Check if search looks like a SKU (alphanumeric, no spaces)
      const looksLikeSku = /^[A-Z0-9\-_]+$/i.test(searchTerm);

      if (looksLikeSku) {
        // For SKU searches, use optimized regex on indexed fields only
        const regex = new RegExp(`^${this.escapeRegExp(searchTerm)}`, "i");
        filter.$or = [{ productSku: regex }, { variantSku: regex }];
      } else {
        // For text searches, use case-insensitive regex on indexed productName
        // This avoids the expensive extra query to products collection
        const regex = new RegExp(this.escapeRegExp(searchTerm), "i");
        filter.$or = [{ productName: regex }, { productSku: regex }];
      }
    }
    const sortField = sortBy || "lastUpdated";
    const sortDirection: SortOrder = sortOrder === "asc" ? "asc" : "desc";
    const sortOptions: Record<string, SortOrder> = {
      [sortField]: sortDirection,
    };
    const skip = (pageNumber - 1) * limitNumber;
    const [inventory, total] = await Promise.all([
      this.inventoryModel
        .find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNumber)
        .populate("productId", "name category brand isPerishable variants")
        .exec(),
      this.inventoryModel.countDocuments(filter),
    ]);
    return {
      inventory,
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPages: Math.ceil(total / limitNumber),
    };
  }

  async findOne(
    id: string,
    tenantId: string,
  ): Promise<InventoryDocument | null> {
    return this.inventoryModel
      .findOne({
        _id: id,
        tenantId: this.buildTenantFilter(tenantId),
      })
      .populate("productId", "name category brand isPerishable")
      .exec();
  }

  async findByProductSku(
    productSku: string,
    tenantId: string,
  ): Promise<InventoryDocument | null> {
    return this.inventoryModel
      .findOne({
        productSku,
        tenantId: this.buildTenantFilter(tenantId),
      })
      .populate("productId", "name category brand isPerishable")
      .exec();
  }

  async findByProductId(
    productId: string,
    tenantId: string,
  ): Promise<InventoryDocument | null> {
    return this.inventoryModel
      .findOne({
        productId: new Types.ObjectId(productId),
        tenantId: this.buildTenantFilter(tenantId),
      })
      .populate("productId", "name category brand isPerishable")
      .exec();
  }

  private async createMovementRecord(
    movementData: any,
    user: any,
    session?: ClientSession,
  ): Promise<InventoryMovementDocument> {
    const movement = new this.movementModel({
      ...movementData,
      createdBy: user.id,
      tenantId: this.normalizeTenantValue(user.tenantId),
    });
    return movement.save({ session });
  }

  async addStockFromPurchase(item: any, user: any, session?: ClientSession) {
    const product = await this.productModel
      .findById(item.productId)
      .session(session ?? null);
    if (!product) {
      this.logger.warn(
        `Product with ID ${item.productId} not found. Stock not updated.`,
      );
      return;
    }

    const sku = item.variantSku || item.productSku;
    const resolvedVariantId =
      item.variantId && Types.ObjectId.isValid(item.variantId)
        ? new Types.ObjectId(item.variantId)
        : undefined;

    let inventory = await this.inventoryModel
      .findOne({
        productSku: sku,
        tenantId: this.buildTenantFilter(user.tenantId),
      })
      .session(session ?? null);

    if (!inventory) {
      this.logger.log(
        `Inventory not found for SKU: ${sku}. Creating new inventory record.`,
      );
      const inventoryData = {
        productId: item.productId,
        productSku: sku,
        productName: product.name,
        variantId: resolvedVariantId,
        variantSku: item.variantSku || sku,
        tenantId: this.normalizeTenantValue(user.tenantId),
        totalQuantity: 0,
        availableQuantity: 0,
        reservedQuantity: 0,
        committedQuantity: 0,
        averageCostPrice: 0,
        lastCostPrice: 0,
        lots: [],
        alerts: {
          lowStock: false,
          nearExpiration: false,
          expired: false,
          overstock: false,
        },
        metrics: {
          turnoverRate: 0,
          daysOnHand: 0,
          averageDailySales: 0,
          seasonalityFactor: 1,
        },
        createdBy: user.id,
      };
      inventory = new this.inventoryModel(inventoryData);
    } else {
      if (resolvedVariantId && !inventory.variantId) {
        inventory.variantId = resolvedVariantId;
      }
      if (item.variantSku && !inventory.variantSku) {
        inventory.variantSku = item.variantSku;
      }
    }

    if (product.isPerishable) {
      if (!item.lotNumber || !item.expirationDate) {
        this.logger.warn(
          `Lot number or expiration date missing for perishable product SKU: ${sku}. Stock not updated.`,
        );
        return; // Or throw a BadRequestException
      }
      const newLot = {
        lotNumber: item.lotNumber,
        quantity: item.quantity,
        availableQuantity: item.quantity,
        reservedQuantity: 0,
        costPrice: item.costPrice,
        receivedDate: new Date(),
        expirationDate: new Date(item.expirationDate),
        supplierId: item.supplierId,
        createdBy: user.id,
        status: "available",
      };
      inventory.lots.push(newLot);
    }

    const oldTotalQuantity = inventory.totalQuantity;
    inventory.totalQuantity += item.quantity;
    inventory.availableQuantity += item.quantity;

    const oldTotalValue = oldTotalQuantity * inventory.averageCostPrice;
    const newItemsValue = item.quantity * item.costPrice;
    const newTotalValue = oldTotalValue + newItemsValue;

    inventory.averageCostPrice =
      inventory.totalQuantity > 0
        ? newTotalValue / inventory.totalQuantity
        : item.costPrice;
    inventory.lastCostPrice = item.costPrice;

    await inventory.save({ session });

    await this.createMovementRecord(
      {
        inventoryId: inventory._id.toString(),
        productId: inventory.productId.toString(),
        productSku: sku,
        lotNumber: item.lotNumber,
        movementType: "in",
        quantity: item.quantity,
        unitCost: item.costPrice,
        totalCost: item.quantity * item.costPrice,
        reason: "Compra a proveedor",
        reference: item.purchaseOrderId.toString(),
        supplierId: item.supplierId,
        balanceAfter: {
          totalQuantity: inventory.totalQuantity,
          availableQuantity: inventory.availableQuantity,
          reservedQuantity: inventory.reservedQuantity,
          averageCostPrice: inventory.averageCostPrice,
        },
      },
      user,
      session,
    );
  }

  private buildTenantFilter(tenantId: string | Types.ObjectId) {
    if (tenantId instanceof Types.ObjectId) {
      return { $in: [tenantId.toString(), tenantId] };
    }
    if (Types.ObjectId.isValid(tenantId)) {
      const objectId = new Types.ObjectId(tenantId);
      return { $in: [tenantId, objectId] };
    }
    return tenantId;
  }

  private normalizeTenantValue(tenantId: string | Types.ObjectId) {
    const objectId = this.toObjectIdIfValid(tenantId);
    return objectId ?? tenantId;
  }

  private toObjectIdIfValid(id?: string | Types.ObjectId) {
    if (!id) return undefined;
    if (id instanceof Types.ObjectId) return id;
    return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : undefined;
  }

  async updateLots(
    inventoryId: string,
    updateLotsDto: UpdateInventoryLotsDto,
    user: any,
  ): Promise<InventoryDocument> {
    const inventory = await this.inventoryModel.findOne({
      _id: new Types.ObjectId(inventoryId),
      tenantId: this.buildTenantFilter(user.tenantId),
      isActive: true,
    });

    if (!inventory) {
      throw new Error("Inventario no encontrado");
    }

    // Update lots with the new data
    inventory.lots = updateLotsDto.lots.map((lotDto) => ({
      lotNumber: lotDto.lotNumber,
      quantity: lotDto.quantity,
      availableQuantity: lotDto.quantity, // Preserve available based on quantity
      reservedQuantity: 0,
      costPrice: lotDto.costPrice,
      receivedDate: lotDto.receivedDate,
      expirationDate: lotDto.expirationDate,
      manufacturingDate: lotDto.manufacturingDate,
      supplierId: lotDto.supplierId
        ? new Types.ObjectId(lotDto.supplierId)
        : undefined,
      supplierInvoice: lotDto.supplierInvoice,
      status: lotDto.status || "available",
      createdBy: user.id,
    })) as any;

    // Recalculate totals from lots
    inventory.totalQuantity = inventory.lots.reduce(
      (sum, lot) => sum + lot.quantity,
      0,
    );
    inventory.availableQuantity = inventory.lots.reduce(
      (sum, lot) => sum + (lot.availableQuantity || lot.quantity),
      0,
    );

    // Recalculate average cost price
    const totalValue = inventory.lots.reduce(
      (sum, lot) => sum + lot.quantity * lot.costPrice,
      0,
    );
    inventory.averageCostPrice =
      inventory.totalQuantity > 0 ? totalValue / inventory.totalQuantity : 0;

    inventory.updatedBy = user.id;

    await inventory.save();

    this.logger.log(
      `Lotes actualizados para inventario ${inventoryId} por usuario ${user.id}`,
    );

    return inventory;
  }

  async getStockByProduct(
    tenantId: string,
    productIds?: string[],
  ): Promise<
    Array<{
      productId: Types.ObjectId;
      productSku: string;
      productName: string;
      totalAvailable: number;
      totalQuantity: number;
      warehouses: {
        warehouseId: Types.ObjectId | null;
        warehouseCode?: string;
        warehouseName?: string;
        available: number;
        total: number;
      }[];
    }>
  > {
    const match: any = {
      tenantId: this.buildTenantFilter(tenantId),
    };

    if (productIds && productIds.length > 0) {
      const ids = productIds
        .map((id) => this.toObjectIdIfValid(id) || id)
        .filter(Boolean);
      match.productId = { $in: ids };
    }

    const result = await this.inventoryModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: { productId: "$productId", warehouseId: "$warehouseId" },
          productSku: { $first: "$productSku" },
          productName: { $first: "$productName" },
          available: { $sum: "$availableQuantity" },
          total: { $sum: "$totalQuantity" },
        },
      },
      {
        $lookup: {
          from: "warehouses",
          localField: "_id.warehouseId",
          foreignField: "_id",
          as: "warehouse",
        },
      },
      {
        $unwind: {
          path: "$warehouse",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$_id.productId",
          productSku: { $first: "$productSku" },
          productName: { $first: "$productName" },
          warehouses: {
            $push: {
              warehouseId: "$_id.warehouseId",
              warehouseCode: "$warehouse.code",
              warehouseName: "$warehouse.name",
              available: "$available",
              total: "$total",
            },
          },
          totalAvailable: { $sum: "$available" },
          totalQuantity: { $sum: "$total" },
        },
      },
      { $sort: { productName: 1 } },
    ]);

    return result;
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  async deductStockBySku(
    sku: string,
    quantity: number,
    tenantId: string,
    user: any,
    reason: string = "Production Usage",
    reference: string = "",
    session?: ClientSession,
  ): Promise<void> {
    const inventoryQuery: any = {
      tenantId: this.buildTenantFilter(tenantId),
      isActive: true,
    };

    // Generic SKU lookup (matches reserveInventory logic)
    if (sku.includes("-VAR")) {
      inventoryQuery.variantSku = sku;
    } else {
      inventoryQuery.productSku = sku;
    }

    let inventory = await this.inventoryModel
      .findOne(inventoryQuery)
      .session(session ?? null);

    // Fallback lookup if not found
    if (!inventory) {
      const altQuery: any = {
        tenantId: this.buildTenantFilter(tenantId),
        isActive: true,
      };
      if (sku.includes("-VAR")) {
        altQuery.productSku = sku;
      } else {
        altQuery.variantSku = sku;
      }
      inventory = await this.inventoryModel
        .findOne(altQuery)
        .session(session ?? null);
    }

    if (!inventory) {
      this.logger.warn(`Inventory not found for SKU: ${sku} during deduction. Skipping.`);
      return;
    }

    // Deduct stock (allow negative for backflushing if necessary, or enforce check?)
    // For restaurant speed, we often allow negative, but let's just reduce.
    inventory.availableQuantity -= quantity;
    inventory.totalQuantity -= quantity;

    await inventory.save({ session });

    await this.createMovementRecord(
      {
        inventoryId: inventory._id.toString(),
        productId: inventory.productId.toString(),
        productSku: sku,
        movementType: "out", // or specific 'production' type if enum allows
        quantity: quantity,
        unitCost: inventory.averageCostPrice,
        totalCost: quantity * inventory.averageCostPrice,
        reason: reason,
        reference: reference,
        balanceAfter: {
          totalQuantity: inventory.totalQuantity,
          availableQuantity: inventory.availableQuantity,
          reservedQuantity: inventory.reservedQuantity,
          averageCostPrice: inventory.averageCostPrice,
        },
      },
      user,
      session,
    );
  }
}
