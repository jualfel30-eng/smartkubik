import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { Inventory, InventoryDocument, InventoryMovement, InventoryMovementDocument } from "../../schemas/inventory.schema";
import { Warehouse, WarehouseDocument } from "../../schemas/warehouse.schema";
import { Product, ProductDocument } from "../../schemas/product.schema";
import { CreateInventoryMovementDto, CreateTransferDto, InventoryMovementFilterDto, MovementType } from "../../dto/inventory-movement.dto";
import { InventoryAlertsService } from "./inventory-alerts.service";

@Injectable()
export class InventoryMovementsService {
  constructor(
    @InjectModel(Inventory.name)
    private readonly inventoryModel: Model<InventoryDocument>,
    @InjectModel(InventoryMovement.name)
    private readonly movementModel: Model<InventoryMovementDocument>,
    @InjectModel(Warehouse.name)
    private readonly warehouseModel: Model<WarehouseDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    private readonly inventoryAlertsService: InventoryAlertsService,
  ) {}

  async create(
    dto: CreateInventoryMovementDto,
    tenantId: string,
    userId: string,
    enforceStock = true,
    options?: { orderId?: string; origin?: string },
  ): Promise<InventoryMovementDocument> {
    const inventory = await this.inventoryModel.findOne({
      _id: dto.inventoryId,
      tenantId: new Types.ObjectId(tenantId),
    });
    if (!inventory) {
      throw new NotFoundException("Inventario no encontrado");
    }

    if (inventory.isActive === false) {
      throw new BadRequestException("El inventario está inactivo.");
    }

    // Validar que el producto esté activo
    const product = await this.productModel.findOne({
      _id: inventory.productId,
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: { $ne: true },
    });
    if (!product) {
      throw new BadRequestException("Producto no encontrado o inactivo.");
    }
    if (product.isActive === false) {
      throw new BadRequestException("Producto inactivo.");
    }

    // Validar warehouse si se envía uno explícito
    if (dto.warehouseId) {
      const warehouse = await this.warehouseModel.findOne({
        _id: new Types.ObjectId(dto.warehouseId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: { $ne: true },
      });
      if (!warehouse) {
        throw new BadRequestException("Warehouse no encontrado o inactivo.");
      }
      if (warehouse.isActive === false) {
        throw new BadRequestException("Warehouse inactivo.");
      }
    }

    const qtyChange =
      dto.movementType === MovementType.OUT
        ? -dto.quantity
        : dto.quantity;

    const previousAvailable = inventory.availableQuantity ?? 0;
    const newAvailable = previousAvailable + qtyChange;
    const newTotal = (inventory.totalQuantity ?? 0) + qtyChange;

    if (enforceStock && dto.movementType !== MovementType.IN && newAvailable < 0) {
      throw new BadRequestException("Stock insuficiente para registrar salida.");
    }

    inventory.availableQuantity = newAvailable;
    inventory.totalQuantity = newTotal;
    inventory.warehouseId =
      dto.warehouseId && Types.ObjectId.isValid(dto.warehouseId)
        ? new Types.ObjectId(dto.warehouseId)
        : inventory.warehouseId;
    await inventory.save();

    // Update inventory bin location if provided
    if (dto.binLocationId && Types.ObjectId.isValid(dto.binLocationId)) {
      inventory.binLocationId = new Types.ObjectId(dto.binLocationId);
      await inventory.save();
    }

    const movement = new this.movementModel({
      inventoryId: inventory._id,
      productId: inventory.productId,
      productSku: inventory.productSku,
      warehouseId: inventory.warehouseId,
      binLocationId: dto.binLocationId ? new Types.ObjectId(dto.binLocationId) : undefined,
      movementType: dto.movementType,
      quantity: dto.quantity,
      unitCost: dto.unitCost,
      totalCost: dto.quantity * dto.unitCost,
      reference: dto.reference,
      orderId:
        options?.orderId && Types.ObjectId.isValid(options.orderId)
          ? new Types.ObjectId(options.orderId)
          : undefined,
      reason: dto.reason || options?.origin,
      balanceAfter: {
        totalQuantity: inventory.totalQuantity,
        availableQuantity: inventory.availableQuantity,
        reservedQuantity: inventory.reservedQuantity,
        averageCostPrice: inventory.averageCostPrice,
      },
      createdBy: new Types.ObjectId(userId),
      tenantId: new Types.ObjectId(tenantId),
    });

    const savedMovement = await movement.save();

    // Evaluar alertas de stock bajo post-movimiento
    try {
      await this.inventoryAlertsService.evaluateForInventory(inventory, {
        id: userId,
        tenantId,
      });
    } catch (err) {
      // Logueamos pero no bloqueamos el flujo de movimientos
      // eslint-disable-next-line no-console
      console.warn(`No se pudo evaluar alertas para inventario ${inventory._id}: ${err.message}`);
    }

    return savedMovement;
  }

  async hasOutMovementsForOrder(orderId: string, tenantId: string): Promise<boolean> {
    if (!orderId) return false;
    const count = await this.movementModel.countDocuments({
      orderId: new Types.ObjectId(orderId),
      tenantId: new Types.ObjectId(tenantId),
      movementType: MovementType.OUT,
    });
    return count > 0;
  }

  async findAll(
    tenantId: string,
    filters: InventoryMovementFilterDto,
  ): Promise<{ data: InventoryMovementDocument[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const query: any = { tenantId: new Types.ObjectId(tenantId) };
    if (filters.movementType) query.movementType = filters.movementType;
    if (filters.productId) query.productId = new Types.ObjectId(filters.productId);
    if (filters.warehouseId) query.warehouseId = new Types.ObjectId(filters.warehouseId);

    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) query.createdAt.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) query.createdAt.$lte = new Date(filters.dateTo);
    }

    const limit = Math.min(filters.limit || 50, 200);
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.movementModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.movementModel.countDocuments(query),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));
    return { data, pagination: { page, limit, total, totalPages } };
  }

  /**
   * Creates a warehouse-to-warehouse transfer.
   * This creates two linked movements: OUT from source and IN to destination.
   */
  async createTransfer(
    dto: CreateTransferDto,
    tenantId: string,
    userId: string,
  ): Promise<{ transferId: string; outMovement: InventoryMovementDocument; inMovement: InventoryMovementDocument }> {
    const tenantOid = new Types.ObjectId(tenantId);
    const userOid = new Types.ObjectId(userId);
    const productOid = new Types.ObjectId(dto.productId);
    const sourceWarehouseOid = new Types.ObjectId(dto.sourceWarehouseId);
    const destWarehouseOid = new Types.ObjectId(dto.destinationWarehouseId);

    // Validate source and destination are different
    if (dto.sourceWarehouseId === dto.destinationWarehouseId) {
      throw new BadRequestException("El almacén origen y destino no pueden ser el mismo.");
    }

    // Validate source warehouse exists and is active
    const sourceWarehouse = await this.warehouseModel.findOne({
      _id: sourceWarehouseOid,
      tenantId: tenantOid,
      isDeleted: { $ne: true },
    });
    if (!sourceWarehouse) {
      throw new NotFoundException("Almacén origen no encontrado.");
    }
    if (sourceWarehouse.isActive === false) {
      throw new BadRequestException("Almacén origen está inactivo.");
    }

    // Validate destination warehouse exists and is active
    const destWarehouse = await this.warehouseModel.findOne({
      _id: destWarehouseOid,
      tenantId: tenantOid,
      isDeleted: { $ne: true },
    });
    if (!destWarehouse) {
      throw new NotFoundException("Almacén destino no encontrado.");
    }
    if (destWarehouse.isActive === false) {
      throw new BadRequestException("Almacén destino está inactivo.");
    }

    // Find source inventory (product in source warehouse)
    const sourceInventory = await this.inventoryModel.findOne({
      productId: productOid,
      warehouseId: sourceWarehouseOid,
      tenantId: tenantOid,
    });
    if (!sourceInventory) {
      throw new NotFoundException("No existe inventario del producto en el almacén origen.");
    }
    if (sourceInventory.isActive === false) {
      throw new BadRequestException("El inventario en almacén origen está inactivo.");
    }

    // Validate sufficient stock
    const availableStock = sourceInventory.availableQuantity ?? 0;
    if (availableStock < dto.quantity) {
      throw new BadRequestException(
        `Stock insuficiente. Disponible: ${availableStock}, Solicitado: ${dto.quantity}`,
      );
    }

    // Find or create destination inventory
    let destInventory = await this.inventoryModel.findOne({
      productId: productOid,
      warehouseId: destWarehouseOid,
      tenantId: tenantOid,
    });

    if (!destInventory) {
      // Create new inventory record for destination warehouse
      destInventory = new this.inventoryModel({
        productId: productOid,
        warehouseId: destWarehouseOid,
        productSku: sourceInventory.productSku,
        productName: sourceInventory.productName,
        variantId: sourceInventory.variantId,
        variantSku: sourceInventory.variantSku,
        totalQuantity: 0,
        availableQuantity: 0,
        reservedQuantity: 0,
        committedQuantity: 0,
        averageCostPrice: sourceInventory.averageCostPrice,
        lastCostPrice: sourceInventory.lastCostPrice,
        lots: [],
        attributes: sourceInventory.attributes,
        location: {
          warehouse: destWarehouse.name,
          zone: "",
          aisle: "",
          shelf: "",
          bin: "",
        },
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
        isActive: true,
        createdBy: userOid,
        tenantId: tenantOid,
      });
      await destInventory.save();
    }

    // Generate transfer ID to link movements
    const transferId = uuidv4();
    const unitCost = sourceInventory.averageCostPrice ?? 0;
    const reason = dto.reason || `Transferencia de ${sourceWarehouse.name} a ${destWarehouse.name}`;

    // Update source inventory (decrease stock)
    sourceInventory.availableQuantity = (sourceInventory.availableQuantity ?? 0) - dto.quantity;
    sourceInventory.totalQuantity = (sourceInventory.totalQuantity ?? 0) - dto.quantity;
    await sourceInventory.save();

    // Update destination inventory (increase stock)
    destInventory.availableQuantity = (destInventory.availableQuantity ?? 0) + dto.quantity;
    destInventory.totalQuantity = (destInventory.totalQuantity ?? 0) + dto.quantity;
    await destInventory.save();

    // Prepare bin location ObjectIds if provided
    const sourceBinOid = dto.sourceBinLocationId ? new Types.ObjectId(dto.sourceBinLocationId) : undefined;
    const destBinOid = dto.destinationBinLocationId ? new Types.ObjectId(dto.destinationBinLocationId) : undefined;

    // Update destination inventory bin location if provided
    if (destBinOid) {
      destInventory.binLocationId = destBinOid;
      await destInventory.save();
    }

    // Create OUT movement from source
    const outMovement = new this.movementModel({
      inventoryId: sourceInventory._id,
      productId: productOid,
      productSku: sourceInventory.productSku,
      warehouseId: sourceWarehouseOid,
      binLocationId: sourceBinOid,
      movementType: MovementType.TRANSFER,
      quantity: dto.quantity,
      unitCost,
      totalCost: dto.quantity * unitCost,
      reason,
      reference: dto.reference,
      transferId,
      sourceWarehouseId: sourceWarehouseOid,
      destinationWarehouseId: destWarehouseOid,
      sourceBinLocationId: sourceBinOid,
      destinationBinLocationId: destBinOid,
      balanceAfter: {
        totalQuantity: sourceInventory.totalQuantity,
        availableQuantity: sourceInventory.availableQuantity,
        reservedQuantity: sourceInventory.reservedQuantity,
        averageCostPrice: sourceInventory.averageCostPrice,
      },
      createdBy: userOid,
      tenantId: tenantOid,
    });

    // Create IN movement to destination
    const inMovement = new this.movementModel({
      inventoryId: destInventory._id,
      productId: productOid,
      productSku: destInventory.productSku,
      warehouseId: destWarehouseOid,
      binLocationId: destBinOid,
      movementType: MovementType.TRANSFER,
      quantity: dto.quantity,
      unitCost,
      totalCost: dto.quantity * unitCost,
      reason,
      reference: dto.reference,
      transferId,
      sourceWarehouseId: sourceWarehouseOid,
      destinationWarehouseId: destWarehouseOid,
      sourceBinLocationId: sourceBinOid,
      destinationBinLocationId: destBinOid,
      balanceAfter: {
        totalQuantity: destInventory.totalQuantity,
        availableQuantity: destInventory.availableQuantity,
        reservedQuantity: destInventory.reservedQuantity,
        averageCostPrice: destInventory.averageCostPrice,
      },
      createdBy: userOid,
      tenantId: tenantOid,
    });

    // Save both movements and link them
    const savedOutMovement = await outMovement.save();
    const savedInMovement = await inMovement.save();

    // Link the movements to each other
    savedOutMovement.linkedMovementId = savedInMovement._id;
    savedInMovement.linkedMovementId = savedOutMovement._id;
    await Promise.all([savedOutMovement.save(), savedInMovement.save()]);

    // Evaluate alerts for both inventories
    try {
      await Promise.all([
        this.inventoryAlertsService.evaluateForInventory(sourceInventory, { id: userId, tenantId }),
        this.inventoryAlertsService.evaluateForInventory(destInventory, { id: userId, tenantId }),
      ]);
    } catch (err) {
      console.warn(`No se pudo evaluar alertas post-transferencia: ${err.message}`);
    }

    return {
      transferId,
      outMovement: savedOutMovement,
      inMovement: savedInMovement,
    };
  }
}
