import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Order, OrderDocument } from "../../../schemas/order.schema";
import { Tenant, TenantDocument } from "../../../schemas/tenant.schema";
import { TablesService } from "../../tables/tables.service";
import { InventoryService } from "../../inventory/inventory.service";
import { InventoryMovementsService } from "../../inventory/inventory-movements.service";
import { MovementType } from "../../../dto/inventory-movement.dto";

@Injectable()
export class OrderFulfillmentService {
  private readonly logger = new Logger(OrderFulfillmentService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    private readonly tablesService: TablesService,
    private readonly inventoryService: InventoryService,
    private readonly inventoryMovementsService: InventoryMovementsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async updateFulfillmentStatus(
    id: string,
    status: string,
    user: any,
    notes?: string,
    trackingNumber?: string,
  ): Promise<OrderDocument> {
    const order = await this.orderModel.findOne({
      _id: id,
      tenantId: user.tenantId,
    });
    if (!order) {
      throw new NotFoundException("Orden no encontrada");
    }

    const previousStatus = order.fulfillmentStatus;

    order.fulfillmentStatus = status;
    if (notes) order.deliveryNotes = notes;
    if (trackingNumber) order.trackingNumber = trackingNumber;

    if (status === "shipped" || status === "in_transit") {
      order.shippedAt = new Date();
    } else if (status === "delivered") {
      (order as any).deliveredAt = new Date();
      order.fulfillmentDate = new Date();
    }

    await order.save();

    this.logger.log(
      `Order ${order.orderNumber} fulfillment status updated: ${previousStatus} -> ${status}`,
    );

    this.eventEmitter.emit("order.fulfillment.updated", {
      order,
      previousStatus,
      newStatus: status,
      tenantId: user.tenantId,
    });

    return order;
  }

  async completeOrder(id: string, user: any): Promise<OrderDocument> {
    const order = await this.orderModel
      .findOne({
        _id: id,
        tenantId: user.tenantId,
      })
      .select("+tableId");

    if (!order) {
      throw new NotFoundException("Orden no encontrada");
    }

    if (order.paymentStatus !== "paid") {
      if (order.billingDocumentType === "delivery_note") {
        const effectiveTotal =
          (order.subtotal || 0) + (order.shippingCost || 0);
        const paidAmount = order.paidAmount || 0;
        if (paidAmount < effectiveTotal - 0.01) {
          throw new BadRequestException(
            "La orden debe estar completamente pagada antes de completarla",
          );
        }
      } else {
        throw new BadRequestException(
          "La orden debe estar completamente pagada antes de completarla",
        );
      }
    }

    if (!order.billingDocumentId || order.billingDocumentType === "none") {
      throw new BadRequestException(
        "La orden debe tener una factura emitida antes de completarla",
      );
    }

    const tenant = await this.tenantModel.findById(user.tenantId);
    let strategy = tenant?.settings?.fulfillmentStrategy || "logistics";

    if (strategy === "hybrid") {
      const method = order.shipping?.method?.toLowerCase();
      if (method === "pickup" || method === "retiro") {
        strategy = "counter";
      } else if (
        method === "delivery" ||
        method === "shipping" ||
        method === "envio"
      ) {
        strategy = "logistics";
      } else {
        strategy = "immediate";
      }
    }

    if (strategy === "immediate") {
      order.status = "completed";
      order.fulfillmentStatus = "delivered";
      order.fulfillmentDate = new Date();
      (order as any).deliveredAt = new Date();
    } else if (strategy === "counter") {
      order.status = "confirmed";
      order.fulfillmentStatus = "picking";
    } else {
      order.status = "confirmed";
      order.fulfillmentStatus = "pending";
    }

    if (order.fulfillmentStatus === "delivered") {
      order.fulfillmentDate = new Date();
      (order as any).deliveredAt = new Date();
    }

    // Auto-clean table
    if (order.tableId) {
      this.cleanupTable(order, user.tenantId);
    }

    await order.save();

    this.logger.log(
      `Order ${order.orderNumber} completed successfully by user ${user.id}. Strategy: ${strategy}`,
    );

    this.eventEmitter.emit("order.fulfillment.updated", {
      order,
      previousStatus: "pending",
      newStatus: order.fulfillmentStatus,
      tenantId: user.tenantId,
    });

    return order;
  }

  async cancelOrder(id: string, user: any): Promise<OrderDocument> {
    const order = await this.orderModel.findOne({
      _id: id,
      tenantId: user.tenantId,
    });
    if (!order) {
      throw new NotFoundException("Orden no encontrada");
    }

    if (order.status === "cancelled") {
      return order;
    }

    order.status = "cancelled";
    (order as any).cancelledAt = new Date();
    await order.save();

    // Reverse inventory in background
    setImmediate(async () => {
      try {
        for (const item of order.items) {
          const inv =
            (await this.inventoryService.findByProductSku(
              item.productSku,
              user.tenantId,
            )) ||
            (await this.inventoryService.findByProductId(
              item.productId.toString(),
              user.tenantId,
            ));

          if (!inv) {
            this.logger.warn(
              `No inventory found for SKU ${item.productSku} when reversing cancellation on order ${order.orderNumber}`,
            );
            continue;
          }

          await this.inventoryMovementsService.create(
            {
              inventoryId: inv._id.toString(),
              movementType: MovementType.ADJUSTMENT,
              quantity: item.quantity,
              unitCost: inv.averageCostPrice || 0,
              reason: "Reverso por cancelación de orden",
              warehouseId: inv.warehouseId?.toString(),
            },
            user.tenantId,
            user.id,
            false,
            { orderId: order._id.toString(), origin: "order-cancel" },
          );
        }
      } catch (err) {
        this.logger.error(
          `Failed to reverse inventory for cancelled order ${order.orderNumber}: ${err.message}`,
        );
      }
    });

    return order;
  }

  /**
   * Helper: Safely resolve tableId to string and clear the table
   */
  cleanupTable(order: any, tenantId: string): void {
    setImmediate(async () => {
      try {
        let tableIdStr: string;

        if (order.tableId instanceof Types.ObjectId) {
          tableIdStr = order.tableId.toString();
        } else if (typeof order.tableId === "string") {
          tableIdStr = order.tableId;
        } else if (
          order.tableId &&
          typeof order.tableId === "object" &&
          "_id" in order.tableId
        ) {
          tableIdStr = (order.tableId as any)._id.toString();
        } else {
          tableIdStr = String(order.tableId || "");
        }

        if (
          !tableIdStr ||
          tableIdStr === "null" ||
          tableIdStr === "undefined" ||
          tableIdStr === "[object Object]"
        ) {
          this.logger.warn(
            `[TABLE CLEANUP] Invalid tableId for order ${order.orderNumber}. ` +
              `Raw value: ${JSON.stringify(order.tableId)}, Converted: "${tableIdStr}"`,
          );
          return;
        }

        this.logger.log(
          `[TABLE CLEANUP] Clearing table ${tableIdStr} for order ${order.orderNumber}`,
        );

        await this.tablesService.clearTable(tableIdStr, tenantId);

        this.logger.log(
          `[TABLE CLEANUP] Successfully cleared table ${tableIdStr} for order ${order.orderNumber}`,
        );
      } catch (err) {
        this.logger.error(
          `[TABLE CLEANUP] Failed to clear table for order ${order.orderNumber}: ${err.message}`,
          err.stack,
        );
      }
    });
  }
}
