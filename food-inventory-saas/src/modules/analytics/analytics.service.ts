import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Model, Types } from "mongoose";
import { FEATURES, FeatureFlags } from "../../config/features.config";
import { getVerticalProfile } from "../../config/vertical-profiles";
import {
  PerformanceKpi,
  PerformanceKpiDocument,
} from "../../schemas/performance-kpi.schema";
import { Order, OrderDocument } from "../../schemas/order.schema";
import { Shift, ShiftDocument } from "../../schemas/shift.schema";
import { Tenant, TenantDocument } from "../../schemas/tenant.schema";
import { User, UserDocument } from "../../schemas/user.schema";
import { Product, ProductDocument } from "../../schemas/product.schema";
import {
  Inventory,
  InventoryDocument,
  InventoryMovement,
  InventoryMovementDocument,
} from "../../schemas/inventory.schema";
import { Payable, PayableDocument } from "../../schemas/payable.schema";
import {
  Appointment,
  AppointmentDocument,
} from "../../schemas/appointment.schema";
import { Service, ServiceDocument } from "../../schemas/service.schema";
import { Resource, ResourceDocument } from "../../schemas/resource.schema";
import { Customer, CustomerDocument } from "../../schemas/customer.schema";

const SUPPORTED_PERIODS = new Set([
  "7d",
  "14d",
  "30d",
  "60d",
  "90d",
  "180d",
  "365d",
]);

interface DateRange {
  from: Date;
  to: Date;
  groupBy: "day" | "month";
  period: string;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectModel(PerformanceKpi.name)
    private readonly kpiModel: Model<PerformanceKpiDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Shift.name) private readonly shiftModel: Model<ShiftDocument>,
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Inventory.name)
    private readonly inventoryModel: Model<InventoryDocument>,
    @InjectModel(InventoryMovement.name)
    private readonly inventoryMovementModel: Model<InventoryMovementDocument>,
    @InjectModel(Payable.name)
    private readonly payableModel: Model<PayableDocument>,
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
    @InjectModel(Service.name)
    private readonly serviceModel: Model<ServiceDocument>,
    @InjectModel(Resource.name)
    private readonly resourceModel: Model<ResourceDocument>,
    @InjectModel(Customer.name)
    private readonly customerModel: Model<CustomerDocument>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM, {
    name: "dailyPerformanceKPIs",
    timeZone: "America/Caracas",
  })
  async handleCron(): Promise<void> {
    this.logger.log("Running daily performance KPI calculation job...");

    const tenants = await this.tenantModel
      .find({ status: "active" })
      .select("_id")
      .lean();
    this.logger.log(`Found ${tenants.length} active tenants to process.`);

    for (const tenant of tenants) {
      await this.calculateAndSaveKpisForTenant(tenant._id);
    }

    this.logger.log("Daily performance KPI calculation job finished.");
  }

  async calculateAndSaveKpisForTenant(
    tenantId: string | Types.ObjectId,
  ): Promise<void> {
    const { objectId: tenantObjectId } =
      this.normalizeTenantIdentifiers(tenantId);
    this.logger.log(
      `Calculating KPIs for tenant: ${tenantObjectId.toHexString()}`,
    );

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const startOfYesterday = new Date(yesterday.setHours(0, 0, 0, 0));
    const endOfYesterday = new Date(yesterday.setHours(23, 59, 59, 999));

    const shifts = await this.shiftModel
      .find({
        tenantId: tenantObjectId,
        clockOut: { $gte: startOfYesterday, $lte: endOfYesterday },
      })
      .lean();

    if (!shifts.length) {
      this.logger.log(
        `No shifts found for tenant ${tenantObjectId} for yesterday. Skipping.`,
      );
      return;
    }

    const userHours = shifts.reduce<Record<string, number>>((acc, shift) => {
      const userId = shift.userId.toString();
      acc[userId] = (acc[userId] || 0) + (shift.durationInHours ?? 0);
      return acc;
    }, {});
    const userIds = Object.keys(userHours).map((id) => new Types.ObjectId(id));

    const orders = await this.orderModel
      .find({
        tenantId: tenantObjectId,
        status: "delivered",
        confirmedAt: { $gte: startOfYesterday, $lte: endOfYesterday },
        assignedTo: { $in: userIds },
      })
      .lean();

    const userSales = orders.reduce<
      Record<string, { totalSales: number; numberOfOrders: number }>
    >((acc, order) => {
      if (order.assignedTo) {
        const userKey = order.assignedTo.toString();
        if (!acc[userKey]) {
          acc[userKey] = { totalSales: 0, numberOfOrders: 0 };
        }
        acc[userKey].totalSales += order.totalAmount ?? 0;
        acc[userKey].numberOfOrders += 1;
      }
      return acc;
    }, {});

    for (const userId of Object.keys(userHours)) {
      const hours = userHours[userId] || 0;
      const salesData = userSales[userId] || {
        totalSales: 0,
        numberOfOrders: 0,
      };

      const kpiData = {
        userId: new Types.ObjectId(userId),
        tenantId: tenantObjectId,
        date: startOfYesterday,
        totalSales: salesData.totalSales,
        numberOfOrders: salesData.numberOfOrders,
        totalHoursWorked: hours,
        salesPerHour: hours > 0 ? salesData.totalSales / hours : 0,
      };

      await this.kpiModel
        .findOneAndUpdate(
          {
            userId: kpiData.userId,
            tenantId: tenantObjectId,
            date: startOfYesterday,
          },
          kpiData,
          { upsert: true, new: true },
        )
        .exec();
    }

    this.logger.log(
      `Finished calculating KPIs for tenant: ${tenantObjectId.toHexString()}`,
    );
  }

  async getPerformanceKpis(tenantId: string, date: Date) {
    const { objectId: tenantObjectId } =
      this.normalizeTenantIdentifiers(tenantId);
    this.logger.log(
      `Getting REAL-TIME performance KPIs for tenant ${tenantObjectId.toHexString()} for date ${date.toISOString()}`,
    );

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const shifts = await this.shiftModel
      .find({
        tenantId: tenantObjectId,
        clockOut: { $gte: startOfDay, $lte: endOfDay },
      })
      .lean();

    if (!shifts.length) {
      this.logger.log(
        `No shifts found for tenant ${tenantObjectId} for the date. Returning empty.`,
      );
      return [];
    }

    const userHours = shifts.reduce<Record<string, number>>((acc, shift) => {
      const userId = shift.userId.toString();
      acc[userId] = (acc[userId] || 0) + (shift.durationInHours ?? 0);
      return acc;
    }, {});

    const userIds = Object.keys(userHours).map((id) => new Types.ObjectId(id));

    const orders = await this.orderModel
      .find({
        tenantId: tenantObjectId,
        status: "delivered",
        confirmedAt: { $gte: startOfDay, $lte: endOfDay },
        assignedTo: { $in: userIds },
      })
      .lean();

    const userSales = orders.reduce<
      Record<string, { totalSales: number; numberOfOrders: number }>
    >((acc, order) => {
      if (order.assignedTo) {
        const userId = order.assignedTo.toString();
        if (!acc[userId]) {
          acc[userId] = { totalSales: 0, numberOfOrders: 0 };
        }
        acc[userId].totalSales += order.totalAmount ?? 0;
        acc[userId].numberOfOrders += 1;
      }
      return acc;
    }, {});

    const users = await this.userModel
      .find({ _id: { $in: userIds } })
      .select("firstName lastName")
      .lean();
    const userMap = new Map(
      users.map((u) => [
        u._id.toString(),
        `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim(),
      ]),
    );

    return Object.keys(userHours).map((userId) => {
      const hours = userHours[userId] || 0;
      const salesData = userSales[userId] || {
        totalSales: 0,
        numberOfOrders: 0,
      };
      return {
        userId,
        userName: userMap.get(userId) || "Usuario Desconocido",
        totalSales: salesData.totalSales,
        numberOfOrders: salesData.numberOfOrders,
        totalHoursWorked: hours,
        salesPerHour: hours > 0 ? salesData.totalSales / hours : 0,
      };
    });
  }

  async getPerformanceSummary(tenantId: string, period?: string) {
    this.ensureFeature(
      "DASHBOARD_CHARTS",
      "Performance summary feature disabled",
    );
    const { objectId: tenantObjectId } =
      this.normalizeTenantIdentifiers(tenantId);
    const { from, to } = this.buildDateRange(period);

    const summary = await this.kpiModel
      .aggregate([
        {
          $match: {
            tenantId: tenantObjectId,
            date: { $gte: from, $lte: to },
          },
        },
        {
          $group: {
            _id: "$userId",
            totalSales: { $sum: "$totalSales" },
            numberOfOrders: { $sum: "$numberOfOrders" },
            totalHoursWorked: { $sum: "$totalHoursWorked" },
          },
        },
        { $sort: { totalSales: -1 } },
        { $limit: 12 },
      ])
      .exec();

    if (!summary.length) {
      return [];
    }

    const userIds = summary.map((row) => row._id).filter((id) => !!id);
    const users = await this.userModel
      .find({ _id: { $in: userIds } })
      .select("firstName lastName")
      .lean();
    const userMap = new Map(
      users.map((u) => [
        u._id.toString(),
        `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim(),
      ]),
    );

    return summary.map((row) => {
      const totalHours = row.totalHoursWorked ?? 0;
      const totalSales = row.totalSales ?? 0;
      return {
        userId: row._id?.toString() ?? "unknown",
        userName: userMap.get(row._id?.toString() ?? "") || "Usuario",
        totalSales,
        numberOfOrders: row.numberOfOrders ?? 0,
        totalHoursWorked: totalHours,
        salesPerHour: totalHours > 0 ? totalSales / totalHours : 0,
      };
    });
  }

  async getSalesTrend(tenantId: string, period?: string) {
    this.ensureFeature("DASHBOARD_CHARTS", "Dashboard charts feature disabled");
    const { key: tenantKey } = this.normalizeTenantIdentifiers(tenantId);
    const { from, to, groupBy } = this.buildDateRange(period);

    const dateProjection =
      groupBy === "day"
        ? {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
              timezone: "UTC",
            },
          }
        : {
            $dateToString: {
              format: "%Y-%m",
              date: "$createdAt",
              timezone: "UTC",
            },
          };

    const matchStage = {
      tenantId: tenantKey,
      status: { $nin: ["draft", "cancelled", "refunded"] },
      createdAt: { $gte: from, $lte: to },
    };

    const trend = await this.orderModel
      .aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: dateProjection,
            totalAmount: { $sum: "$totalAmount" },
            orderCount: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .exec();

    const categories = await this.orderModel
      .aggregate([
        { $match: matchStage },
        { $unwind: "$items" },
        {
          $lookup: {
            from: this.productModel.collection.name,
            localField: "items.productId",
            foreignField: "_id",
            as: "productInfo",
          },
        },
        { $unwind: { path: "$productInfo", preserveNullAndEmptyArrays: true } },
        // Unwind the category array to handle multiple categories per product
        {
          $unwind: {
            path: "$productInfo.category",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $group: {
            _id: {
              $ifNull: ["$productInfo.category", "$items.productName"],
            },
            totalAmount: {
              // Use totalPrice directly (already includes quantity * unitPrice)
              // If finalPrice exists and is > 0, use it, otherwise use totalPrice
              $sum: {
                $cond: [
                  { $gt: ["$items.finalPrice", 0] },
                  "$items.finalPrice",
                  "$items.totalPrice",
                ],
              },
            },
          },
        },
        { $sort: { totalAmount: -1 } },
        { $limit: 6 },
      ])
      .exec();

    const [currentTotals] = await this.orderModel
      .aggregate([
        { $match: matchStage },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ])
      .exec();

    const previousRange = this.shiftRange(from, to);
    const [previousTotals] = await this.orderModel
      .aggregate([
        {
          $match: {
            tenantId: tenantKey,
            status: { $nin: ["draft", "cancelled", "refunded"] },
            createdAt: { $gte: previousRange.from, $lte: previousRange.to },
          },
        },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ])
      .exec();

    return {
      trend: trend.map((item) => ({
        date: item._id,
        totalAmount: item.totalAmount ?? 0,
        orderCount: item.orderCount ?? 0,
      })),
      categories: categories.map((item) => ({
        name: item._id ?? "Sin categoría",
        totalAmount: item.totalAmount ?? 0,
      })),
      comparison: {
        current: currentTotals?.total ?? 0,
        previous: previousTotals?.total ?? 0,
        delta: (currentTotals?.total ?? 0) - (previousTotals?.total ?? 0),
      },
    };
  }

  async getInventoryStatus(tenantId: string, period?: string) {
    this.ensureFeature("DASHBOARD_CHARTS", "Dashboard charts feature disabled");
    const { objectId: tenantObjectId, key: tenantKey } =
      this.normalizeTenantIdentifiers(tenantId);
    const { from, to } = this.buildDateRange(period);

    const stockLevels = await this.inventoryModel
      .aggregate([
        { $match: { tenantId: tenantObjectId } },
        {
          $group: {
            _id: {
              $switch: {
                branches: [
                  { case: { $eq: ["$alerts.lowStock", true] }, then: "Bajo" },
                  { case: { $eq: ["$alerts.overstock", true] }, then: "Alto" },
                ],
                default: "Saludable",
              },
            },
            count: { $sum: 1 },
          },
        },
      ])
      .exec();

    const movement = await this.inventoryMovementModel
      .aggregate([
        {
          $match: {
            tenantId: tenantObjectId,
            createdAt: { $gte: from, $lte: to },
            movementType: { $in: ["in", "out"] },
          },
        },
        {
          $group: {
            _id: "$movementType",
            total: { $sum: "$quantity" },
          },
        },
      ])
      .exec();

    const rotation = await this.orderModel
      .aggregate([
        {
          $match: {
            tenantId: tenantKey,
            status: { $nin: ["draft", "cancelled", "refunded"] },
            createdAt: { $gte: from, $lte: to },
          },
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.productId",
            productName: { $last: "$items.productName" },
            unitsSold: { $sum: "$items.quantity" },
            totalRevenue: {
              $sum: {
                $ifNull: ["$items.finalPrice", "$items.totalPrice"],
              },
            },
          },
        },
        { $sort: { unitsSold: -1 } },
        { $limit: 10 },
      ])
      .exec();

    const tenantDoc = await this.tenantModel
      .findById(tenantObjectId)
      .select("verticalProfile")
      .lean();
    const verticalProfile = getVerticalProfile(
      tenantDoc?.verticalProfile?.key,
      tenantDoc?.verticalProfile?.overrides,
    );
    const inventoryAttributeSchema = verticalProfile.attributeSchema.filter(
      (attr) => attr.scope === "inventory",
    );
    const salesAttributeSchema = verticalProfile.attributeSchema.filter((attr) =>
      ["product", "variant"].includes(attr.scope),
    );

    let attributeCombinations: Array<Record<string, any>> = [];
    if (inventoryAttributeSchema.length) {
      const combinationDocs = await this.inventoryModel
        .aggregate([
          {
            $match: {
              tenantId: tenantObjectId,
              attributeCombinations: { $exists: true, $ne: [] },
            },
          },
          { $unwind: "$attributeCombinations" },
          {
            $project: {
              productId: "$productId",
              productSku: "$productSku",
              productName: "$productName",
              variantSku: {
                $ifNull: [
                  "$variantSku",
                  "$attributeCombinations.attributes.variantSku",
                ],
              },
              combination: "$attributeCombinations",
            },
          },
          {
            $lookup: {
              from: "products",
              localField: "productId",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $unwind: {
              path: "$product",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $project: {
              productId: { $toString: "$productId" },
              productSku: 1,
              productName: {
                $ifNull: ["$productName", "$product.name", "Sin nombre"],
              },
              brand: "$product.brand",
              category: "$product.category",
              variantSku: 1,
              attributes: "$combination.attributes",
              totalQuantity: "$combination.totalQuantity",
              availableQuantity: {
                $ifNull: [
                  "$combination.availableQuantity",
                  {
                    $max: [
                      0,
                      {
                        $subtract: [
                          "$combination.totalQuantity",
                          {
                            $add: [
                              { $ifNull: ["$combination.reservedQuantity", 0] },
                              { $ifNull: ["$combination.committedQuantity", 0] },
                            ],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
              reservedQuantity: {
                $ifNull: ["$combination.reservedQuantity", 0],
              },
              committedQuantity: {
                $ifNull: ["$combination.committedQuantity", 0],
              },
              averageCostPrice: "$combination.averageCostPrice",
            },
          },
          { $sort: { availableQuantity: -1, totalQuantity: -1 } },
          { $limit: 50 },
        ])
        .exec();

      attributeCombinations = combinationDocs.map((doc) => {
        const cleanedAttributes = { ...(doc.attributes || {}) };
        if (cleanedAttributes.variantSku) {
          delete cleanedAttributes.variantSku;
        }

        return {
          productId: doc.productId,
          productSku: doc.productSku,
          productName: doc.productName,
          brand: doc.brand,
          category: doc.category,
          variantSku: doc.variantSku || null,
          attributes: cleanedAttributes,
          totalQuantity: doc.totalQuantity ?? 0,
          availableQuantity: doc.availableQuantity ?? 0,
          reservedQuantity: doc.reservedQuantity ?? 0,
          committedQuantity: doc.committedQuantity ?? 0,
          averageCostPrice: doc.averageCostPrice ?? 0,
        };
      });
    }

    let salesAttributeCombinations: Array<Record<string, any>> = [];
    if (salesAttributeSchema.length) {
      const attributeProjection = salesAttributeSchema.reduce(
        (acc, descriptor) => {
          acc[descriptor.key] = {
            $cond: [
              {
                $eq: [`$_id.attributes.${descriptor.key}`, "N/A"],
              },
              null,
              `$_id.attributes.${descriptor.key}`,
            ],
          };
          return acc;
        },
        {} as Record<string, any>,
      );

      const salesCombinationDocs = await this.orderModel
        .aggregate([
          {
            $match: {
              tenantId: tenantKey,
              status: { $nin: ["draft", "cancelled", "refunded"] },
              createdAt: { $gte: from, $lte: to },
            },
          },
          { $unwind: "$items" },
          {
            $project: {
              productId: "$items.productId",
              productSku: "$items.productSku",
              productName: "$items.productName",
              brand: "$items.brand",
              category: "$items.category",
              variantSku: "$items.variantSku",
              attributes: "$items.attributes",
              quantity: { $ifNull: ["$items.quantity", 0] },
              revenue: {
                $ifNull: [
                  { $ifNull: ["$items.finalPrice", "$items.totalPrice"] },
                  0,
                ],
              },
            },
          },
          {
            $group: {
              _id: {
                productId: "$productId",
                productSku: "$productSku",
                variantSku: "$variantSku",
                attributes: salesAttributeSchema.reduce((acc, descriptor) => {
                  acc[descriptor.key] = {
                    $ifNull: [
                      `$attributes.${descriptor.key}`,
                      "N/A",
                    ],
                  };
                  return acc;
                }, {} as Record<string, any>),
              },
              productName: { $last: "$productName" },
              brand: { $last: "$brand" },
              category: { $last: "$category" },
              unitsSold: { $sum: "$quantity" },
              totalRevenue: { $sum: "$revenue" },
            },
          },
          {
            $project: {
              productId: { $toString: "$_id.productId" },
              productSku: "$_id.productSku",
              variantSku: "$_id.variantSku",
              productName: 1,
              brand: 1,
              category: 1,
              unitsSold: 1,
              totalRevenue: 1,
              attributes: attributeProjection,
            },
          },
          { $sort: { totalRevenue: -1, unitsSold: -1 } },
          { $limit: 50 },
        ])
        .exec();

      salesAttributeCombinations = salesCombinationDocs.map((doc) => {
        const normalizedAttributes = { ...(doc.attributes || {}) };
        Object.keys(normalizedAttributes).forEach((key) => {
          if (normalizedAttributes[key] === "N/A") {
            normalizedAttributes[key] = null;
          }
        });

        return {
          productId: doc.productId,
          productSku: doc.productSku,
          productName: doc.productName,
          brand: doc.brand,
          category: doc.category,
          variantSku: doc.variantSku || null,
          attributes: normalizedAttributes,
          unitsSold: doc.unitsSold ?? 0,
          totalRevenue: doc.totalRevenue ?? 0,
        };
      });
    }

    return {
      status: stockLevels.map((item) => ({
        label: item._id ?? "Sin datos",
        count: item.count ?? 0,
      })),
      movement: movement.map((item) => ({
        type: item._id,
        total: item.total ?? 0,
      })),
      rotation: rotation.map((item) => ({
        productId: item._id?.toString() ?? "unknown",
        productName: item.productName ?? "Producto",
        unitsSold: item.unitsSold ?? 0,
        totalRevenue: item.totalRevenue ?? 0,
      })),
      attributes: {
        schema: inventoryAttributeSchema,
        combinations: attributeCombinations,
      },
      salesAttributes: {
        schema: salesAttributeSchema,
        combinations: salesAttributeCombinations,
      },
    };
  }

  async getProfitAndLoss(tenantId: string, period?: string) {
    this.ensureFeature("ADVANCED_REPORTS", "Advanced reports feature disabled");
    const { objectId: tenantObjectId, key: tenantKey } =
      this.normalizeTenantIdentifiers(tenantId);
    const { from, to, groupBy } = this.buildDateRange(period);

    const format = groupBy === "day" ? "%Y-%m-%d" : "%Y-%m";

    const revenues = await this.orderModel
      .aggregate([
        {
          $match: {
            tenantId: tenantKey,
            status: { $nin: ["draft", "cancelled", "refunded"] },
            createdAt: { $gte: from, $lte: to },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format, date: "$createdAt", timezone: "UTC" },
            },
            total: { $sum: "$totalAmount" },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .exec();

    const expenses = await this.payableModel
      .aggregate([
        {
          $match: {
            tenantId: tenantKey,
            status: { $in: ["open", "partially_paid", "paid"] },
            issueDate: { $gte: from, $lte: to },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format, date: "$issueDate", timezone: "UTC" },
            },
            total: { $sum: "$totalAmount" },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .exec();

    const revenueTotal = revenues.reduce(
      (acc, item) => acc + (item.total ?? 0),
      0,
    );
    const expenseTotal = expenses.reduce(
      (acc, item) => acc + (item.total ?? 0),
      0,
    );

    return {
      revenues: revenues.map((item) => ({
        period: item._id,
        total: item.total ?? 0,
      })),
      expenses: expenses.map((item) => ({
        period: item._id,
        total: item.total ?? 0,
      })),
      summary: {
        revenueTotal,
        expenseTotal,
        netIncome: revenueTotal - expenseTotal,
      },
    };
  }

  async getCustomerSegmentation(tenantId: string, limit = 100) {
    this.ensureFeature("ADVANCED_REPORTS", "Advanced reports feature disabled");
    const { key: tenantKey } = this.normalizeTenantIdentifiers(tenantId);

    const now = new Date();
    const segmentation = await this.orderModel
      .aggregate([
        {
          $match: {
            tenantId: tenantKey,
            status: { $nin: ["draft", "cancelled", "refunded"] },
          },
        },
        {
          $group: {
            _id: "$customerId",
            customerName: { $last: "$customerName" },
            lastPurchase: { $max: "$createdAt" },
            frequency: { $sum: 1 },
            monetary: { $sum: "$totalAmount" },
          },
        },
        { $sort: { monetary: -1 } },
        { $limit: limit },
      ])
      .exec();

    return segmentation.map((item) => {
      const recencyDays = item.lastPurchase
        ? Math.ceil((now.getTime() - item.lastPurchase.getTime()) / 86400000)
        : null;
      return {
        customerId: item._id?.toString() ?? "unknown",
        customerName: item.customerName ?? "Cliente",
        recencyDays: recencyDays ?? 999,
        frequency: item.frequency ?? 0,
        monetary: item.monetary ?? 0,
      };
    });
  }

  async getHospitalityOperations(
    tenantId: string,
    params: { startDate?: string; endDate?: string; granularity?: "day" | "week" },
  ) {
    const { objectId, key: tenantKey } =
      this.normalizeTenantIdentifiers(tenantId);

    const now = new Date();
    const start = params?.startDate ? new Date(params.startDate) : new Date(now);
    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException("Invalid startDate provided");
    }

    const end = params?.endDate ? new Date(params.endDate) : new Date(now);
    if (Number.isNaN(end.getTime())) {
      throw new BadRequestException("Invalid endDate provided");
    }

    if (start.getTime() > end.getTime()) {
      const swap = new Date(start);
      start.setTime(end.getTime());
      end.setTime(swap.getTime());
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    const tenantVariants: Array<string | Types.ObjectId> = [
      tenantId,
      tenantKey,
      objectId,
    ];

    const appointments = await this.appointmentModel
      .find({
        tenantId: { $in: tenantVariants },
        startTime: { $gte: start, $lte: end },
      })
      .select(
        "startTime endTime status resourceId serviceId capacity capacityUsed addons paidAmount paymentStatus metadata depositRecords",
      )
      .lean();

    const serviceIds = Array.from(
      new Set(
        appointments
          .map((item) => item.serviceId?.toString())
          .filter(Boolean) as string[],
      ),
    );

    const resourceIds = Array.from(
      new Set(
        appointments
          .map((item) => item.resourceId?.toString())
          .filter(Boolean) as string[],
      ),
    );

    const services = await this.serviceModel
      .find({ _id: { $in: serviceIds } })
      .select("serviceType name metadata")
      .lean();
    const resources = await this.resourceModel
      .find({ _id: { $in: resourceIds } })
      .select("type name status")
      .lean();

    const roomResourceIds = new Set(
      resources
        .filter((resource) => resource.type === "room")
        .map((resource) => resource._id.toString()),
    );
    const spaServiceIds = new Set(
      services
        .filter((service) =>
          ["spa", "wellness", "experience"].includes(
            (service.serviceType || "").toLowerCase(),
          ),
        )
        .map((service) => service._id.toString()),
    );

    const activeRooms = await this.resourceModel.countDocuments({
      tenantId: { $in: tenantVariants },
      type: "room",
      status: "active",
    });

    const dayCount =
      Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86400000) + 1);

    const roomOccupancyByDay = new Map<string, Set<string>>();
    const spaCountByDay = new Map<string, number>();
    const revenueByDay = new Map<string, number>();
    const addonsByDay = new Map<string, number>();
    const noShowByDay = new Map<string, number>();

    let addonsRevenue = 0;
    let recoveredRevenue = 0;
    let pendingDeposits = 0;
    let remindersSent = 0;
    let attendedCount = 0;
    let packageRevenue = 0;
    let packageCount = 0;

    appointments.forEach((appointment) => {
      const dayKey = this.buildDayKey(appointment.startTime);
      const isActive = !["cancelled", "no_show"].includes(
        (appointment.status || "").toLowerCase(),
      );

      const resourceKey = appointment.resourceId?.toString() || "";
      if (roomResourceIds.has(resourceKey) && isActive) {
        if (!roomOccupancyByDay.has(dayKey)) {
          roomOccupancyByDay.set(dayKey, new Set());
        }
        roomOccupancyByDay.get(dayKey)!.add(resourceKey);
      }

      const serviceKey = appointment.serviceId?.toString() || "";
      if (spaServiceIds.has(serviceKey) && isActive) {
        spaCountByDay.set(dayKey, (spaCountByDay.get(dayKey) || 0) + 1);
      }

      const paidAmount =
        appointment.paymentStatus === "paid"
          ? Number(appointment.paidAmount || 0)
          : 0;
      revenueByDay.set(dayKey, (revenueByDay.get(dayKey) || 0) + paidAmount);

      const addonsTotal = (appointment.addons || []).reduce(
        (sum, addon) => sum + (addon.price || 0) * (addon.quantity || 1),
        0,
      );
      addonsRevenue += addonsTotal;
      addonsByDay.set(dayKey, (addonsByDay.get(dayKey) || 0) + addonsTotal);

      const depositRecords = appointment.depositRecords || [];
      depositRecords.forEach((record) => {
        if (["requested", "submitted"].includes(record.status)) {
          pendingDeposits += 1;
        }
        if (record.status === "confirmed") {
          recoveredRevenue += Number(record.amount || 0);
        }
      });

      const reminderHistory =
        Array.isArray(appointment.metadata?.reminderHistory)
          ? appointment.metadata.reminderHistory
          : [];
      remindersSent += reminderHistory.length;

      if (isActive) {
        attendedCount += 1;
      }

      if (appointment.metadata?.servicePackageId) {
        packageCount += 1;
        if (appointment.metadata.packageAmount) {
          packageRevenue += Number(appointment.metadata.packageAmount) || 0;
        }
      }

      if (appointment.status === "no_show") {
        noShowByDay.set(dayKey, (noShowByDay.get(dayKey) || 0) + 1);
      }
    });

    const occupiedRoomNights = Array.from(roomOccupancyByDay.values()).reduce(
      (sum, item) => sum + item.size,
      0,
    );
    const totalRoomCapacity = activeRooms * dayCount || 1;
    const occupancyRate = occupiedRoomNights / totalRoomCapacity;

    const totalSpaCapacity = spaServiceIds.size * dayCount || 1;
    const spaUtilization =
      Array.from(spaCountByDay.values()).reduce((sum, value) => sum + value, 0) /
      totalSpaCapacity;

    const upsellConversionRate = appointments.length
      ? appointments.filter((item) => (item.addons || []).length > 0).length /
        appointments.length
      : 0;

    const reminderEffectiveness = remindersSent
      ? attendedCount / remindersSent
      : null;

    const vipGuests = await this.customerModel.countDocuments({
      tenantId: tenantKey,
      "segments.name": "VIP",
    });

    const communicationSnapshot = await this.customerModel.aggregate([
      {
        $match: {
          tenantId: tenantKey,
        },
      },
      {
        $group: {
          _id: null,
          touchpoints: {
            $sum: {
              $ifNull: ["$metrics.communicationTouchpoints", 0],
            },
          },
          engaged: {
            $sum: {
              $cond: [
                { $gte: ["$metrics.engagementScore", 80] },
                1,
                0,
              ],
            },
          },
          total: { $sum: 1 },
        },
      },
    ]);

    const communicationSummary = communicationSnapshot?.[0] || {
      touchpoints: 0,
      engaged: 0,
      total: 0,
    };

    const timeSeries: Array<{
      date: string;
      occupancyRate: number;
      spaUtilization: number;
      revenue: number;
      addonsRevenue: number;
      noShows: number;
    }> = [];

    for (let dayIndex = 0; dayIndex < dayCount; dayIndex += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + dayIndex);
      const key = this.buildDayKey(date);
      const occupiedRooms = roomOccupancyByDay.get(key)?.size || 0;
      const spaCount = spaCountByDay.get(key) || 0;
      timeSeries.push({
        date: key,
        occupancyRate: activeRooms > 0 ? occupiedRooms / activeRooms : 0,
        spaUtilization:
          spaServiceIds.size > 0 ? spaCount / spaServiceIds.size : 0,
        revenue: revenueByDay.get(key) || 0,
        addonsRevenue: addonsByDay.get(key) || 0,
        noShows: noShowByDay.get(key) || 0,
      });
    }

    const floorPlan = resources
      .filter((resource) => resource.type === "room")
      .map((resource) => this.resolveRoomStatus(resource, appointments));

    return {
      range: {
        from: start.toISOString(),
        to: end.toISOString(),
        days: dayCount,
      },
      kpis: {
        occupancyRate,
        spaUtilization,
        addonsRevenue,
        recoveredRevenue,
        pendingDeposits,
        upsellConversionRate,
        reminderEffectiveness,
        vipGuests,
        communicationTouchpoints: communicationSummary.touchpoints,
        highlyEngagedCustomers: communicationSummary.engaged,
        totalCustomers: communicationSummary.total,
        packagesSold: packageCount,
        packageRevenue,
      },
      floorPlan,
      timeSeries,
    };
  }

  private buildDayKey(value: Date | string): string {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      return new Date().toISOString().slice(0, 10);
    }
    return date.toISOString().slice(0, 10);
  }

  private resolveRoomStatus(
    resource: { _id: Types.ObjectId | string; name: string },
    appointments: Array<{
      resourceId?: unknown;
      status?: string;
      startTime: Date | string;
      endTime: Date | string;
      customerName?: string;
      metadata?: Record<string, any>;
    }>,
  ) {
    const resourceId =
      resource._id instanceof Types.ObjectId
        ? resource._id.toHexString()
        : resource._id.toString();

    const related = appointments.filter((appointment) => {
      if (!appointment.resourceId) {
        return false;
      }
      const appointmentResourceId = this.normalizeObjectId(
        appointment.resourceId,
      );
      if (!appointmentResourceId) {
        return false;
      }
      return (
        appointmentResourceId === resourceId &&
        !["cancelled", "no_show"].includes(
          (appointment.status || "").toLowerCase(),
        )
      );
    });

    const now = new Date();
    let status: "available" | "occupied" | "upcoming" = "available";
    let currentGuest: string | null = null;
    let nextCheckIn: string | null = null;

    related.forEach((appointment) => {
      const start =
        appointment.startTime instanceof Date
          ? appointment.startTime
          : new Date(appointment.startTime);
      const end =
        appointment.endTime instanceof Date
          ? appointment.endTime
          : new Date(appointment.endTime);

      if (start <= now && end >= now) {
        status = "occupied";
        currentGuest =
          appointment.metadata?.contactDetails?.name ||
          appointment.customerName ||
          currentGuest;
      } else if (start > now) {
        if (!nextCheckIn || new Date(nextCheckIn) > start) {
          nextCheckIn = start.toISOString();
        }
        if (status !== "occupied") {
          status = "upcoming";
        }
      }
    });

    const hasHousekeepingTask = related.some((appointment) =>
      Boolean(appointment.metadata?.housekeepingTodoId),
    );

    return {
      id: resourceId,
      name: resource.name,
      status,
      currentGuest,
      nextCheckIn,
      hasHousekeepingTask,
    };
  }

  private normalizeObjectId(value: unknown): string | null {
    if (!value) {
      return null;
    }
    if (value instanceof Types.ObjectId) {
      return value.toHexString();
    }
    if (typeof (value as any)?.toHexString === "function") {
      try {
        return (value as any).toHexString();
      } catch (error) {
        this.logger.debug(
          `No se pudo convertir ObjectId con toHexString: ${(error as Error).message}`,
        );
      }
    }
    if (typeof (value as any)?.toString === "function") {
      const asString = (value as any).toString();
      if (asString && asString !== "[object Object]") {
        return asString;
      }
    }
    return null;
  }

  private ensureObjectId(
    id: string | Types.ObjectId,
    resource: string = "tenant",
  ): Types.ObjectId {
    if (id instanceof Types.ObjectId) {
      return id;
    }

    if (typeof id === "string" && Types.ObjectId.isValid(id)) {
      return new Types.ObjectId(id);
    }

    throw new BadRequestException(`Invalid ${resource} id received`);
  }

  private ensureFeature(feature: keyof FeatureFlags, message: string): void {
    if (!FEATURES[feature]) {
      throw new ForbiddenException(message);
    }
  }

  private buildDateRange(period?: string): DateRange {
    const selected = period && SUPPORTED_PERIODS.has(period) ? period : "30d";
    const amount = parseInt(selected.replace("d", ""), 10);

    const to = new Date();
    to.setMilliseconds(999);
    to.setSeconds(59);
    to.setMinutes(59);
    to.setHours(23);

    const from = new Date(to);
    from.setDate(from.getDate() - (amount - 1));
    from.setHours(0, 0, 0, 0);

    const groupBy: "day" | "month" = amount > 90 ? "month" : "day";

    return { from, to, groupBy, period: selected };
  }

  private shiftRange(from: Date, to: Date): { from: Date; to: Date } {
    const diff = to.getTime() - from.getTime();
    const previousTo = new Date(from.getTime() - 1);
    const previousFrom = new Date(previousTo.getTime() - diff);
    return { from: previousFrom, to: previousTo };
  }

  private normalizeTenantIdentifiers(id: string | Types.ObjectId): {
    objectId: Types.ObjectId;
    key: string;
  } {
    const objectId = this.ensureObjectId(id);
    return { objectId, key: objectId.toHexString() };
  }
}
