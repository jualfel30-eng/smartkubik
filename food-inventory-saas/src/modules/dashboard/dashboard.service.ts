import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Order, OrderDocument } from "../../schemas/order.schema";
import { Customer, CustomerDocument } from "../../schemas/customer.schema";
import { Inventory, InventoryDocument } from "../../schemas/inventory.schema";
import { InventoryService } from "../inventory/inventory.service";

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Inventory.name)
    private inventoryModel: Model<InventoryDocument>,
    private readonly inventoryService: InventoryService,
  ) { }

  async getSummary(user: any) {
    this.logger.log(`Fetching dashboard summary for tenant: ${user.tenantId} -- USING FIXED LOGIC v2`);
    const tenantId = user.tenantId;
    const tenantObjectId = new Types.ObjectId(tenantId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      productsInStock,
      ordersToday,
      activeCustomers,
      salesTodayResult,
      lowStockAlerts,
      nearExpirationAlerts,
      recentOrders,
      inventoryValueResult,
    ] = await Promise.all([
      // Count unique products that have at least one variant with stock
      // Use tenantObjectId for Inventory model (stored as ObjectId)
      this.inventoryModel
        .distinct("productId", {
          tenantId: tenantObjectId,
          totalQuantity: { $gt: 0 },
          isActive: true,
        })
        .then((productIds) => productIds.length),
      this.orderModel.countDocuments({
        tenantId,
        createdAt: { $gte: today, $lt: tomorrow },
      }),
      this.customerModel.countDocuments({ tenantId, status: "active" }),
      this.orderModel.aggregate([
        {
          $match: {
            tenantId,
            paymentStatus: { $in: ["paid", "overpaid", "partial"] },
            createdAt: { $gte: today, $lt: tomorrow },
          },
        },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      this.inventoryService.getLowStockAlerts(tenantId),
      this.inventoryService.getExpirationAlerts(tenantId, 30),
      this.orderModel
        .find({ tenantId })
        .sort({ createdAt: -1 })
        .limit(5)
        .select("orderNumber customerName totalAmount status"),
      // Calculate total inventory value (cost and retail)
      this.inventoryModel.aggregate([
        {
          $match: {
            tenantId: tenantObjectId,
            isActive: true,
            totalQuantity: { $gt: 0 },
          },
        },
        {
          $addFields: {
            // Convert productId to ObjectId if it's a string (data consistency fix)
            productIdAsObjectId: {
              $cond: {
                if: { $eq: [{ $type: "$productId" }, "string"] },
                then: { $toObjectId: "$productId" },
                else: "$productId"
              }
            }
          }
        },
        {
          $lookup: {
            from: "products",
            localField: "productIdAsObjectId",
            foreignField: "_id",
            as: "productInfo",
          },
        },
        {
          $unwind: {
            path: "$productInfo",
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $addFields: {
            // Find the matching variant by SKU (more reliable than _id comparison)
            // or just use the first variant if only one exists
            matchedVariant: {
              $cond: {
                if: {
                  $and: [
                    { $ne: ["$variantSku", null] },
                    { $isArray: "$productInfo.variants" }
                  ]
                },
                then: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$productInfo.variants",
                        as: "variant",
                        cond: { $eq: ["$$variant.sku", "$variantSku"] }
                      }
                    },
                    0
                  ]
                },
                else: {
                  // If no variantSku, use first variant
                  $arrayElemAt: ["$productInfo.variants", 0]
                }
              }
            }
          }
        },
        {
          $addFields: {
            // Extract prices from the matched variant, fallback to averageCostPrice
            costPrice: {
              $cond: {
                if: { $gt: [{ $toDouble: "$averageCostPrice" }, 0] },
                then: { $toDouble: "$averageCostPrice" },
                else: { $ifNull: ["$matchedVariant.costPrice", 0] }
              }
            },
            basePrice: {
              $ifNull: ["$matchedVariant.basePrice", 0],
            },
          },
        },
        {
          $project: {
            totalQuantity: 1,
            costPrice: 1,
            basePrice: 1,
            costValue: {
              $multiply: ["$totalQuantity", "$costPrice"],
            },
            retailValue: {
              $multiply: ["$totalQuantity", "$basePrice"],
            },
          },
        },
        {
          $group: {
            _id: null,
            totalCostValue: { $sum: "$costValue" },
            totalRetailValue: { $sum: "$retailValue" },
            totalItems: { $sum: "$totalQuantity" },
          },
        },
      ]),
    ]);

    const salesToday =
      salesTodayResult.length > 0 ? salesTodayResult[0].total : 0;

    const inventoryValue = inventoryValueResult.length > 0
      ? {
        totalCostValue: inventoryValueResult[0].totalCostValue || 0,
        totalRetailValue: inventoryValueResult[0].totalRetailValue || 0,
        totalItems: inventoryValueResult[0].totalItems || 0,
        potentialProfit:
          (inventoryValueResult[0].totalRetailValue || 0) -
          (inventoryValueResult[0].totalCostValue || 0),
      }
      : {
        totalCostValue: 0,
        totalRetailValue: 0,
        totalItems: 0,
        potentialProfit: 0,
      };

    const inventoryAlertsMap = new Map();

    lowStockAlerts.forEach((alert) => {
      inventoryAlertsMap.set(alert.productSku, {
        productName: alert.productName,
        alerts: { lowStock: true },
      });
    });

    nearExpirationAlerts.forEach((alert) => {
      const existing = inventoryAlertsMap.get(alert.productSku);
      if (existing) {
        existing.alerts.nearExpiration = true;
      } else {
        inventoryAlertsMap.set(alert.productSku, {
          productName: alert.productName,
          alerts: { nearExpiration: true },
        });
      }
    });

    const inventoryAlerts = Array.from(inventoryAlertsMap.values()).slice(0, 5);

    return {
      productsInStock,
      ordersToday,
      activeCustomers,
      salesToday,
      inventoryValue,
      inventoryAlerts,
      recentOrders,
    };
  }
}
