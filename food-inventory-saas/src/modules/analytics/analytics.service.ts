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
              date: "$confirmedAt",
              timezone: "UTC",
            },
          }
        : {
            $dateToString: {
              format: "%Y-%m",
              date: "$confirmedAt",
              timezone: "UTC",
            },
          };

    const matchStage = {
      tenantId: tenantKey,
      status: "delivered",
      confirmedAt: { $gte: from, $lte: to },
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
        {
          $group: {
            _id: {
              $ifNull: ["$productInfo.category", "$items.productName"],
            },
            totalAmount: {
              $sum: {
                $ifNull: ["$items.finalPrice", "$items.totalPrice"],
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
            status: "delivered",
            confirmedAt: { $gte: previousRange.from, $lte: previousRange.to },
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
            status: "delivered",
            confirmedAt: { $gte: from, $lte: to },
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
            status: "delivered",
            confirmedAt: { $gte: from, $lte: to },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format, date: "$confirmedAt", timezone: "UTC" },
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
            status: "delivered",
          },
        },
        {
          $group: {
            _id: "$customerId",
            customerName: { $last: "$customerName" },
            lastPurchase: { $max: "$confirmedAt" },
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
