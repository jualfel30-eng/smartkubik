import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, ClientSession } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Inventory, InventoryDocument } from '../../schemas/inventory.schema';
import { InventoryMovement, InventoryMovementDocument } from '../../schemas/inventory.schema';
import {
  CreateInventoryDto,
  InventoryMovementDto,
  ReserveInventoryDto,
  ReleaseInventoryDto,
  AdjustInventoryDto,
  InventoryQueryDto,
  InventoryMovementQueryDto,
} from '../../dto/inventory.dto';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectModel(Inventory.name) private inventoryModel: Model<InventoryDocument>,
    @InjectModel(InventoryMovement.name) private movementModel: Model<InventoryMovementDocument>,
    @InjectConnection() private connection: Connection,
  ) {}

  async create(createInventoryDto: CreateInventoryDto, user: any): Promise<InventoryDocument> {
    this.logger.log(`Creating inventory for product: ${createInventoryDto.productSku}`);

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      // Verificar que no exista inventario para este producto
      const existingInventory = await this.inventoryModel.findOne({
        productSku: createInventoryDto.productSku,
        variantSku: createInventoryDto.variantSku,
        tenantId: user.tenantId,
      }).session(session);

      if (existingInventory) {
        throw new Error('Ya existe inventario para este producto/variante');
      }

      const inventoryData = {
        ...createInventoryDto,
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

      // Registrar movimiento inicial si hay cantidad
      if (createInventoryDto.totalQuantity > 0) {
        await this.createMovementRecord({
          inventoryId: savedInventory._id.toString(),
          productId: createInventoryDto.productId,
          productSku: createInventoryDto.productSku,
          movementType: 'in',
          quantity: createInventoryDto.totalQuantity,
          unitCost: createInventoryDto.averageCostPrice,
          totalCost: createInventoryDto.totalQuantity * createInventoryDto.averageCostPrice,
          reason: 'Inventario inicial',
          balanceAfter: {
            totalQuantity: savedInventory.totalQuantity,
            availableQuantity: savedInventory.availableQuantity,
            reservedQuantity: savedInventory.reservedQuantity,
            averageCostPrice: savedInventory.averageCostPrice,
          },
        }, user, session);
      }

      await session.commitTransaction();
      this.logger.log(`Inventory created successfully with ID: ${savedInventory._id}`);
      return savedInventory;

    } catch (error) {
      await session.abortTransaction();
      this.logger.error(`Error creating inventory: ${error.message}`);
      throw error;
    } finally {
      session.endSession();
    }
  }

  async findAll(query: InventoryQueryDto, tenantId: string) {
    this.logger.log(`Finding inventory for tenant: ${tenantId}`);

    const {
      page = 1,
      limit = 20,
      search,
      warehouse,
      lowStock,
      nearExpiration,
      expired,
      minAvailable,
      sortBy = 'lastUpdated',
      sortOrder = 'desc',
    } = query;

    const filter: any = { tenantId: new Types.ObjectId(tenantId) };

    // Filtros específicos
    if (warehouse) {
      filter['location.warehouse'] = warehouse;
    }

    if (lowStock) {
      filter['alerts.lowStock'] = true;
    }

    if (nearExpiration) {
      filter['alerts.nearExpiration'] = true;
    }

    if (expired) {
      filter['alerts.expired'] = true;
    }

    if (minAvailable !== undefined) {
      filter.availableQuantity = { $gte: minAvailable };
    }

    // Búsqueda de texto
    if (search) {
      filter.$or = [
        { productSku: { $regex: search, $options: 'i' } },
        { productName: { $regex: search, $options: 'i' } },
        { variantSku: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const skip = (page - 1) * limit;

    const [inventory, total] = await Promise.all([
      this.inventoryModel
        .find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .populate('productId', 'name category brand')
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

  async findOne(id: string, tenantId: string): Promise<InventoryDocument | null> {
    return this.inventoryModel
      .findOne({ _id: id, tenantId })
      .populate('productId', 'name category brand isPerishable')
      .exec();
  }

  async findByProductSku(productSku: string, tenantId: string): Promise<InventoryDocument | null> {
    return this.inventoryModel
      .findOne({ productSku, tenantId })
      .populate('productId', 'name category brand isPerishable')
      .exec();
  }

  async createMovement(movementDto: InventoryMovementDto, user: any) {
    this.logger.log(`Creating movement for inventory: ${movementDto.inventoryId}`);

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const inventory = await this.inventoryModel
        .findOne({ _id: movementDto.inventoryId, tenantId: user.tenantId })
        .session(session);

      if (!inventory) {
        throw new Error('Inventario no encontrado');
      }

      // Validar movimiento
      if (movementDto.movementType === 'out' || movementDto.movementType === 'reservation') {
        if (inventory.availableQuantity < movementDto.quantity) {
          throw new Error('Cantidad insuficiente en inventario');
        }
      }

      // Actualizar inventario según tipo de movimiento
      const updatedInventory = await this.updateInventoryQuantities(
        inventory,
        movementDto,
        session,
      );

      // Registrar movimiento
      const movement = await this.createMovementRecord({
        ...movementDto,
        productId: inventory.productId.toString(),
        totalCost: movementDto.quantity * movementDto.unitCost,
        balanceAfter: {
          totalQuantity: updatedInventory.totalQuantity,
          availableQuantity: updatedInventory.availableQuantity,
          reservedQuantity: updatedInventory.reservedQuantity,
          averageCostPrice: updatedInventory.averageCostPrice,
        },
      }, user, session);

      await session.commitTransaction();
      return movement;

    } catch (error) {
      await session.abortTransaction();
      this.logger.error(`Error creating movement: ${error.message}`);
      throw error;
    } finally {
      session.endSession();
    }
  }

  async reserveInventory(reserveDto: ReserveInventoryDto, user: any) {
    this.logger.log(`Reserving inventory for order: ${reserveDto.orderId}`);

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const reservations: any[] = [];

      for (const item of reserveDto.items) {
        const inventory = await this.inventoryModel
          .findOne({
            productSku: item.productSku,
            variantSku: item.variantSku,
            tenantId: user.tenantId,
          })
          .session(session);

        if (!inventory) {
          throw new Error(`Inventario no encontrado para SKU: ${item.productSku}`);
        }

        if (inventory.availableQuantity < item.quantity) {
          throw new Error(`Cantidad insuficiente para SKU: ${item.productSku}. Disponible: ${inventory.availableQuantity}, Solicitado: ${item.quantity}`);
        }

        // Aplicar FEFO si está habilitado
        let lotsToReserve: any[] = [];
        if (item.useFefo && inventory.lots.length > 0) {
          lotsToReserve = this.applyFefoLogic(inventory.lots, item.quantity);
        }

        // Actualizar cantidades
        inventory.availableQuantity -= item.quantity;
        inventory.reservedQuantity += item.quantity;

        // Actualizar lotes si aplica FEFO
        if (lotsToReserve.length > 0) {
          for (const lotReservation of lotsToReserve) {
            const lot = inventory.lots.find(l => l.lotNumber === lotReservation.lotNumber);
            if (lot) {
              lot.availableQuantity -= lotReservation.quantity;
              lot.reservedQuantity += lotReservation.quantity;
            }
          }
        }

        await inventory.save({ session });

        // Registrar movimiento de reserva
        await this.createMovementRecord({
          inventoryId: inventory._id.toString(),
          productId: inventory.productId.toString(),
          productSku: item.productSku,
          movementType: 'reservation',
          quantity: item.quantity,
          unitCost: inventory.averageCostPrice,
          totalCost: item.quantity * inventory.averageCostPrice,
          reason: 'Reserva para orden',
          reference: reserveDto.orderId,
          orderId: reserveDto.orderId,
          balanceAfter: {
            totalQuantity: inventory.totalQuantity,
            availableQuantity: inventory.availableQuantity,
            reservedQuantity: inventory.reservedQuantity,
            averageCostPrice: inventory.averageCostPrice,
          },
        }, user, session);

        reservations.push({
          productSku: item.productSku,
          variantSku: item.variantSku,
          quantity: item.quantity,
          lots: lotsToReserve,
          expiresAt: new Date(Date.now() + (reserveDto.expirationMinutes || 30) * 60 * 1000),
        });
      }

      await session.commitTransaction();
      return { reservations, orderId: reserveDto.orderId };

    } catch (error) {
      await session.abortTransaction();
      this.logger.error(`Error reserving inventory: ${error.message}`);
      throw error;
    } finally {
      session.endSession();
    }
  }

  async releaseInventory(releaseDto: ReleaseInventoryDto, user: any) {
    this.logger.log(`Releasing inventory for order: ${releaseDto.orderId}`);

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      // Buscar movimientos de reserva para esta orden
      const reservationMovements = await this.movementModel
        .find({
          orderId: releaseDto.orderId,
          movementType: 'reservation',
          tenantId: user.tenantId,
        })
        .session(session);

      if (reservationMovements.length === 0) {
        throw new Error('No se encontraron reservas para esta orden');
      }

      for (const movement of reservationMovements) {
        // Filtrar por SKUs específicos si se proporcionan
        if (releaseDto.productSkus && !releaseDto.productSkus.includes(movement.productSku)) {
          continue;
        }

        const inventory = await this.inventoryModel
          .findOne({ _id: movement.inventoryId })
          .session(session);

        if (inventory) {
          // Liberar cantidades
          inventory.availableQuantity += movement.quantity;
          inventory.reservedQuantity -= movement.quantity;

          // Liberar lotes si aplica
          if (movement.lotNumber) {
            const lot = inventory.lots.find(l => l.lotNumber === movement.lotNumber);
            if (lot) {
              lot.availableQuantity += movement.quantity;
              lot.reservedQuantity -= movement.quantity;
            }
          }

          await inventory.save({ session });

          // Registrar movimiento de liberación
          await this.createMovementRecord({            inventoryId: inventory._id.toString(),
            productId: inventory.productId.toString(),
            productSku: movement.productSku,
            movementType: 'release',
            quantity: movement.quantity,
            unitCost: movement.unitCost,
            totalCost: movement.totalCost,
            reason: 'Liberación de reserva',
            reference: releaseDto.orderId,
            orderId: releaseDto.orderId,
            balanceAfter: {
              totalQuantity: inventory.totalQuantity,
              availableQuantity: inventory.availableQuantity,
              reservedQuantity: inventory.reservedQuantity,
              averageCostPrice: inventory.averageCostPrice,
            },
          }, user, session);
        }
      }

      await session.commitTransaction();
      return { success: true, orderId: releaseDto.orderId };

    } catch (error) {
      await session.abortTransaction();
      this.logger.error(`Error releasing inventory: ${error.message}`);
      throw error;
    } finally {
      session.endSession();
    }
  }

  async adjustInventory(adjustDto: AdjustInventoryDto, user: any) {
    this.logger.log(`Adjusting inventory: ${adjustDto.inventoryId}`);

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const inventory = await this.inventoryModel
        .findOne({ _id: adjustDto.inventoryId, tenantId: user.tenantId })
        .session(session);

      if (!inventory) {
        throw new Error('Inventario no encontrado');
      }

      const oldQuantity = inventory.totalQuantity;
      const difference = adjustDto.newQuantity - oldQuantity;

      // Actualizar cantidades
      inventory.totalQuantity = adjustDto.newQuantity;
      inventory.availableQuantity += difference;

      // Actualizar precio de costo si se proporciona
      if (adjustDto.newCostPrice) {
        inventory.averageCostPrice = adjustDto.newCostPrice;
        inventory.lastCostPrice = adjustDto.newCostPrice;
      }

      await inventory.save({ session });

      // Registrar movimiento de ajuste
      await this.createMovementRecord({
        inventoryId: inventory._id.toString(),
        productId: inventory.productId.toString(),
        productSku: inventory.productSku,
        movementType: 'adjustment',
        quantity: Math.abs(difference),
        unitCost: inventory.averageCostPrice,
        totalCost: Math.abs(difference) * inventory.averageCostPrice,
        reason: adjustDto.reason,
        lotNumber: adjustDto.lotNumber,
        balanceAfter: {
          totalQuantity: inventory.totalQuantity,
          availableQuantity: inventory.availableQuantity,
          reservedQuantity: inventory.reservedQuantity,
          averageCostPrice: inventory.averageCostPrice,
        },
      }, user, session);

      await session.commitTransaction();
      return inventory;

    } catch (error) {
      await session.abortTransaction();
      this.logger.error(`Error adjusting inventory: ${error.message}`);
      throw error;
    } finally {
      session.endSession();
    }
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

    const filter: any = { tenantId: new Types.ObjectId(tenantId) };

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
        .populate('createdBy', 'firstName lastName')
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
    return this.inventoryModel
      .find({
        tenantId,
        'alerts.lowStock': true,
      })
      .populate('productId', 'name category')
      .exec();
  }

  async getExpirationAlerts(tenantId: string, days: number = 7) {
    const alertDate = new Date();
    alertDate.setDate(alertDate.getDate() + days);

    return this.inventoryModel
      .find({
        tenantId,
        'lots.expirationDate': { $lte: alertDate },
        'lots.status': 'available',
      })
      .populate('productId', 'name category')
      .exec();
  }

  async getInventorySummary(tenantId: string) {
    const [
      totalProducts,
      lowStockCount,
      expirationCount,
      totalValue,
    ] = await Promise.all([
      this.inventoryModel.countDocuments({ tenantId }),
      this.inventoryModel.countDocuments({ tenantId, 'alerts.lowStock': true }),
      this.inventoryModel.countDocuments({ tenantId, 'alerts.nearExpiration': true }),
      this.inventoryModel.aggregate([
        { $match: { tenantId: new Types.ObjectId(tenantId) } },
        {
          $group: {
            _id: null,
            totalValue: {
              $sum: { $multiply: ['$totalQuantity', '$averageCostPrice'] }
            }
          }
        }
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
    session: ClientSession,
  ): Promise<InventoryDocument> {
    switch (movementDto.movementType) {
      case 'in':
        inventory.totalQuantity += movementDto.quantity;
        inventory.availableQuantity += movementDto.quantity;
        // Actualizar precio promedio ponderado
        const totalCost = (inventory.totalQuantity - movementDto.quantity) * inventory.averageCostPrice + 
                         movementDto.quantity * movementDto.unitCost;
        inventory.averageCostPrice = totalCost / inventory.totalQuantity;
        inventory.lastCostPrice = movementDto.unitCost;
        break;

      case 'out':
        inventory.totalQuantity -= movementDto.quantity;
        inventory.availableQuantity -= movementDto.quantity;
        break;

      case 'reservation':
        inventory.availableQuantity -= movementDto.quantity;
        inventory.reservedQuantity += movementDto.quantity;
        break;

      case 'release':
        inventory.availableQuantity += movementDto.quantity;
        inventory.reservedQuantity -= movementDto.quantity;
        break;

      case 'adjustment':
        // El ajuste se maneja en el método adjustInventory
        break;
    }

    return inventory.save({ session });
  }

  private async createMovementRecord(
    movementData: any,
    user: any,
    session: ClientSession,
  ): Promise<InventoryMovementDocument> {
    const movement = new this.movementModel({
      ...movementData,
      createdBy: user.id,
      tenantId: user.tenantId,
    });

    return movement.save({ session });
  }

  private applyFefoLogic(lots: any[], quantityNeeded: number): any[] {
    // Ordenar lotes por fecha de vencimiento (FEFO - First Expired First Out)
    const availableLots = lots
      .filter(lot => lot.status === 'available' && lot.availableQuantity > 0)
      .sort((a, b) => {
        if (!a.expirationDate && !b.expirationDate) return 0;
        if (!a.expirationDate) return 1;
        if (!b.expirationDate) return -1;
        return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
      });

    const reservations: any[] = [];
    let remainingQuantity = quantityNeeded;

    for (const lot of availableLots) {
      if (remainingQuantity <= 0) break;

      const quantityFromLot = Math.min(lot.availableQuantity, remainingQuantity);
      
      reservations.push({
        lotNumber: lot.lotNumber,
        quantity: quantityFromLot,
        expirationDate: lot.expirationDate,
      });

      remainingQuantity -= quantityFromLot;
    }

    if (remainingQuantity > 0) {
      throw new Error(`No hay suficiente stock disponible. Faltante: ${remainingQuantity}`);
    }

    return reservations;
  }
}

