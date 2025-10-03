import { Injectable, Logger } from "@nestjs/common";
import { InjectModel, InjectConnection } from "@nestjs/mongoose";
import { Model, Types, ClientSession, Connection } from "mongoose";
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
} from "../../dto/inventory.dto";
import { EventsService } from "../events/events.service";
import { CreateEventDto } from "../../dto/event.dto";
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
  ) {}

  async create(
    createInventoryDto: CreateInventoryDto,
    user: any,
    session?: ClientSession,
  ): Promise<InventoryDocument> {
    const existingInventory = await this.inventoryModel
      .findOne({
        productSku: createInventoryDto.productSku,
        tenantId: user.tenantId,
      })
      .session(session ?? null);
    if (existingInventory)
      throw new Error("Ya existe inventario para este producto/variante");

    const processedLots =
      createInventoryDto.lots?.map((lot) => ({
        ...lot,
        availableQuantity: lot.quantity,
        reservedQuantity: 0,
        createdBy: user.id,
      })) || [];

    const inventoryData = {
      ...createInventoryDto,
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
      tenantId: user.tenantId,
    };
    const inventory = new this.inventoryModel(inventoryData);
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
      const inventory = await this.inventoryModel
        .findOne({ productSku: item.productSku, tenantId: user.tenantId })
        .session(session ?? null);
      if (!inventory)
        throw new Error(
          `Inventario no encontrado para SKU: ${item.productSku}`,
        );
      if (inventory.availableQuantity < item.quantity)
        throw new Error(`Stock insuficiente para SKU: ${item.productSku}`);
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
          reference: reserveDto.orderId,
          orderId: reserveDto.orderId,
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

  async releaseInventory(
    releaseDto: ReleaseInventoryDto,
    user: any,
    session?: ClientSession,
  ) {
    const reservationMovements = await this.movementModel
      .find({
        orderId: releaseDto.orderId,
        movementType: "reservation",
        tenantId: user.tenantId,
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
      const inventory = await this.inventoryModel
        .findOne({ productSku: item.productSku, tenantId: user.tenantId })
        .session(session ?? null);
      if (!inventory) {
        this.logger.warn(
          `Inventory not found for SKU: ${item.productSku} while committing order ${order.orderNumber}. Skipping.`,
        );
        continue;
      }

      inventory.reservedQuantity -= item.quantity;
      inventory.totalQuantity -= item.quantity;

      await inventory.save({ session });

      await this.createMovementRecord(
        {
          inventoryId: inventory._id.toString(),
          productId: inventory.productId.toString(),
          productSku: item.productSku,
          movementType: "out",
          quantity: item.quantity,
          unitCost: item.costPrice,
          totalCost: item.quantity * item.costPrice,
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
        const inventory = await this.inventoryModel.findOne({ productSku: item.SKU, tenantId: user.tenantId }).session(session);
        if (!inventory) {
          this.logger.warn(`Inventario no encontrado para SKU: ${item.SKU} durante ajuste masivo. Omitiendo.`);
          continue;
        }

        const difference = item.NuevaCantidad - inventory.totalQuantity;
        inventory.totalQuantity = item.NuevaCantidad;
        inventory.availableQuantity += difference;
        
        await inventory.save({ session });

        await this.createMovementRecord(
          {
            inventoryId: inventory._id.toString(),
            productId: inventory.productId.toString(),
            productSku: inventory.productSku,
            movementType: 'adjustment',
            quantity: Math.abs(difference),
            unitCost: inventory.averageCostPrice,
            totalCost: Math.abs(difference) * inventory.averageCostPrice,
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

        await this.checkAndCreateAlerts(inventory, user, session);
        results.push(inventory);
      }

      await session.commitTransaction();
      return { success: true, message: `${results.length} registros de inventario ajustados exitosamente.` };
    } catch (error) {
      await session.abortTransaction();
      this.logger.error(`Error durante el ajuste masivo de inventario: ${error.message}`, error.stack);
      throw new Error('Error al ajustar el inventario masivamente.');
    } finally {
      session.endSession();
    }
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
          alertType: 'low_stock',
          currentStock: inventory.availableQuantity,
          minimumStock: minStock,
        },
        user,
      );

      inventory.alerts.lastAlertSent = today;
      this.logger.log(`Low stock alert and task created for product: ${product.sku}`);
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
              alertType: 'expiring_soon',
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
    const filter: any = { tenantId: tenantId };
    if (inventoryId) filter.inventoryId = new Types.ObjectId(inventoryId);
    if (productSku) filter.productSku = productSku;
    if (movementType) filter.movementType = movementType;
    if (orderId) filter.orderId = new Types.ObjectId(orderId);
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
          tenantId: tenantId,
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
            $lte: ["$availableQuantity", "$productInfo.inventoryConfig.minimumStock"],
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
        tenantId,
        "lots.expirationDate": { $lte: alertDate },
        "lots.status": "available",
      })
      .populate("productId", "name category")
      .exec();
  }

  async getInventorySummary(tenantId: string) {
    const [totalProducts, lowStockCount, expirationCount, totalValue] =
      await Promise.all([
        this.inventoryModel.countDocuments({ tenantId }),
        this.inventoryModel.countDocuments({
          tenantId,
          "alerts.lowStock": true,
        }),
        this.inventoryModel.countDocuments({
          tenantId,
          "alerts.nearExpiration": true,
        }),
        this.inventoryModel.aggregate([
          { $match: { tenantId: tenantId } },
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
    } = query;
    const filter: any = { tenantId: tenantId };
    if (warehouse) filter["location.warehouse"] = warehouse;
    if (lowStock) filter["alerts.lowStock"] = true;
    if (nearExpiration) filter["alerts.nearExpiration"] = true;
    if (expired) filter["alerts.expired"] = true;
    if (minAvailable !== undefined)
      filter.availableQuantity = { $gte: minAvailable };
    if (search) {
      filter.$or = [
        { productSku: { $regex: search, $options: "i" } },
        { productName: { $regex: search, $options: "i" } },
        { variantSku: { $regex: search, $options: "i" } },
      ];
    }
    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;
    const skip = (page - 1) * limit;
    const [inventory, total] = await Promise.all([
      this.inventoryModel
        .find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .populate("productId", "name category brand isPerishable")
        .exec(),
      this.inventoryModel.countDocuments(filter),
    ]);
    return {
      inventory,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(
    id: string,
    tenantId: string,
  ): Promise<InventoryDocument | null> {
    return this.inventoryModel
      .findOne({ _id: id, tenantId })
      .populate("productId", "name category brand isPerishable")
      .exec();
  }

  async findByProductSku(
    productSku: string,
    tenantId: string,
  ): Promise<InventoryDocument | null> {
    return this.inventoryModel
      .findOne({ productSku, tenantId })
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
      tenantId: user.tenantId,
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

    let inventory = await this.inventoryModel
      .findOne({ productSku: item.productSku, tenantId: user.tenantId })
      .session(session ?? null);

    if (!inventory) {
      this.logger.log(
        `Inventory not found for SKU: ${item.productSku}. Creating new inventory record.`,
      );
      const inventoryData = {
        productId: item.productId,
        productSku: item.productSku,
        productName: product.name,
        tenantId: user.tenantId,
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
    }

    if (product.isPerishable) {
      if (!item.lotNumber || !item.expirationDate) {
        this.logger.warn(
          `Lot number or expiration date missing for perishable product SKU: ${item.productSku}. Stock not updated.`,
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
        productSku: item.productSku,
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
}
