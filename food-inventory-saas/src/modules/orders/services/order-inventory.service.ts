import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Order, OrderDocument } from "../../../schemas/order.schema";
import {
  BillOfMaterials,
  BillOfMaterialsDocument,
} from "../../../schemas/bill-of-materials.schema";
import { Product, ProductDocument } from "../../../schemas/product.schema";
import { Modifier } from "../../../schemas/modifier.schema";
import { InventoryService } from "../../inventory/inventory.service";
import { InventoryMovementsService } from "../../inventory/inventory-movements.service";
import { MovementType } from "../../../dto/inventory-movement.dto";

@Injectable()
export class OrderInventoryService {
  private readonly logger = new Logger(OrderInventoryService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(BillOfMaterials.name)
    private bomModel: Model<BillOfMaterialsDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Modifier.name) private modifierModel: Model<Modifier>,
    private readonly inventoryService: InventoryService,
    private readonly inventoryMovementsService: InventoryMovementsService,
  ) {}

  /**
   * Backflush: Deduct ingredients from inventory when a recipe-based product is sold.
   * Called when an order is fully paid.
   */
  async deductIngredientsFromSale(
    order: OrderDocument,
    user: any,
  ): Promise<void> {
    try {
      this.logger.log(
        `[Backflush] Starting ingredient deduction for order ${order.orderNumber} (${order._id})`,
      );

      for (const item of order.items) {
        const productOid = new Types.ObjectId(item.productId.toString());
        const tenantOid = new Types.ObjectId(user.tenantId.toString());

        this.logger.debug(
          `[Backflush] Checking BOM for product ${item.productSku} (productId: ${productOid}, tenantId: ${tenantOid})`,
        );

        const bom = await this.bomModel
          .findOne({
            productId: productOid,
            isActive: true,
            tenantId: tenantOid,
          })
          .lean();

        if (!bom) {
          this.logger.debug(
            `No active BOM found for product ${item.productSku} (${item.productId})`,
          );
          continue;
        }

        this.logger.log(
          `Found BOM ${bom._id} for product ${item.productSku}. Exploding recipe...`,
        );

        const flatIngredients: Array<{
          productId: Types.ObjectId;
          sku: string;
          name: string;
          totalQuantity: number;
          unit: string;
        }> = [];

        for (const component of bom.components || []) {
          let componentQuantity = component.quantity * item.quantity;

          // Process modifiers that affect this component
          if (item.modifiers && item.modifiers.length > 0) {
            for (const appliedModifier of item.modifiers) {
              const modifier = await this.modifierModel
                .findById(appliedModifier.modifierId)
                .lean();

              if (
                modifier?.componentEffects &&
                modifier.componentEffects.length > 0
              ) {
                const effect = modifier.componentEffects.find(
                  (ce: any) =>
                    ce.componentProductId.toString() ===
                    component.componentProductId.toString(),
                );

                if (effect) {
                  const modifierQty = appliedModifier.quantity || 1;

                  switch (effect.action) {
                    case "exclude":
                      componentQuantity = 0;
                      this.logger.log(
                        `Modifier "${modifier.name}" excluded component ${component.componentProductId} from order ${order.orderNumber}`,
                      );
                      break;

                    case "multiply":
                      const multiplier = effect.quantity || 1;
                      componentQuantity *= multiplier * modifierQty;
                      this.logger.log(
                        `Modifier "${modifier.name}" multiplied component ${component.componentProductId} by ${multiplier} (qty: ${modifierQty})`,
                      );
                      break;

                    case "add":
                      const additionalQty =
                        (effect.quantity || 0) * modifierQty;
                      componentQuantity += additionalQty;
                      this.logger.log(
                        `Modifier "${modifier.name}" added ${additionalQty} to component ${component.componentProductId}`,
                      );
                      break;
                  }
                }
              }
            }
          }

          if (componentQuantity === 0) {
            continue;
          }

          const totalQuantity =
            componentQuantity * (1 + (component.scrapPercentage || 0) / 100);

          const componentProduct = await this.productModel
            .findById(component.componentProductId)
            .lean();

          if (!componentProduct) {
            this.logger.warn(
              `Component product ${component.componentProductId} not found in BOM ${bom._id}`,
            );
            continue;
          }

          flatIngredients.push({
            productId: component.componentProductId,
            sku: componentProduct.sku,
            name: componentProduct.name,
            totalQuantity,
            unit: component.unit,
          });
        }

        // Deduct each ingredient from inventory
        for (const ingredient of flatIngredients) {
          if (
            item.removedIngredients &&
            item.removedIngredients.some(
              (removedId) =>
                removedId.toString() === ingredient.productId.toString(),
            )
          ) {
            this.logger.log(
              `[Backflush] Ingredient ${ingredient.name} (${ingredient.sku}) skipped (removed by customer).`,
            );
            continue;
          }

          try {
            let inventory = await this.inventoryService.findByProductId(
              ingredient.productId.toString(),
              user.tenantId,
            );

            if (!inventory) {
              inventory = await this.inventoryService.findByProductSku(
                ingredient.sku,
                user.tenantId,
              );
            }

            if (!inventory) {
              this.logger.warn(
                `[Backflush] Inventory not found for ingredient ${ingredient.sku} (${ingredient.name}, productId: ${ingredient.productId}). Skipping deduction.`,
              );
              continue;
            }

            const newQuantity =
              inventory.totalQuantity - ingredient.totalQuantity;

            await this.inventoryService.adjustInventory(
              {
                inventoryId: inventory._id.toString(),
                newQuantity: Math.max(0, newQuantity),
                reason: `Consumo por venta - Orden ${order.orderNumber} - Platillo: ${item.productName}`,
              },
              user,
            );

            this.logger.log(
              `Deducted ${ingredient.totalQuantity} ${ingredient.unit} of ${ingredient.sku} (${ingredient.name}). New quantity: ${newQuantity}`,
            );
          } catch (error) {
            this.logger.error(
              `Error deducting ingredient ${ingredient.sku} for order ${order.orderNumber}: ${error.message}`,
              error.stack,
            );
          }
        }
      }

      this.logger.log(
        `Ingredient deduction completed for order ${order.orderNumber}`,
      );
    } catch (error) {
      this.logger.error(
        `Error in deductIngredientsFromSale for order ${order._id}: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Simpler variant of ingredient deduction using deductStockBySku
   */
  async deductIngredients(item: any, user: any, order: any): Promise<void> {
    try {
      const bom = await this.bomModel.findOne({
        productId: item.productId,
        isActive: true,
        tenantId: user.tenantId,
      });

      if (!bom) {
        this.logger.warn(
          `BOM not found for product ${item.productId} during backflushing.`,
        );
        return;
      }

      for (const component of bom.components) {
        const orderQty = item.quantityInBaseUnit ?? item.quantity;
        const requiredQty = orderQty * component.quantity;

        if (requiredQty <= 0) continue;

        const componentProduct = await this.productModel.findById(
          component.componentProductId,
        );
        if (!componentProduct) {
          this.logger.warn(
            `Component product ${component.componentProductId} not found.`,
          );
          continue;
        }

        let ingredientSku = componentProduct.sku;
        if (component.componentVariantId) {
          const variant = componentProduct.variants.find(
            (v) => String(v._id) === String(component.componentVariantId),
          );
          if (variant) ingredientSku = variant.sku;
        }

        await this.inventoryService.deductStockBySku(
          ingredientSku,
          requiredQty,
          user.tenantId,
          user,
          `Consumo Receta: ${item.productName || "Plato"} (Orden #${order.orderNumber})`,
          order._id.toString(),
        );
      }
    } catch (error) {
      this.logger.error(
        `Error in deductIngredients for item ${item.productSku}: ${error.message}`,
      );
    }
  }

  /**
   * Reconcile missing OUT inventory movements for paid/shipped/delivered orders
   */
  async reconcileMissingOutMovements(
    user: any,
    options?: { statuses?: string[]; limit?: number },
  ): Promise<{
    ordersChecked: number;
    movementsCreated: number;
    skippedExistingOut: number;
    missingInventory: number;
    errors: number;
  }> {
    const targetStatuses = (
      options?.statuses?.length
        ? options.statuses
        : ["shipped", "delivered", "paid"]
    ).filter(Boolean);
    const limit = Math.min(options?.limit || 200, 1000);

    const orders = await this.orderModel
      .find({
        tenantId: user.tenantId,
        status: { $in: targetStatuses },
      })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();

    let movementsCreated = 0;
    let skippedExistingOut = 0;
    let missingInventory = 0;
    let errors = 0;

    for (const order of orders) {
      try {
        const hasOut =
          await this.inventoryMovementsService.hasOutMovementsForOrder(
            order._id.toString(),
            user.tenantId,
          );
        if (hasOut) {
          skippedExistingOut += 1;
          continue;
        }

        for (const item of order.items || []) {
          const inv = await this.inventoryService.findByProductSku(
            item.productSku,
            user.tenantId,
          );
          if (!inv) {
            missingInventory += 1;
            continue;
          }

          await this.inventoryMovementsService.create(
            {
              inventoryId: inv._id.toString(),
              movementType: MovementType.OUT,
              quantity: item.quantity,
              unitCost: inv.averageCostPrice || 0,
              reason: "Salida por reconciliación de orden",
              warehouseId: inv.warehouseId?.toString(),
            },
            user.tenantId,
            user.id,
            true,
            { orderId: order._id.toString(), origin: "order-reconcile" },
          );
          movementsCreated += 1;
        }
      } catch (err) {
        this.logger.error(
          `Error reconciling OUT movements for order ${order.orderNumber}: ${err.message}`,
        );
        errors += 1;
      }
    }

    return {
      ordersChecked: orders.length,
      movementsCreated,
      skippedExistingOut,
      missingInventory,
      errors,
    };
  }

  /**
   * Create OUT inventory movements for a paid order (non-BOM items only)
   */
  async createOutMovementsForPaidOrder(
    order: OrderDocument,
    user: any,
  ): Promise<void> {
    try {
      for (const item of order.items) {
        const hasBom = await this.bomModel.exists({
          productId: new Types.ObjectId(item.productId.toString()),
          isActive: true,
          tenantId: new Types.ObjectId(user.tenantId.toString()),
        });

        if (hasBom) {
          this.logger.log(
            `[Backflush] Item ${item.productSku} is a Recipe. Skipping Retail Deduction.`,
          );
          continue;
        }

        const inv = await this.inventoryService.findByProductSku(
          item.productSku,
          user.tenantId,
        );
        if (!inv) {
          this.logger.warn(
            `No inventory found for SKU ${item.productSku} when creating OUT movement for order ${order.orderNumber}`,
          );
          continue;
        }
        await this.inventoryMovementsService.create(
          {
            inventoryId: inv._id.toString(),
            movementType: MovementType.OUT,
            quantity: item.quantity,
            unitCost: inv.averageCostPrice || 0,
            reason: "Salida por orden pagada",
            warehouseId: inv.warehouseId?.toString(),
          },
          user.tenantId,
          user.id,
          true,
          { orderId: order._id.toString(), origin: "order" },
        );
      }
    } catch (err) {
      this.logger.error(
        `Failed to create OUT movements for order ${order.orderNumber}: ${err.message}`,
      );
    }
  }

  /**
   * Create OUT movements for status change (shipped/delivered).
   * Includes idempotency check — skips if OUT movements already exist.
   */
  async createOutMovementsForStatusChange(
    order: any,
    user: any,
  ): Promise<void> {
    try {
      const hasOut =
        await this.inventoryMovementsService.hasOutMovementsForOrder(
          order._id.toString(),
          user.tenantId,
        );
      if (hasOut) {
        this.logger.debug(
          `OUT movements already exist for order ${order.orderNumber}, skipping status-change deduction`,
        );
        return;
      }

      for (const item of order.items || []) {
        const inv = await this.inventoryService.findByProductSku(
          item.productSku,
          user.tenantId,
        );
        if (!inv) {
          this.logger.warn(
            `No inventory found for SKU ${item.productSku} when creating OUT movement for order ${order.orderNumber} (status change)`,
          );
          continue;
        }
        await this.inventoryMovementsService.create(
          {
            inventoryId: inv._id.toString(),
            movementType: MovementType.OUT,
            quantity: item.quantity,
            unitCost: inv.averageCostPrice || 0,
            reason: "Salida por orden enviada/entregada",
            warehouseId: inv.warehouseId?.toString(),
          },
          user.tenantId,
          user.id,
          true,
          { orderId: order._id.toString(), origin: "order-status" },
        );
      }
    } catch (err) {
      this.logger.error(
        `Failed to create OUT movements on status change for order ${order.orderNumber}: ${err.message}`,
      );
    }
  }
}
