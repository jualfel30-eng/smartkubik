import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Inventory, InventoryDocument, InventoryMovement, InventoryMovementDocument } from "../../schemas/inventory.schema";
import { Warehouse, WarehouseDocument } from "../../schemas/warehouse.schema";
import { Product, ProductDocument } from "../../schemas/product.schema";
import { CreateInventoryMovementDto, InventoryMovementFilterDto, MovementType } from "../../dto/inventory-movement.dto";
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

    const movement = new this.movementModel({
      inventoryId: inventory._id,
      productId: inventory.productId,
      productSku: inventory.productSku,
      warehouseId: inventory.warehouseId,
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
}
