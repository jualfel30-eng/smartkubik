import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { KitchenOrder } from "../../schemas/kitchen-order.schema";
import { Order } from "../../schemas/order.schema";
import {
  CreateKitchenOrderDto,
  UpdateItemStatusDto,
  BumpOrderDto,
  MarkUrgentDto,
  AssignCookDto,
  FilterKitchenOrdersDto,
  CancelKitchenOrderDto,
  ReopenKitchenOrderDto,
} from "../../dto/kitchen-order.dto";

@Injectable()
export class KitchenDisplayService {
  private readonly logger = new Logger(KitchenDisplayService.name);

  constructor(
    @InjectModel(KitchenOrder.name)
    private kitchenOrderModel: Model<KitchenOrder>,
    @InjectModel(Order.name)
    private orderModel: Model<Order>,
    @InjectModel('Product') // Inject Product model for manual name resolution
    private productModel: Model<any>,
  ) { }

  /**
   * Crear orden de cocina desde una Order
   */
  async createFromOrder(
    dto: CreateKitchenOrderDto,
    tenantId: string,
  ): Promise<KitchenOrder> {
    const order = await this.orderModel
      .findOne({ _id: dto.orderId, tenantId })
      .populate("items.removedIngredients", "name")
      .exec();

    if (!order) {
      throw new NotFoundException(`Order with ID ${dto.orderId} not found`);
    }

    // Verificar que no exista ya una kitchen order para esta orden
    const existing = await this.kitchenOrderModel
      .findOne({ orderId: order._id, tenantId, isDeleted: false })
      .exec();

    if (existing) {
      throw new BadRequestException(
        "Kitchen order already exists for this order",
      );
    }

    // Prepare to collect all ingredient IDs for manual fetching
    const allIngredientIds = new Set<string>();

    order.items.forEach((item: any) => {
      if (item.removedIngredients && item.removedIngredients.length > 0) {
        item.removedIngredients.forEach((id: any) => {
          // Normalize ID to string
          const idStr = (id._id || id).toString();
          allIngredientIds.add(idStr);
        });
      }
    });

    // Fetch all ingredient names manualy
    const ingredientMap = new Map<string, string>();
    if (allIngredientIds.size > 0) {
      const ingredients = await this.productModel.find({
        _id: { $in: Array.from(allIngredientIds) }
      }).select('name').exec();

      ingredients.forEach(ing => {
        ingredientMap.set(ing._id.toString(), ing.name);
      });
    }

    // Fetch product details for sendToKitchen check
    const productIds = order.items.map((i: any) => i.productId);
    const products = await this.productModel.find({ _id: { $in: productIds } }).select('sendToKitchen').exec();
    const sendToKitchenMap = new Map(products.map(p => [p._id.toString(), p.sendToKitchen !== false]));

    // Map modifiers with active name resolution
    const kitchenItems = order.items
      .filter((item: any) => sendToKitchenMap.get(item.productId.toString()) !== false)
      .map((item: any) => {
        const modifiers =
          item.modifiers?.map((m: any) => m.name).filter(Boolean) || [];

        // Add removed ingredients to modifiers list for display
        if (item.removedIngredients && item.removedIngredients.length > 0) {
          item.removedIngredients.forEach((ing: any) => {
            const idStr = (ing._id || ing).toString();
            const name = ingredientMap.get(idStr) || (ing.name ? ing.name : undefined);

            if (name) {
              modifiers.push(`Sin: ${name}`);
            } else {
              modifiers.push(`Sin: Ingrediente desconocido`);
            }
          });
        }

        return {
          itemId: item._id.toString(),
          productName: item.productName,
          quantity: item.quantity,
          modifiers,
          specialInstructions: item.specialInstructions,
          status: "pending",
        };
      });

    const kitchenOrder = new this.kitchenOrderModel({
      orderId: order._id,
      orderNumber: order.orderNumber,
      orderType: this.determineOrderType(order),
      tableNumber: (order as any).tableId
        ? await this.getTableNumber((order as any).tableId, tenantId)
        : undefined,
      customerName: order.customerName,
      items: kitchenItems,
      status: "new",
      priority: dto.priority || "normal",
      notes: dto.notes,
      receivedAt: new Date(),
      estimatedPrepTime:
        dto.estimatedPrepTime || this.estimatePrepTime(kitchenItems.length),
      station: dto.station,
      tenantId,
      isDeleted: false,
    });

    await kitchenOrder.save();

    this.logger.log(
      `Created kitchen order for Order ${order.orderNumber} with ${kitchenItems.length} items`,
    );
    return kitchenOrder;
  }

  /**
   * Sincronizar orden de cocina con orden existente (añadir nuevos items)
   */
  async syncWithOrder(orderId: string, tenantId: string): Promise<KitchenOrder | null> {
    this.logger.log(`[SYNC] Starting sync for order ${orderId}`);

    const order = await this.orderModel
      .findOne({ _id: orderId, tenantId })
      .populate("items.removedIngredients", "name")
      .exec();

    if (!order) {
      this.logger.warn(`[SYNC] Order ${orderId} not found, skipping sync`);
      return null;
    }

    const kitchenOrder = await this.kitchenOrderModel
      .findOne({ orderId: orderId, tenantId, isDeleted: false })
      .exec();

    // If kitchen order doesn't exist, DO NOT CREATE IT HERE
    // Let the order.created event handle creation to avoid duplicates
    if (!kitchenOrder) {
      this.logger.log(`[SYNC] No kitchen order found for order ${orderId}, skipping sync (will be handled by order.created event)`);
      return null;
    }

    this.logger.log(`[SYNC] Found existing kitchen order ${kitchenOrder.orderNumber} with ${kitchenOrder.items.length} items`);

    // Strategy change: Since item IDs change on every order update,
    // we use timestamp-based detection instead
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

    const existingProductNames = new Set(kitchenOrder.items.map(i => i.productName));
    this.logger.log(`[SYNC] Existing products in kitchen: ${Array.from(existingProductNames).join(', ')}`);

    // Only add items that have recent addedAt timestamp (added in last 2 minutes)
    const newItems = order.items.filter((item: any) => {
      const hasRecentTimestamp = item.addedAt && new Date(item.addedAt) > twoMinutesAgo;

      if (hasRecentTimestamp) {
        this.logger.log(`[SYNC] Item "${item.productName}" has recent timestamp: ${item.addedAt} - ADDING`);
        return true;
      }

      // Don't add items without recent timestamp
      this.logger.log(`[SYNC] Item "${item.productName}" skipped (no recent timestamp or already in kitchen)`);
      return false;
    });

    if (newItems.length === 0) {
      this.logger.log(`[SYNC] No new items to add to kitchen order ${kitchenOrder.orderNumber}`);
      return kitchenOrder;
    }

    this.logger.log(`[SYNC] Found ${newItems.length} new items to add to kitchen order`);

    // Process new items logic (similar to create)
    // ---------------------------------------------------------
    // Prepare to collect all ingredient IDs for manual fetching
    const allIngredientIds = new Set<string>();

    newItems.forEach((item: any) => {
      if (item.removedIngredients && item.removedIngredients.length > 0) {
        item.removedIngredients.forEach((id: any) => {
          const idStr = (id._id || id).toString();
          allIngredientIds.add(idStr);
        });
      }
    });

    // Fetch all ingredient names manualy
    const ingredientMap = new Map<string, string>();
    if (allIngredientIds.size > 0) {
      const ingredients = await this.productModel.find({
        _id: { $in: Array.from(allIngredientIds) }
      }).select('name').exec();

      ingredients.forEach(ing => {
        ingredientMap.set(ing._id.toString(), ing.name);
      });
    }

    const productIds = newItems.map((i: any) => i.productId);
    const products = await this.productModel.find({ _id: { $in: productIds } }).select('sendToKitchen').exec();
    // Default to true if sendToKitchen is undefined (backwards compatibility)
    const sendToKitchenMap = new Map(products.map(p => [p._id.toString(), p.sendToKitchen !== false]));

    const newKitchenItems = newItems
      .filter((item: any) => sendToKitchenMap.get(item.productId.toString()) !== false)
      .map((item: any) => {
        const modifiers =
          item.modifiers?.map((m: any) => m.name).filter(Boolean) || [];

        if (item.removedIngredients && item.removedIngredients.length > 0) {
          item.removedIngredients.forEach((ing: any) => {
            const idStr = (ing._id || ing).toString();
            const name = ingredientMap.get(idStr) || (ing.name ? ing.name : undefined);
            if (name) {
              modifiers.push(`Sin: ${name}`);
            } else {
              modifiers.push(`Sin: Ingrediente desconocido`);
            }
          });
        }

        return {
          itemId: item._id.toString(),
          productName: item.productName,
          quantity: item.quantity,
          modifiers,
          specialInstructions: item.specialInstructions,
          status: "pending", // New items start as pending
        };
      });
    // ---------------------------------------------------------

    // Push new items
    kitchenOrder.items.push(...newKitchenItems);

    // If order was completed, reopen it? Or just keep it as is?
    // Usually if new items arrive, it might be 'preparing' again if it was 'ready'.
    // Logic: If we add items, ensure global status reflects work to be done.
    if (kitchenOrder.status === 'ready' || kitchenOrder.status === 'completed') {
      kitchenOrder.status = 'preparing';
      kitchenOrder.completedAt = undefined;
    }

    await kitchenOrder.save();
    this.logger.log(`Synced kitchen order ${kitchenOrder.orderNumber}: Added ${newKitchenItems.length} new items`);

    return kitchenOrder;
  }

  /**
   * Add a SINGLE specific item to kitchen order
   */
  async addSingleItemToKitchen(data: { orderId: string; itemId: string; productName: string; quantity: number; modifiers?: string[]; specialInstructions?: string }, tenantId: string): Promise<KitchenOrder> {
    this.logger.log(`[SINGLE ITEM] Adding item "${data.productName}" to kitchen for order ${data.orderId}`);

    let kitchenOrder = await this.kitchenOrderModel
      .findOne({ orderId: data.orderId, tenantId, isDeleted: false })
      .exec();

    // If no kitchen order exists, create it first
    if (!kitchenOrder) {
      this.logger.log(`[SINGLE ITEM] No kitchen order found, creating one`);
      try {
        const dto: CreateKitchenOrderDto = {
          orderId: data.orderId,
          priority: 'normal',
        };
        kitchenOrder = await this.createFromOrder(dto, tenantId) as any;

        if (!kitchenOrder) {
          throw new Error('Failed to create kitchen order');
        }
      } catch (error) {
        // If creation failed because it already exists, try to fetch it again
        if (error.message && error.message.includes('already exists')) {
          this.logger.warn(`[SINGLE ITEM] Kitchen order already exists, fetching it`);
          kitchenOrder = await this.kitchenOrderModel
            .findOne({ orderId: new Types.ObjectId(data.orderId), tenantId, isDeleted: false })
            .exec();

          if (!kitchenOrder) {
            throw new Error('Kitchen order exists but could not be fetched');
          }
        } else {
          throw error;
        }
      }
    }

    // Check if this item already exists in kitchen
    const existingItem = kitchenOrder.items.find(i => i.itemId === data.itemId);
    if (existingItem) {
      this.logger.warn(`[SINGLE ITEM] Item ${data.itemId} already exists in kitchen, skipping`);
      return kitchenOrder;
    }

    // Add the single item
    const newKitchenItem = {
      itemId: data.itemId,
      productName: data.productName,
      quantity: data.quantity,
      modifiers: data.modifiers || [],
      specialInstructions: data.specialInstructions,
      status: "pending",
    };

    kitchenOrder.items.push(newKitchenItem);

    // Reopen if was completed
    if (kitchenOrder.status === 'ready' || kitchenOrder.status === 'completed') {
      kitchenOrder.status = 'preparing';
      kitchenOrder.completedAt = undefined;
    }

    await kitchenOrder.save();
    this.logger.log(`[SINGLE ITEM] Added "${data.productName}" to kitchen order ${kitchenOrder.orderNumber}`);

    return kitchenOrder;
  }


  /**
   * Obtener todas las órdenes activas con filtros
   */
  async findActive(
    filters: FilterKitchenOrdersDto,
    tenantId: string,
  ): Promise<KitchenOrder[]> {
    const query: any = {
      tenantId,
      isDeleted: false,
      status: { $in: ["new", "preparing", "ready"] }, // Solo activas
    };

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.station) {
      query.station = filters.station;
    }

    if (filters.priority) {
      query.priority = filters.priority;
    }

    if (filters.isUrgent !== undefined) {
      query.isUrgent = filters.isUrgent;
    }

    return this.kitchenOrderModel
      .find(query)
      .populate("assignedTo")
      .sort({ isUrgent: -1, priority: -1, createdAt: 1 }) // Urgentes primero, luego por orden de llegada
      .exec();
  }

  /**
   * Actualizar estado de un item específico
   */
  async updateItemStatus(
    dto: UpdateItemStatusDto,
    tenantId: string,
  ): Promise<KitchenOrder> {
    const kitchenOrder = await this.kitchenOrderModel
      .findOne({ _id: dto.kitchenOrderId, tenantId, isDeleted: false })
      .exec();

    if (!kitchenOrder) {
      throw new NotFoundException("Kitchen order not found");
    }

    const itemIndex = kitchenOrder.items.findIndex(
      (item) => item.itemId === dto.itemId,
    );

    if (itemIndex === -1) {
      throw new NotFoundException("Item not found in kitchen order");
    }

    const item = kitchenOrder.items[itemIndex];
    const oldStatus = item.status;
    item.status = dto.status;

    // Tracking de tiempos
    if (dto.status === "preparing" && !item.startedAt) {
      item.startedAt = new Date();
    }

    if (dto.status === "ready" && !item.readyAt) {
      item.readyAt = new Date();
      if (item.startedAt) {
        item.prepTime = Math.floor(
          (item.readyAt.getTime() - item.startedAt.getTime()) / 1000,
        );
      }
    }

    // Actualizar estado general de la orden
    await this.updateOrderStatus(kitchenOrder);

    await kitchenOrder.save();

    this.logger.log(
      `Updated item ${dto.itemId} status from ${oldStatus} to ${dto.status} in order ${kitchenOrder.orderNumber}`,
    );
    return kitchenOrder;
  }

  /**
   * Bump order (marcar como completada y lista para servir)
   */
  async bumpOrder(dto: BumpOrderDto, tenantId: string): Promise<KitchenOrder> {
    const kitchenOrder = await this.kitchenOrderModel
      .findOne({ _id: dto.kitchenOrderId, tenantId, isDeleted: false })
      .exec();

    if (!kitchenOrder) {
      throw new NotFoundException("Kitchen order not found");
    }

    if (kitchenOrder.status === "completed") {
      throw new BadRequestException("Order is already completed");
    }

    kitchenOrder.status = "completed";
    kitchenOrder.completedAt = new Date();

    // Calcular tiempo total
    if (kitchenOrder.startedAt) {
      kitchenOrder.totalPrepTime = Math.floor(
        (kitchenOrder.completedAt.getTime() -
          kitchenOrder.startedAt.getTime()) /
        1000,
      );
    }

    if (dto.notes) {
      kitchenOrder.notes = dto.notes;
    }

    await kitchenOrder.save();

    this.logger.log(`Bumped kitchen order ${kitchenOrder.orderNumber}`);
    return kitchenOrder;
  }

  /**
   * Marcar como urgente
   */
  async markUrgent(
    dto: MarkUrgentDto,
    tenantId: string,
  ): Promise<KitchenOrder> {
    const kitchenOrder = await this.kitchenOrderModel
      .findOneAndUpdate(
        { _id: dto.kitchenOrderId, tenantId, isDeleted: false },
        {
          $set: {
            isUrgent: dto.isUrgent,
            priority: dto.isUrgent ? "asap" : "normal",
          },
        },
        { new: true },
      )
      .exec();

    if (!kitchenOrder) {
      throw new NotFoundException("Kitchen order not found");
    }

    this.logger.log(
      `Marked order ${kitchenOrder.orderNumber} as ${dto.isUrgent ? "URGENT" : "normal"}`,
    );
    return kitchenOrder;
  }

  /**
   * Asignar a cocinero
   */
  async assignCook(
    dto: AssignCookDto,
    tenantId: string,
  ): Promise<KitchenOrder> {
    const kitchenOrder = await this.kitchenOrderModel
      .findOneAndUpdate(
        { _id: dto.kitchenOrderId, tenantId, isDeleted: false },
        { $set: { assignedTo: new Types.ObjectId(dto.cookId) } },
        { new: true },
      )
      .populate("assignedTo")
      .exec();

    if (!kitchenOrder) {
      throw new NotFoundException("Kitchen order not found");
    }

    this.logger.log(
      `Assigned cook ${dto.cookId} to order ${kitchenOrder.orderNumber}`,
    );
    return kitchenOrder;
  }

  /**
   * Cancelar orden de cocina
   */
  async cancel(
    dto: CancelKitchenOrderDto,
    tenantId: string,
  ): Promise<KitchenOrder> {
    const kitchenOrder = await this.kitchenOrderModel
      .findOneAndUpdate(
        { _id: dto.kitchenOrderId, tenantId, isDeleted: false },
        {
          $set: {
            status: "cancelled",
            notes: dto.reason,
          },
        },
        { new: true },
      )
      .exec();

    if (!kitchenOrder) {
      throw new NotFoundException("Kitchen order not found");
    }

    this.logger.log(
      `Cancelled kitchen order ${kitchenOrder.orderNumber}: ${dto.reason}`,
    );
    return kitchenOrder;
  }

  /**
   * Reabrir orden (si se bumpeó por error)
   */
  async reopen(
    dto: ReopenKitchenOrderDto,
    tenantId: string,
  ): Promise<KitchenOrder> {
    const kitchenOrder = await this.kitchenOrderModel
      .findOne({ _id: dto.kitchenOrderId, tenantId, isDeleted: false })
      .exec();

    if (!kitchenOrder) {
      throw new NotFoundException("Kitchen order not found");
    }

    if (kitchenOrder.status !== "completed") {
      throw new BadRequestException("Only completed orders can be reopened");
    }

    // Volver al estado anterior basado en items
    const allReady = kitchenOrder.items.every(
      (item) => item.status === "ready",
    );
    kitchenOrder.status = allReady ? "ready" : "preparing";
    kitchenOrder.completedAt = undefined;

    await kitchenOrder.save();

    this.logger.log(`Reopened kitchen order ${kitchenOrder.orderNumber}`);
    return kitchenOrder;
  }

  /**
   * Obtener estadísticas del día
   */
  async getStats(tenantId: string): Promise<any> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = await this.kitchenOrderModel.aggregate([
      {
        $match: {
          tenantId: new Types.ObjectId(tenantId),
          createdAt: { $gte: today },
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          avgPrepTime: { $avg: "$totalPrepTime" },
        },
      },
    ]);

    // Calcular tiempo promedio de espera
    const waitTimes = await this.kitchenOrderModel
      .find({
        tenantId,
        createdAt: { $gte: today },
        startedAt: { $exists: true },
        isDeleted: false,
      })
      .exec();

    const avgWaitTime =
      waitTimes.length > 0
        ? waitTimes.reduce((sum, order) => {
          const wait =
            order.startedAt && order.receivedAt
              ? (order.startedAt.getTime() - order.receivedAt.getTime()) /
              1000
              : 0;
          return sum + wait;
        }, 0) / waitTimes.length
        : 0;

    return {
      statusBreakdown: stats,
      avgWaitTime: Math.floor(avgWaitTime),
      totalOrders: stats.reduce((sum, s) => sum + s.count, 0),
    };
  }

  /**
   * HELPERS
   */

  private async updateOrderStatus(kitchenOrder: any): Promise<void> {
    const statuses = kitchenOrder.items.map((item: any) => item.status);

    // Si todos están en pending → order status = new
    if (statuses.every((s: string) => s === "pending")) {
      kitchenOrder.status = "new";
      return;
    }

    // Si al menos uno está preparing → order status = preparing
    if (statuses.some((s: string) => s === "preparing")) {
      kitchenOrder.status = "preparing";
      if (!kitchenOrder.startedAt) {
        kitchenOrder.startedAt = new Date();
        kitchenOrder.waitTime = Math.floor(
          (kitchenOrder.startedAt.getTime() -
            kitchenOrder.receivedAt.getTime()) /
          1000,
        );
      }
      return;
    }

    // Si todos están ready → order status = ready
    if (statuses.every((s: string) => s === "ready" || s === "served")) {
      kitchenOrder.status = "ready";
      return;
    }
  }

  private determineOrderType(order: any): string {
    if (order.tableId) return "dine-in";
    if (order.shipping?.method === "delivery") return "delivery";
    return "takeout";
  }

  private async getTableNumber(
    tableId: Types.ObjectId,
    tenantId: string,
  ): Promise<string> {
    // Importar Table model si es necesario
    // Por ahora retornamos el ID como string
    return tableId.toString().substring(0, 6);
  }

  private estimatePrepTime(itemCount: number): number {
    // Estimación simple: 5 min + 2 min por item adicional
    return 5 + (itemCount - 1) * 2;
  }
}
