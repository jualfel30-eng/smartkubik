import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  ProductConsumableRelation,
  ProductConsumableRelationDocument,
} from "../../schemas/product-consumable-relation.schema";
import {
  InventoryMovement,
  InventoryMovementDocument,
  Inventory,
  InventoryDocument,
} from "../../schemas/inventory.schema";

interface OrderCreatedEvent {
  orderId: string;
  tenantId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  orderType?: string; // "takeaway", "dine_in", "delivery"
  userId?: string;
}

interface OrderCancelledEvent {
  orderId: string;
  tenantId: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  userId?: string;
}

@Injectable()
export class ConsumablesListener {
  private readonly logger = new Logger(ConsumablesListener.name);

  constructor(
    @InjectModel(ProductConsumableRelation.name)
    private readonly consumableRelationModel: Model<ProductConsumableRelationDocument>,
    @InjectModel(InventoryMovement.name)
    private readonly inventoryMovementModel: Model<InventoryMovementDocument>,
    @InjectModel(Inventory.name)
    private readonly inventoryModel: Model<InventoryDocument>,
  ) {}

  @OnEvent("order.created")
  async handleOrderCreated(event: OrderCreatedEvent) {
    this.logger.log(
      `Processing order.created event for order ${event.orderId} in tenant ${event.tenantId}`,
    );

    try {
      // For each item in the order, check if it has consumable relations
      for (const item of event.items) {
        await this.deductConsumablesForProduct(
          event.tenantId,
          item.productId,
          item.quantity,
          event.orderType || "always",
          event.orderId,
          event.userId,
        );
      }

      this.logger.log(
        `Successfully processed consumables for order ${event.orderId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error processing consumables for order ${event.orderId}: ${error.message}`,
        error.stack,
      );
      // Don't throw - we don't want to break order creation if consumables fail
    }
  }

  @OnEvent("order.cancelled")
  async handleOrderCancelled(event: OrderCancelledEvent) {
    this.logger.log(
      `Processing order.cancelled event for order ${event.orderId} in tenant ${event.tenantId}`,
    );

    try {
      // For each item in the order, restore consumables
      for (const item of event.items) {
        await this.restoreConsumablesForProduct(
          event.tenantId,
          item.productId,
          item.quantity,
          event.orderId,
          event.userId,
        );
      }

      this.logger.log(
        `Successfully restored consumables for cancelled order ${event.orderId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error restoring consumables for order ${event.orderId}: ${error.message}`,
        error.stack,
      );
    }
  }

  private async deductConsumablesForProduct(
    tenantId: string,
    productId: string,
    productQuantity: number,
    orderType: string,
    orderId: string,
    userId?: string,
  ) {
    // Find all auto-deducted consumable relations for this product
    const relations = await this.consumableRelationModel
      .find({
        productId,
        tenantId,
        isActive: true,
        isAutoDeducted: true,
      })
      .populate("consumableId")
      .lean()
      .exec();

    if (relations.length === 0) {
      this.logger.debug(
        `No auto-deducted consumables found for product ${productId}`,
      );
      return;
    }

    this.logger.debug(
      `Found ${relations.length} consumable relations for product ${productId}`,
    );

    for (const relation of relations) {
      // Check if this consumable applies to the current order type
      if (
        relation.applicableContext !== "always" &&
        relation.applicableContext !== orderType
      ) {
        this.logger.debug(
          `Skipping consumable ${relation.consumableId} - not applicable for context ${orderType}`,
        );
        continue;
      }

      const consumableQuantity = relation.quantityRequired * productQuantity;

      try {
        // Deduct from inventory using FEFO (First Expired, First Out)
        await this.deductFromInventory(
          tenantId,
          relation.consumableId.toString(),
          consumableQuantity,
          orderId,
          userId,
        );

        this.logger.log(
          `Deducted ${consumableQuantity} units of consumable ${relation.consumableId} for order ${orderId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to deduct consumable ${relation.consumableId}: ${error.message}`,
        );
        // Continue with other consumables even if one fails
      }
    }
  }

  private async restoreConsumablesForProduct(
    tenantId: string,
    _productId: string,
    _productQuantity: number,
    orderId: string,
    userId?: string,
  ) {
    // Find inventory movements related to this order for consumables
    const movements = await this.inventoryMovementModel
      .find({
        tenantId,
        orderId: new Types.ObjectId(orderId),
        movementType: "sale",
        reference: { $regex: /auto-deducted consumable/i },
      })
      .lean()
      .exec();

    if (movements.length === 0) {
      this.logger.debug(`No consumable movements found for order ${orderId}`);
      return;
    }

    this.logger.debug(
      `Found ${movements.length} consumable movements to restore for order ${orderId}`,
    );

    for (const movement of movements) {
      try {
        // Create a reverse movement to restore the inventory
        await this.inventoryMovementModel.create({
          tenantId,
          inventoryId: movement.inventoryId,
          productId: movement.productId,
          productSku: movement.productSku,
          lotNumber: movement.lotNumber,
          movementType: "adjustment",
          quantity: Math.abs(movement.quantity),
          unitCost: movement.unitCost,
          totalCost: Math.abs(movement.totalCost),
          reason: "Order cancelled - restore auto-deducted consumable",
          reference: `Restoring consumable for cancelled order ${orderId}`,
          orderId: new Types.ObjectId(orderId),
          createdBy: userId ? new Types.ObjectId(userId) : undefined,
        });

        // Update inventory total quantity
        await this.inventoryModel.updateOne(
          { productId: movement.productId, tenantId },
          { $inc: { totalQuantity: Math.abs(movement.quantity) } },
        );

        this.logger.log(
          `Restored ${Math.abs(movement.quantity)} units of consumable ${movement.productId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to restore consumable ${movement.productId}: ${error.message}`,
        );
      }
    }
  }

  private async deductFromInventory(
    tenantId: string,
    consumableId: string,
    quantity: number,
    orderId: string,
    userId?: string,
  ) {
    // Get inventory for this consumable
    const inventory = await this.inventoryModel
      .findOne({ productId: consumableId, tenantId })
      .lean()
      .exec();

    if (!inventory) {
      this.logger.warn(
        `No inventory found for consumable ${consumableId} in tenant ${tenantId}`,
      );
      return;
    }

    if (inventory.totalQuantity < quantity) {
      this.logger.warn(
        `Insufficient inventory for consumable ${consumableId}: required ${quantity}, available ${inventory.totalQuantity}`,
      );
      // Continue anyway - we'll allow negative inventory for consumables
    }

    // Find the oldest lots (FEFO strategy)
    const lots = inventory.lots
      .filter((lot) => lot.availableQuantity > 0)
      .sort((a, b) => {
        // Sort by expiration date first (FEFO), then by date received
        if (a.expirationDate && b.expirationDate) {
          return a.expirationDate.getTime() - b.expirationDate.getTime();
        }
        if (a.expirationDate) return -1;
        if (b.expirationDate) return 1;
        return a.receivedDate.getTime() - b.receivedDate.getTime();
      });

    let remainingQuantity = quantity;

    for (const lot of lots) {
      if (remainingQuantity <= 0) break;

      const quantityToDeduct = Math.min(
        lot.availableQuantity,
        remainingQuantity,
      );
      const costPerUnit = lot.costPrice;
      const totalCost = quantityToDeduct * costPerUnit;

      // Create inventory movement
      await this.inventoryMovementModel.create({
        tenantId,
        inventoryId: inventory._id,
        productId: consumableId,
        productSku: inventory.productSku,
        lotNumber: lot.lotNumber,
        movementType: "sale",
        quantity: quantityToDeduct,
        unitCost: costPerUnit,
        totalCost: -totalCost,
        reason: "Auto-deducted consumable for order",
        reference: `Auto-deducted consumable for order ${orderId}`,
        orderId: new Types.ObjectId(orderId),
        createdBy: userId ? new Types.ObjectId(userId) : undefined,
      });

      // Update lot quantity
      await this.inventoryModel.updateOne(
        {
          productId: consumableId,
          tenantId,
          "lots.lotNumber": lot.lotNumber,
        },
        {
          $inc: {
            "lots.$.availableQuantity": -quantityToDeduct,
            totalQuantity: -quantityToDeduct,
          },
        },
      );

      remainingQuantity -= quantityToDeduct;
    }

    if (remainingQuantity > 0) {
      this.logger.warn(
        `Could not fully deduct consumable ${consumableId}: ${remainingQuantity} units remaining`,
      );
    }
  }
}
