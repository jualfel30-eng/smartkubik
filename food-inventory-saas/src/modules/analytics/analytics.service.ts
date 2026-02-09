import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Model, Types } from "mongoose";
import { FeatureFlags } from "../../config/features.config";
import { FeatureFlagsService } from "../../config/feature-flags.service";
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
import {
  ChartOfAccounts,
  ChartOfAccountsDocument,
} from "../../schemas/chart-of-accounts.schema";
import {
  JournalEntry,
  JournalEntryDocument,
} from "../../schemas/journal-entry.schema";
import {
  PayrollRun,
  PayrollRunDocument,
} from "../../schemas/payroll-run.schema";
import {
  FixedAsset,
  FixedAssetDocument,
} from "../../schemas/fixed-asset.schema";
import {
  Investment,
  InvestmentDocument,
} from "../../schemas/investment.schema";
import { Payment, PaymentDocument } from "../../schemas/payment.schema";
import { MenuEngineeringService } from "../menu-engineering/menu-engineering.service";

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
    @InjectModel(ChartOfAccounts.name)
    private readonly chartOfAccountsModel: Model<ChartOfAccountsDocument>,
    @InjectModel(JournalEntry.name)
    private readonly journalEntryModel: Model<JournalEntryDocument>,
    @InjectModel(PayrollRun.name)
    private readonly payrollRunModel: Model<PayrollRunDocument>,
    @InjectModel(FixedAsset.name)
    private readonly fixedAssetModel: Model<FixedAssetDocument>,
    @InjectModel(Investment.name)
    private readonly investmentModel: Model<InvestmentDocument>,
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly menuEngineeringService: MenuEngineeringService,
  ) { }

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
      const id = shift.userId || shift.employeeId;
      if (!id) return acc;
      const userId = id.toString();
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
      const id = shift.userId || shift.employeeId;
      if (!id) return acc;
      const userId = id.toString();
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
    await this.ensureFeature(
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
    await this.ensureFeature(
      "DASHBOARD_CHARTS",
      "Dashboard charts feature disabled",
    );
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
    await this.ensureFeature(
      "DASHBOARD_CHARTS",
      "Dashboard charts feature disabled",
    );
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
    const salesAttributeSchema = verticalProfile.attributeSchema.filter(
      (attr) => ["product", "variant"].includes(attr.scope),
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
                              {
                                $ifNull: ["$combination.committedQuantity", 0],
                              },
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
                attributes: salesAttributeSchema.reduce(
                  (acc, descriptor) => {
                    acc[descriptor.key] = {
                      $ifNull: [`$attributes.${descriptor.key}`, "N/A"],
                    };
                    return acc;
                  },
                  {} as Record<string, any>,
                ),
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
    await this.ensureFeature(
      "ADVANCED_REPORTS",
      "Advanced reports feature disabled",
    );
    const { key: tenantKey } = this.normalizeTenantIdentifiers(tenantId);
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
    await this.ensureFeature(
      "ADVANCED_REPORTS",
      "Advanced reports feature disabled",
    );
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

  /**
   * QUICK WIN #3: Tips Report
   * Reporte de propinas por empleado
   */
  async getTipsReport(
    tenantId: string,
    params: { startDate?: string; endDate?: string; employeeId?: string },
  ) {
    const { key: tenantKey } = this.normalizeTenantIdentifiers(tenantId);

    // Construir rango de fechas
    let from: Date;
    let to: Date;

    if (params.startDate && params.endDate) {
      from = new Date(params.startDate);
      to = new Date(params.endDate);
    } else {
      // Por defecto: últimos 30 días
      to = new Date();
      from = new Date();
      from.setDate(from.getDate() - 30);
    }

    // Set to start and end of day
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);

    // Obtener todas las órdenes con propinas
    const ordersWithTips = await this.orderModel
      .find({
        tenantId: tenantKey,
        createdAt: { $gte: from, $lte: to },
        tipsRecords: { $exists: true, $ne: [] },
      })
      .select("orderNumber tipsRecords totalTipsAmount createdAt createdBy")
      .populate("createdBy", "name email")
      .lean()
      .exec();

    // Procesar propinas por empleado
    const tipsByEmployee = new Map<
      string,
      {
        employeeId: string;
        employeeName: string;
        totalTips: number;
        tipsCount: number;
        cashTips: number;
        cardTips: number;
        averageTip: number;
        ordersServed: number;
        tipsBreakdown: Array<{
          orderNumber: string;
          amount: number;
          method: string;
          date: Date;
        }>;
      }
    >();

    for (const order of ordersWithTips) {
      for (const tip of order.tipsRecords) {
        const empId = tip.employeeId?.toString() || "unassigned";
        const empName = tip.employeeName || "Sin asignar";

        if (!tipsByEmployee.has(empId)) {
          tipsByEmployee.set(empId, {
            employeeId: empId,
            employeeName: empName,
            totalTips: 0,
            tipsCount: 0,
            cashTips: 0,
            cardTips: 0,
            averageTip: 0,
            ordersServed: 0,
            tipsBreakdown: [],
          });
        }

        const empData = tipsByEmployee.get(empId)!;
        empData.totalTips += tip.amount;
        empData.tipsCount++;
        empData.ordersServed++;

        // Categorize tip by method (support both legacy and current format)
        const methodLower = (tip.method || '').toLowerCase();
        if (methodLower.includes('efectivo') || methodLower.includes('cash')) {
          empData.cashTips += tip.amount;
        } else if (methodLower.includes('card') || methodLower.includes('tarjeta') ||
          methodLower.includes('pos') || methodLower.includes('pago_movil') ||
          methodLower.includes('zelle') || methodLower.includes('transferencia')) {
          empData.cardTips += tip.amount;
        }

        empData.tipsBreakdown.push({
          orderNumber: order.orderNumber,
          amount: tip.amount,
          method: tip.method,
          date: order.createdAt || new Date(),
        });
      }
    }

    // Calcular promedios y convertir a array
    const tipsReport = Array.from(tipsByEmployee.values()).map((emp) => ({
      ...emp,
      averageTip: emp.tipsCount > 0 ? emp.totalTips / emp.tipsCount : 0,
      tipsBreakdown: emp.tipsBreakdown
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 10), // Últimas 10 propinas
    }));

    // Ordenar por total de propinas descendente
    tipsReport.sort((a, b) => b.totalTips - a.totalTips);

    // Calcular totales generales
    const totalTipsAllEmployees = tipsReport.reduce(
      (sum, emp) => sum + emp.totalTips,
      0,
    );
    const totalOrdersWithTips = ordersWithTips.length;
    const averageTipPerOrder =
      totalOrdersWithTips > 0 ? totalTipsAllEmployees / totalOrdersWithTips : 0;

    return {
      period: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
      summary: {
        totalTips: totalTipsAllEmployees,
        totalOrders: totalOrdersWithTips,
        averageTipPerOrder,
        employeesCount: tipsReport.length,
      },
      employees: tipsReport,
    };
  }

  /**
   * QUICK WIN #4: Menu Engineering
   * Matriz de análisis de menú (Popularidad vs Rentabilidad)
   */
  async getMenuEngineering(tenantId: string, period?: string) {
    // Delegate to MenuEngineeringService
    return this.menuEngineeringService.analyze(
      { period: period || "30d" },
      tenantId,
    );
  }

  /**
   * @deprecated This method is replaced by MenuEngineeringService
   */
  async getMenuEngineeringOld(tenantId: string, period?: string) {
    const { key: tenantKey } = this.normalizeTenantIdentifiers(tenantId);
    const { from, to } = this.buildDateRange(period);

    // Obtener todas las órdenes del período
    const orders = await this.orderModel
      .find({
        tenantId: tenantKey,
        status: { $nin: ["draft", "cancelled", "refunded"] },
        createdAt: { $gte: from, $lte: to },
      })
      .select("items totalAmount createdAt")
      .lean()
      .exec();

    if (!orders.length) {
      return {
        period: {
          from: from.toISOString(),
          to: to.toISOString(),
          label: period || "30d",
        },
        categories: {
          stars: [],
          plowhorses: [],
          puzzles: [],
          dogs: [],
        },
        summary: {
          totalItems: 0,
          avgPopularity: 0,
          avgProfitability: 0,
        },
      };
    }

    // Agregar datos por producto
    const productStats = new Map<
      string,
      {
        productId: string;
        productName: string;
        quantitySold: number;
        revenue: number;
        cost: number;
        orders: number;
      }
    >();

    for (const order of orders) {
      for (const item of order.items) {
        const key = item.productId?.toString() || item.productName;
        if (!productStats.has(key)) {
          productStats.set(key, {
            productId: key,
            productName: item.productName,
            quantitySold: 0,
            revenue: 0,
            cost: 0,
            orders: 0,
          });
        }

        const stats = productStats.get(key)!;
        stats.quantitySold += item.quantity || 0;
        stats.revenue += item.finalPrice || item.totalPrice || 0;
        // Usar costPrice del item si existe
        stats.cost += (item.costPrice || 0) * (item.quantity || 0);
        stats.orders++;
      }
    }

    // Calcular métricas por producto
    const products = Array.from(productStats.values()).map((p) => ({
      ...p,
      contributionMargin: p.revenue - p.cost,
      contributionMarginPercent:
        p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue) * 100 : 0,
      avgPrice: p.quantitySold > 0 ? p.revenue / p.quantitySold : 0,
      popularity: p.quantitySold,
      profitability: p.revenue - p.cost,
    }));

    // Calcular promedios para clasificación
    const totalQuantity = products.reduce((sum, p) => sum + p.quantitySold, 0);
    const avgQuantity = totalQuantity / products.length;

    const totalProfitability = products.reduce(
      (sum, p) => sum + p.profitability,
      0,
    );
    const avgProfitability = totalProfitability / products.length;

    // Clasificar productos
    const stars = products.filter(
      (p) => p.popularity >= avgQuantity && p.profitability >= avgProfitability,
    );
    const plowhorses = products.filter(
      (p) => p.popularity >= avgQuantity && p.profitability < avgProfitability,
    );
    const puzzles = products.filter(
      (p) => p.popularity < avgQuantity && p.profitability >= avgProfitability,
    );
    const dogs = products.filter(
      (p) => p.popularity < avgQuantity && p.profitability < avgProfitability,
    );

    return {
      period: {
        from: from.toISOString(),
        to: to.toISOString(),
        label: period || "30d",
      },
      categories: {
        stars: stars
          .sort((a, b) => b.profitability - a.profitability)
          .map((p) => ({
            productId: p.productId,
            productName: p.productName,
            quantitySold: p.quantitySold,
            revenue: p.revenue,
            cost: p.cost,
            contributionMargin: p.contributionMargin,
            contributionMarginPercent: Number(
              p.contributionMarginPercent.toFixed(2),
            ),
            avgPrice: Number(p.avgPrice.toFixed(2)),
            category: "star" as const,
            recommendation:
              "¡Platillo estrella! Mantén calidad, considera aumentar ligeramente el precio.",
          })),
        plowhorses: plowhorses
          .sort((a, b) => b.popularity - a.popularity)
          .map((p) => ({
            productId: p.productId,
            productName: p.productName,
            quantitySold: p.quantitySold,
            revenue: p.revenue,
            cost: p.cost,
            contributionMargin: p.contributionMargin,
            contributionMarginPercent: Number(
              p.contributionMarginPercent.toFixed(2),
            ),
            avgPrice: Number(p.avgPrice.toFixed(2)),
            category: "plowhorse" as const,
            recommendation:
              "Popular pero poco rentable. Aumenta precio o reduce costo de ingredientes.",
          })),
        puzzles: puzzles
          .sort((a, b) => b.profitability - a.profitability)
          .map((p) => ({
            productId: p.productId,
            productName: p.productName,
            quantitySold: p.quantitySold,
            revenue: p.revenue,
            cost: p.cost,
            contributionMargin: p.contributionMargin,
            contributionMarginPercent: Number(
              p.contributionMarginPercent.toFixed(2),
            ),
            avgPrice: Number(p.avgPrice.toFixed(2)),
            category: "puzzle" as const,
            recommendation:
              "Rentable pero poco popular. Mejora posicionamiento en menú o marketing.",
          })),
        dogs: dogs
          .sort((a, b) => a.profitability - b.profitability)
          .map((p) => ({
            productId: p.productId,
            productName: p.productName,
            quantitySold: p.quantitySold,
            revenue: p.revenue,
            cost: p.cost,
            contributionMargin: p.contributionMargin,
            contributionMarginPercent: Number(
              p.contributionMarginPercent.toFixed(2),
            ),
            avgPrice: Number(p.avgPrice.toFixed(2)),
            category: "dog" as const,
            recommendation:
              "Ni popular ni rentable. Considera eliminar del menú o reformular completamente.",
          })),
      },
      summary: {
        totalItems: products.length,
        avgPopularity: Number(avgQuantity.toFixed(2)),
        avgProfitability: Number(avgProfitability.toFixed(2)),
        totalRevenue: products.reduce((sum, p) => sum + p.revenue, 0),
        totalCost: products.reduce((sum, p) => sum + p.cost, 0),
        totalContributionMargin: products.reduce(
          (sum, p) => sum + p.contributionMargin,
          0,
        ),
      },
      metrics: {
        starsCount: stars.length,
        plowhorsesCount: plowhorses.length,
        puzzlesCount: puzzles.length,
        dogsCount: dogs.length,
        starsRevenue: stars.reduce((sum, p) => sum + p.revenue, 0),
        plowhorsesRevenue: plowhorses.reduce((sum, p) => sum + p.revenue, 0),
        puzzlesRevenue: puzzles.reduce((sum, p) => sum + p.revenue, 0),
        dogsRevenue: dogs.reduce((sum, p) => sum + p.revenue, 0),
      },
    };
  }

  /**
   * QUICK WIN: Food Cost Percentage
   * KPI #1 para restaurantes
   * Food Cost% = (Costo de ingredientes / Ventas) × 100
   */
  async getFoodCost(tenantId: string, period?: string) {
    const { objectId: tenantObjectId, key: tenantKey } =
      this.normalizeTenantIdentifiers(tenantId);
    const { from, to } = this.buildDateRange(period);

    // 1. Obtener ventas del período
    const [salesResult] = await this.orderModel
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
            _id: null,
            totalSales: { $sum: "$totalAmount" },
            orderCount: { $sum: 1 },
          },
        },
      ])
      .exec();

    const totalSales = salesResult?.totalSales ?? 0;
    const orderCount = salesResult?.orderCount ?? 0;

    // 2. Obtener costo de ingredientes consumidos
    // Movimientos de tipo 'out' con razón 'sale' o 'consumption'
    const movements = await this.inventoryMovementModel
      .aggregate([
        {
          $match: {
            tenantId: tenantObjectId,
            createdAt: { $gte: from, $lte: to },
            movementType: "out",
            reason: { $in: ["sale", "consumption", "production"] },
          },
        },
        {
          $group: {
            _id: null,
            totalCost: {
              $sum: {
                $multiply: ["$quantity", "$costPrice"],
              },
            },
            totalQuantity: { $sum: "$quantity" },
            movementCount: { $sum: 1 },
          },
        },
      ])
      .exec();

    const totalCost = movements[0]?.totalCost ?? 0;
    const totalQuantity = movements[0]?.totalQuantity ?? 0;
    const movementCount = movements[0]?.movementCount ?? 0;

    // 3. Calcular Food Cost %
    const foodCostPercentage =
      totalSales > 0 ? (totalCost / totalSales) * 100 : 0;

    // 4. Determinar status (bueno/warning/danger)
    // Benchmark ideal: 28-32%
    let status: "good" | "warning" | "danger";
    if (foodCostPercentage <= 32) {
      status = "good";
    } else if (foodCostPercentage <= 35) {
      status = "warning";
    } else {
      status = "danger";
    }

    // 5. Calcular varianza vs benchmark (30%)
    const benchmark = 30;
    const variance = foodCostPercentage - benchmark;

    return {
      period: {
        from: from.toISOString(),
        to: to.toISOString(),
        label: period || "30d",
      },
      totalSales,
      totalCost,
      foodCostPercentage: Number(foodCostPercentage.toFixed(2)),
      status,
      benchmark,
      variance: Number(variance.toFixed(2)),
      metrics: {
        orderCount,
        movementCount,
        totalQuantity,
        averageCostPerOrder: orderCount > 0 ? totalCost / orderCount : 0,
      },
    };
  }

  async getHospitalityOperations(
    tenantId: string,
    params: {
      startDate?: string;
      endDate?: string;
      granularity?: "day" | "week";
    },
  ) {
    const { objectId, key: tenantKey } =
      this.normalizeTenantIdentifiers(tenantId);

    const now = new Date();
    const start = params?.startDate
      ? new Date(params.startDate)
      : new Date(now);
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

    const dayCount = Math.max(
      1,
      Math.floor((end.getTime() - start.getTime()) / 86400000) + 1,
    );

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

      const reminderHistory = Array.isArray(
        appointment.metadata?.reminderHistory,
      )
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
      Array.from(spaCountByDay.values()).reduce(
        (sum, value) => sum + value,
        0,
      ) / totalSpaCapacity;

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
              $cond: [{ $gte: ["$metrics.engagementScore", 80] }, 1, 0],
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

  // ──────────────────────────────────────────────────────────────────
  // FINANCIAL KPIs  –  Single endpoint returning all 10 business KPIs
  // ──────────────────────────────────────────────────────────────────

  async getFinancialKpis(
    tenantId: string,
    period?: string,
    compare = false,
    fromDate?: Date,
    toDate?: Date,
  ) {
    const { objectId: tenantObjectId, key: tenantKey } =
      this.normalizeTenantIdentifiers(tenantId);

    let from: Date;
    let to: Date;
    let groupBy: "day" | "month";
    if (fromDate && toDate) {
      from = fromDate;
      to = toDate;
      const diffDays = Math.ceil(
        (to.getTime() - from.getTime()) / 86400000,
      );
      groupBy = diffDays > 90 ? "month" : "day";
    } else {
      const range = this.buildDateRange(period);
      from = range.from;
      to = range.to;
      groupBy = range.groupBy;
    }
    const format = groupBy === "day" ? "%Y-%m-%d" : "%Y-%m";

    // ── Shared base queries ──────────────────────────────────────
    const orderMatch = {
      tenantId: tenantKey,
      status: { $nin: ["draft", "cancelled", "refunded"] },
      createdAt: { $gte: from, $lte: to },
    };

    const payableMatch = {
      tenantId: tenantKey,
      status: { $in: ["open", "partially_paid", "paid"] },
      issueDate: { $gte: from, $lte: to },
    };

    // Run all independent aggregations in parallel
    const [
      revenueAndCostResult,
      orderStatsResult,
      ticketTrendResult,
      expenseResult,
      payrollResult,
      inventoryComputedResult,
      receivablesResult,
      inventoryValueResult,
      pendingPayablesResult,
      fixedAssetsResult,
      investmentsResult,
      confirmedPaymentsResult,
      expensesByTypeResult,
    ] = await Promise.all([
      // 1. Revenue + direct cost from order items
      this.orderModel.aggregate([
        { $match: orderMatch },
        { $unwind: "$items" },
        {
          $group: {
            _id: null,
            totalRevenue: {
              $sum: {
                $ifNull: ["$items.finalPrice", "$items.totalPrice"],
              },
            },
            totalDirectCost: {
              $sum: {
                $multiply: [
                  { $ifNull: ["$items.costPrice", 0] },
                  { $ifNull: ["$items.quantity", 0] },
                ],
              },
            },
            totalDiscounts: {
              $sum: { $ifNull: ["$items.discountAmount", 0] },
            },
          },
        },
      ]),

      // 2. Order-level stats (ticket promedio)
      this.orderModel.aggregate([
        { $match: orderMatch },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$totalAmount" },
            orderCount: { $sum: 1 },
            avgTicket: { $avg: "$totalAmount" },
            maxTicket: { $max: "$totalAmount" },
            minTicket: { $min: "$totalAmount" },
            totalOrderDiscounts: {
              $sum: { $ifNull: ["$discountAmount", 0] },
            },
          },
        },
      ]),

      // 3. Ticket trend over time
      this.orderModel.aggregate([
        { $match: orderMatch },
        {
          $group: {
            _id: {
              $dateToString: {
                format,
                date: "$createdAt",
                timezone: "UTC",
              },
            },
            avgTicket: { $avg: "$totalAmount" },
            orderCount: { $sum: 1 },
            totalRevenue: { $sum: "$totalAmount" },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // 4. Expenses from payables
      this.payableModel.aggregate([
        { $match: payableMatch },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalAmount" },
            count: { $sum: 1 },
          },
        },
      ]),

      // 5. Payroll costs
      this.payrollRunModel.aggregate([
        {
          $match: {
            tenantId: tenantObjectId,
            status: { $in: ["approved", "posted", "paid"] },
            periodStart: { $gte: from },
            periodEnd: { $lte: to },
          },
        },
        {
          $group: {
            _id: null,
            totalNetPay: { $sum: "$netPay" },
            totalGrossPay: { $sum: "$grossPay" },
            totalEmployerCosts: { $sum: "$employerCosts" },
            runCount: { $sum: 1 },
          },
        },
      ]),

      // 6. Inventory metrics computed on-the-fly via $lookup to orders
      (async () => {
        const periodDays = Math.max(
          1,
          Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)),
        );
        const perProduct = await this.inventoryModel.aggregate([
          { $match: { tenantId: tenantObjectId, isActive: true } },
          {
            $lookup: {
              from: "orders",
              let: { pid: "$productId" },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ["$tenantId", tenantKey] },
                        { $not: { $in: ["$status", ["draft", "cancelled", "refunded"]] } },
                        { $gte: ["$createdAt", from] },
                        { $lte: ["$createdAt", to] },
                      ],
                    },
                  },
                },
                { $unwind: "$items" },
                { $match: { $expr: { $eq: ["$items.productId", "$$pid"] } } },
                {
                  $group: {
                    _id: null,
                    soldQty: { $sum: "$items.quantity" },
                    soldCost: {
                      $sum: {
                        $multiply: [
                          { $ifNull: ["$items.costPrice", 0] },
                          { $ifNull: ["$items.quantity", 0] },
                        ],
                      },
                    },
                  },
                },
              ],
              as: "sales",
            },
          },
          {
            $addFields: {
              stockValue: {
                $multiply: [
                  { $ifNull: ["$totalQuantity", 0] },
                  { $ifNull: ["$averageCostPrice", 0] },
                ],
              },
              soldQty: { $ifNull: [{ $arrayElemAt: ["$sales.soldQty", 0] }, 0] },
              soldCost: { $ifNull: [{ $arrayElemAt: ["$sales.soldCost", 0] }, 0] },
            },
          },
          {
            $addFields: {
              turnoverRate: {
                $cond: [
                  { $gt: ["$stockValue", 0] },
                  { $divide: ["$soldCost", "$stockValue"] },
                  0,
                ],
              },
              averageDailySales: { $divide: ["$soldQty", periodDays] },
            },
          },
          {
            $addFields: {
              daysOnHand: {
                $cond: [
                  { $gt: ["$averageDailySales", 0] },
                  { $divide: [{ $ifNull: ["$totalQuantity", 0] }, "$averageDailySales"] },
                  0,
                ],
              },
            },
          },
        ]);

        const totalStockValue = perProduct.reduce(
          (s, p) => s + (p.stockValue || 0),
          0,
        );
        const totalItems = perProduct.reduce(
          (s, p) => s + (p.totalQuantity || 0),
          0,
        );
        const withSales = perProduct.filter((p) => p.turnoverRate > 0);
        const avgTurnoverRate =
          withSales.length > 0
            ? withSales.reduce((s, p) => s + p.turnoverRate, 0) / withSales.length
            : 0;
        const avgDaysOnHand =
          withSales.length > 0
            ? withSales.reduce((s, p) => s + p.daysOnHand, 0) / withSales.length
            : 0;
        const lowStockCount = perProduct.filter(
          (p) => p.alerts?.lowStock === true,
        ).length;
        const nearExpirationCount = perProduct.filter(
          (p) => p.alerts?.nearExpiration === true,
        ).length;

        const metrics = [
          {
            avgTurnoverRate,
            avgDaysOnHand,
            totalStockValue,
            totalItems,
            productCount: perProduct.length,
            lowStockCount,
            nearExpirationCount,
          },
        ];

        const topProducts = [...perProduct]
          .sort((a, b) => b.turnoverRate - a.turnoverRate)
          .slice(0, 20)
          .map((p) => ({
            productName: p.productName ?? "Sin nombre",
            productSku: p.productSku,
            turnoverRate: p.turnoverRate ?? 0,
            daysOnHand: p.daysOnHand ?? 0,
            averageDailySales: p.averageDailySales ?? 0,
            stockValue: p.stockValue ?? 0,
            totalQuantity: p.totalQuantity ?? 0,
          }));

        return { metrics, topProducts };
      })().then((r) => r),

      // 8. Accounts receivable (unpaid orders)
      this.orderModel.aggregate([
        {
          $match: {
            tenantId: tenantKey,
            paymentStatus: { $in: ["pending", "partial"] },
          },
        },
        {
          $group: {
            _id: null,
            totalReceivable: {
              $sum: {
                $subtract: [
                  { $ifNull: ["$totalAmount", 0] },
                  { $ifNull: ["$paidAmount", 0] },
                ],
              },
            },
            count: { $sum: 1 },
          },
        },
      ]),

      // 9. Inventory total value (for liquidity)
      this.inventoryModel.aggregate([
        { $match: { tenantId: tenantObjectId, isActive: true } },
        {
          $group: {
            _id: null,
            totalValue: {
              $sum: {
                $multiply: [
                  { $ifNull: ["$totalQuantity", 0] },
                  { $ifNull: ["$averageCostPrice", 0] },
                ],
              },
            },
          },
        },
      ]),

      // 10. Pending payables (short term liabilities)
      this.payableModel.aggregate([
        {
          $match: {
            tenantId: tenantKey,
            status: { $in: ["open", "partially_paid"] },
          },
        },
        {
          $group: {
            _id: null,
            totalPayable: {
              $sum: {
                $subtract: [
                  { $ifNull: ["$totalAmount", 0] },
                  { $ifNull: ["$paidAmount", 0] },
                ],
              },
            },
            count: { $sum: 1 },
          },
        },
      ]),

      // 11. Fixed assets for depreciation (EBITDA)
      this.fixedAssetModel
        .find({ tenantId: tenantKey, status: "active" })
        .lean(),

      // 12. Investments (ROI)
      this.investmentModel
        .find({ tenantId: tenantKey, status: { $ne: "cancelled" } })
        .lean(),

      // 13. Confirmed payments (cash available)
      this.paymentModel.aggregate([
        {
          $match: {
            tenantId: tenantKey,
            status: "confirmed",
            date: { $gte: from, $lte: to },
          },
        },
        {
          $group: {
            _id: null,
            totalCollected: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]),

      // 14. Expenses by type (for fixed vs variable approximation)
      this.payableModel.aggregate([
        { $match: payableMatch },
        {
          $group: {
            _id: "$type",
            total: { $sum: "$totalAmount" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // ── Extract results ──────────────────────────────────────────
    const rc = revenueAndCostResult[0] || {
      totalRevenue: 0,
      totalDirectCost: 0,
      totalDiscounts: 0,
    };
    const os = orderStatsResult[0] || {
      totalAmount: 0,
      orderCount: 0,
      avgTicket: 0,
      maxTicket: 0,
      minTicket: 0,
      totalOrderDiscounts: 0,
    };
    const totalExpenses = expenseResult[0]?.total ?? 0;
    const payroll = payrollResult[0] || {
      totalNetPay: 0,
      totalGrossPay: 0,
      totalEmployerCosts: 0,
      runCount: 0,
    };
    const inventoryMetricsResult = (inventoryComputedResult as any)?.metrics ?? [];
    const topRotationResult = (inventoryComputedResult as any)?.topProducts ?? [];
    const invMetrics = inventoryMetricsResult[0] || {
      avgTurnoverRate: 0,
      avgDaysOnHand: 0,
      totalStockValue: 0,
      totalItems: 0,
      productCount: 0,
      lowStockCount: 0,
      nearExpirationCount: 0,
    };

    // ── 1. TICKET PROMEDIO ───────────────────────────────────────
    const avgTicket = {
      value: os.avgTicket ?? 0,
      totalRevenue: os.totalAmount ?? 0,
      orderCount: os.orderCount ?? 0,
      maxTicket: os.maxTicket ?? 0,
      minTicket: os.orderCount > 0 ? os.minTicket ?? 0 : 0,
      trend: ticketTrendResult.map((t) => ({
        period: t._id,
        avgTicket: Number((t.avgTicket ?? 0).toFixed(2)),
        orderCount: t.orderCount ?? 0,
        totalRevenue: Number((t.totalRevenue ?? 0).toFixed(2)),
      })),
    };

    // ── 2. MARGEN BRUTO ──────────────────────────────────────────
    const totalRevenue = rc.totalRevenue ?? 0;
    const totalDirectCost = rc.totalDirectCost ?? 0;
    const grossProfit = totalRevenue - totalDirectCost;
    const grossMarginPercent =
      totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    const grossMargin = {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalDirectCost: Number(totalDirectCost.toFixed(2)),
      grossProfit: Number(grossProfit.toFixed(2)),
      grossMarginPercent: Number(grossMarginPercent.toFixed(2)),
      status:
        grossMarginPercent >= 50
          ? "good"
          : grossMarginPercent >= 30
            ? "warning"
            : "danger",
    };

    // ── 3. MARGEN DE CONTRIBUCION ────────────────────────────────
    const totalDiscounts =
      (rc.totalDiscounts ?? 0) + (os.totalOrderDiscounts ?? 0);
    const contributionBase = totalRevenue - totalDiscounts - totalDirectCost;
    const contributionMarginPercent =
      totalRevenue > 0 ? (contributionBase / totalRevenue) * 100 : 0;

    const contributionMargin = {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalDiscounts: Number(totalDiscounts.toFixed(2)),
      totalDirectCost: Number(totalDirectCost.toFixed(2)),
      contributionMargin: Number(contributionBase.toFixed(2)),
      contributionMarginPercent: Number(contributionMarginPercent.toFixed(2)),
    };

    // ── 4. COSTOS FIJOS vs VARIABLES ─────────────────────────────
    // Approximate: payroll + utilities = fixed; purchase_order costs = variable
    const expenseBreakdown = expensesByTypeResult.reduce(
      (acc: Record<string, number>, item: { _id: string; total: number }) => {
        acc[item._id] = item.total ?? 0;
        return acc;
      },
      {} as Record<string, number>,
    );

    const fixedCostTypes = ["payroll", "utility_bill", "service_payment"];
    const variableCostTypes = ["purchase_order"];

    let estimatedFixedCosts = payroll.totalNetPay + payroll.totalEmployerCosts;
    let estimatedVariableCosts = 0;
    let unclassifiedCosts = 0;

    for (const [type, amount] of Object.entries(expenseBreakdown)) {
      if (fixedCostTypes.includes(type)) {
        estimatedFixedCosts += amount as number;
      } else if (variableCostTypes.includes(type)) {
        estimatedVariableCosts += amount as number;
      } else {
        unclassifiedCosts += amount as number;
      }
    }

    const fixedVsVariable = {
      fixedCosts: Number(estimatedFixedCosts.toFixed(2)),
      variableCosts: Number(estimatedVariableCosts.toFixed(2)),
      unclassifiedCosts: Number(unclassifiedCosts.toFixed(2)),
      totalCosts: Number(
        (
          estimatedFixedCosts +
          estimatedVariableCosts +
          unclassifiedCosts
        ).toFixed(2),
      ),
      breakdown: expenseBreakdown,
      payrollDetail: {
        netPay: payroll.totalNetPay,
        grossPay: payroll.totalGrossPay,
        employerCosts: payroll.totalEmployerCosts,
        runs: payroll.runCount,
      },
      note: "Clasificacion automatica basada en tipo de gasto. Configure costBehavior en el plan de cuentas para mayor precision.",
    };

    // ── 5. MARGEN NETO ───────────────────────────────────────────
    const totalAllExpenses =
      estimatedFixedCosts + estimatedVariableCosts + unclassifiedCosts;
    const netIncome = (os.totalAmount ?? 0) - totalAllExpenses;
    const netMarginPercent =
      os.totalAmount > 0 ? (netIncome / os.totalAmount) * 100 : 0;

    const netMargin = {
      totalRevenue: Number((os.totalAmount ?? 0).toFixed(2)),
      totalExpenses: Number(totalAllExpenses.toFixed(2)),
      operationalExpenses: Number(totalExpenses.toFixed(2)),
      payrollExpenses: Number(
        (payroll.totalNetPay + payroll.totalEmployerCosts).toFixed(2),
      ),
      netIncome: Number(netIncome.toFixed(2)),
      netMarginPercent: Number(netMarginPercent.toFixed(2)),
      status:
        netMarginPercent >= 20
          ? "good"
          : netMarginPercent >= 10
            ? "warning"
            : "danger",
    };

    // ── 6. PUNTO DE EQUILIBRIO ───────────────────────────────────
    const breakEvenRevenue =
      contributionMarginPercent > 0
        ? estimatedFixedCosts / (contributionMarginPercent / 100)
        : 0;
    const breakEvenUnits =
      avgTicket.value > 0 ? Math.ceil(breakEvenRevenue / avgTicket.value) : 0;
    const currentRevenue = os.totalAmount ?? 0;

    const breakEven = {
      breakEvenRevenue: Number(breakEvenRevenue.toFixed(2)),
      breakEvenUnits,
      fixedCosts: Number(estimatedFixedCosts.toFixed(2)),
      contributionMarginPercent: Number(contributionMarginPercent.toFixed(2)),
      currentRevenue: Number(currentRevenue.toFixed(2)),
      surplusOrDeficit: Number((currentRevenue - breakEvenRevenue).toFixed(2)),
      isAboveBreakEven: currentRevenue >= breakEvenRevenue,
      coveragePercent:
        breakEvenRevenue > 0
          ? Number(((currentRevenue / breakEvenRevenue) * 100).toFixed(2))
          : null,
    };

    // ── 7. ROTACION DE INVENTARIO ────────────────────────────────
    const inventoryTurnover = {
      avgTurnoverRate: Number((invMetrics.avgTurnoverRate ?? 0).toFixed(2)),
      avgDaysOnHand: Number((invMetrics.avgDaysOnHand ?? 0).toFixed(1)),
      totalStockValue: Number((invMetrics.totalStockValue ?? 0).toFixed(2)),
      totalItems: invMetrics.totalItems ?? 0,
      productCount: invMetrics.productCount ?? 0,
      lowStockCount: invMetrics.lowStockCount ?? 0,
      nearExpirationCount: invMetrics.nearExpirationCount ?? 0,
      topProducts: (topRotationResult as any[]).map((p) => ({
        productName: p.productName ?? "Sin nombre",
        productSku: p.productSku,
        turnoverRate: Number((p.turnoverRate ?? 0).toFixed(2)),
        daysOnHand: Number((p.daysOnHand ?? 0).toFixed(1)),
        averageDailySales: Number((p.averageDailySales ?? 0).toFixed(2)),
        stockValue: Number((p.stockValue ?? 0).toFixed(2)),
        totalQuantity: p.totalQuantity ?? 0,
      })),
    };

    // ── 8. LIQUIDEZ ACTUAL ───────────────────────────────────────
    const accountsReceivable = receivablesResult[0]?.totalReceivable ?? 0;
    const inventoryValue = inventoryValueResult[0]?.totalValue ?? 0;
    const cashCollected = confirmedPaymentsResult[0]?.totalCollected ?? 0;
    const currentAssets = accountsReceivable + inventoryValue + cashCollected;
    const currentLiabilities = pendingPayablesResult[0]?.totalPayable ?? 0;
    const liquidityRatio =
      currentLiabilities > 0 ? currentAssets / currentLiabilities : null;

    const liquidity = {
      currentAssets: Number(currentAssets.toFixed(2)),
      currentLiabilities: Number(currentLiabilities.toFixed(2)),
      liquidityRatio: liquidityRatio
        ? Number(liquidityRatio.toFixed(2))
        : null,
      components: {
        cashCollected: Number(cashCollected.toFixed(2)),
        accountsReceivable: Number(accountsReceivable.toFixed(2)),
        inventoryValue: Number(inventoryValue.toFixed(2)),
        accountsPayable: Number(currentLiabilities.toFixed(2)),
      },
      status:
        liquidityRatio === null
          ? "no_data"
          : liquidityRatio >= 1.5
            ? "good"
            : liquidityRatio >= 1.0
              ? "warning"
              : "danger",
    };

    // ── 9. EBITDA ────────────────────────────────────────────────
    let totalMonthlyDepreciation = 0;
    for (const asset of fixedAssetsResult) {
      if (asset.depreciationMethod === "straight_line") {
        const depreciable = asset.acquisitionCost - (asset.residualValue ?? 0);
        totalMonthlyDepreciation += depreciable / asset.usefulLifeMonths;
      } else if (asset.depreciationMethod === "declining_balance") {
        const bookValue =
          asset.acquisitionCost - (asset.accumulatedDepreciation ?? 0);
        const rate = 2 / asset.usefulLifeMonths;
        totalMonthlyDepreciation += bookValue * rate;
      }
    }

    const periodDays = Math.max(
      1,
      Math.ceil((to.getTime() - from.getTime()) / 86400000),
    );
    const periodMonths = periodDays / 30;
    const periodDepreciation = totalMonthlyDepreciation * periodMonths;
    const operatingIncome = netIncome;
    const ebitda = operatingIncome + periodDepreciation;
    const ebitdaMargin =
      os.totalAmount > 0 ? (ebitda / os.totalAmount) * 100 : 0;

    const ebitdaKpi = {
      ebitda: Number(ebitda.toFixed(2)),
      ebitdaMargin: Number(ebitdaMargin.toFixed(2)),
      operatingIncome: Number(operatingIncome.toFixed(2)),
      periodDepreciation: Number(periodDepreciation.toFixed(2)),
      monthlyDepreciation: Number(totalMonthlyDepreciation.toFixed(2)),
      assetsCount: fixedAssetsResult.length,
      totalAssetValue: Number(
        fixedAssetsResult
          .reduce(
            (sum: number, a: any) => sum + (a.acquisitionCost ?? 0),
            0,
          )
          .toFixed(2),
      ),
      hasFixedAssets: fixedAssetsResult.length > 0,
    };

    // ── 10. ROI ──────────────────────────────────────────────────
    const totalInvested = (investmentsResult as any[]).reduce(
      (sum: number, inv: any) => sum + (inv.investedAmount ?? 0),
      0,
    );
    const totalActualReturn = (investmentsResult as any[]).reduce(
      (sum: number, inv: any) => sum + (inv.actualReturn ?? 0),
      0,
    );
    const roiPercent =
      totalInvested > 0
        ? ((totalActualReturn - totalInvested) / totalInvested) * 100
        : null;

    const roi = {
      totalInvested: Number(totalInvested.toFixed(2)),
      totalReturn: Number(totalActualReturn.toFixed(2)),
      netGain: Number((totalActualReturn - totalInvested).toFixed(2)),
      roiPercent: roiPercent ? Number(roiPercent.toFixed(2)) : null,
      investmentCount: investmentsResult.length,
      hasInvestments: investmentsResult.length > 0,
      byCategory: this.groupInvestmentsByCategory(
        investmentsResult as any[],
      ),
    };

    // ── Period comparison (previous period) ──────────────────────
    let comparison: Record<string, any> | null = null;

    if (compare) {
      const prev = this.shiftRange(from, to);
      comparison = await this.computeKpiSummaryForRange(
        tenantKey,
        tenantObjectId,
        prev.from,
        prev.to,
      );

      const computeDelta = (
        current: number | null,
        previous: number | null,
      ) => {
        if (current == null || previous == null) return null;
        const abs = current - previous;
        const pct = previous !== 0 ? (abs / Math.abs(previous)) * 100 : null;
        return {
          current: Number(current.toFixed(2)),
          previous: Number(previous.toFixed(2)),
          absoluteChange: Number(abs.toFixed(2)),
          percentChange: pct != null ? Number(pct.toFixed(2)) : null,
          direction:
            abs > 0.005 ? ("up" as const) : abs < -0.005 ? ("down" as const) : ("flat" as const),
        };
      };

      comparison = {
        period: {
          from: prev.from.toISOString(),
          to: prev.to.toISOString(),
        },
        deltas: {
          avgTicket: computeDelta(avgTicket.value, comparison.avgTicket),
          grossMarginPercent: computeDelta(
            grossMargin.grossMarginPercent,
            comparison.grossMarginPercent,
          ),
          netMarginPercent: computeDelta(
            netMargin.netMarginPercent,
            comparison.netMarginPercent,
          ),
          totalRevenue: computeDelta(
            os.totalAmount ?? 0,
            comparison.totalRevenue,
          ),
          totalExpenses: computeDelta(
            totalAllExpenses,
            comparison.totalExpenses,
          ),
          ebitda: computeDelta(ebitda, comparison.ebitda),
          liquidityRatio: computeDelta(
            liquidity.liquidityRatio,
            comparison.liquidityRatio,
          ),
          netIncome: computeDelta(netIncome, comparison.netIncome),
        },
      };
    }

    // ── Build response ───────────────────────────────────────────
    return {
      period: {
        from: from.toISOString(),
        to: to.toISOString(),
        days: periodDays,
        label: period || "30d",
      },
      avgTicket,
      grossMargin,
      contributionMargin,
      fixedVsVariable,
      netMargin,
      breakEven,
      inventoryTurnover,
      liquidity,
      ebitda: ebitdaKpi,
      roi,
      ...(comparison ? { comparison } : {}),
    };
  }

  async compareFinancialKpiRanges(
    tenantId: string,
    fromA: Date,
    toA: Date,
    fromB: Date,
    toB: Date,
  ) {
    const { objectId: tenantObjectId, key: tenantKey } =
      this.normalizeTenantIdentifiers(tenantId);

    const [periodA, periodB] = await Promise.all([
      this.computeKpiSummaryForRange(tenantKey, tenantObjectId, fromA, toA),
      this.computeKpiSummaryForRange(tenantKey, tenantObjectId, fromB, toB),
    ]);

    const computeDelta = (
      current: number | null,
      previous: number | null,
    ) => {
      if (current == null || previous == null) return null;
      const abs = current - previous;
      const pct =
        previous !== 0 ? (abs / Math.abs(previous)) * 100 : null;
      return {
        current: Number(current.toFixed(2)),
        previous: Number(previous.toFixed(2)),
        absoluteChange: Number(abs.toFixed(2)),
        percentChange: pct != null ? Number(pct.toFixed(2)) : null,
        direction:
          abs > 0.005
            ? ("up" as const)
            : abs < -0.005
              ? ("down" as const)
              : ("flat" as const),
      };
    };

    return {
      periodA: { from: fromA.toISOString(), to: toA.toISOString() },
      periodB: { from: fromB.toISOString(), to: toB.toISOString() },
      summaryA: periodA,
      summaryB: periodB,
      deltas: {
        avgTicket: computeDelta(periodA.avgTicket, periodB.avgTicket),
        grossMarginPercent: computeDelta(
          periodA.grossMarginPercent,
          periodB.grossMarginPercent,
        ),
        netMarginPercent: computeDelta(
          periodA.netMarginPercent,
          periodB.netMarginPercent,
        ),
        totalRevenue: computeDelta(
          periodA.totalRevenue,
          periodB.totalRevenue,
        ),
        totalExpenses: computeDelta(
          periodA.totalExpenses,
          periodB.totalExpenses,
        ),
        ebitda: computeDelta(periodA.ebitda, periodB.ebitda),
        liquidityRatio: computeDelta(
          periodA.liquidityRatio,
          periodB.liquidityRatio,
        ),
        netIncome: computeDelta(periodA.netIncome, periodB.netIncome),
      },
    };
  }

  private async computeKpiSummaryForRange(
    tenantKey: string,
    tenantObjectId: Types.ObjectId,
    from: Date,
    to: Date,
  ): Promise<{
    avgTicket: number;
    grossMarginPercent: number;
    netMarginPercent: number;
    totalRevenue: number;
    totalExpenses: number;
    ebitda: number;
    liquidityRatio: number | null;
    netIncome: number;
  }> {
    const orderMatch = {
      tenantId: tenantKey,
      status: { $nin: ["draft", "cancelled", "refunded"] },
      createdAt: { $gte: from, $lte: to },
    };
    const payableMatch = {
      tenantId: tenantKey,
      status: { $in: ["open", "partially_paid", "paid"] },
      issueDate: { $gte: from, $lte: to },
    };

    const [rcResult, osResult, expResult, payrollRes, expByType, confirmedPay, invVal, pendPay] =
      await Promise.all([
        this.orderModel.aggregate([
          { $match: orderMatch },
          { $unwind: "$items" },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: { $ifNull: ["$items.finalPrice", "$items.totalPrice"] } },
              totalDirectCost: {
                $sum: {
                  $multiply: [
                    { $ifNull: ["$items.costPrice", 0] },
                    { $ifNull: ["$items.quantity", 0] },
                  ],
                },
              },
              totalDiscounts: { $sum: { $ifNull: ["$items.discountAmount", 0] } },
            },
          },
        ]),
        this.orderModel.aggregate([
          { $match: orderMatch },
          {
            $group: {
              _id: null,
              totalAmount: { $sum: "$totalAmount" },
              orderCount: { $sum: 1 },
              avgTicket: { $avg: "$totalAmount" },
              totalOrderDiscounts: { $sum: { $ifNull: ["$discountAmount", 0] } },
            },
          },
        ]),
        this.payableModel.aggregate([
          { $match: payableMatch },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ]),
        this.payrollRunModel.aggregate([
          {
            $match: {
              tenantId: tenantObjectId,
              status: { $in: ["approved", "posted", "paid"] },
              periodStart: { $gte: from },
              periodEnd: { $lte: to },
            },
          },
          {
            $group: {
              _id: null,
              totalNetPay: { $sum: "$netPay" },
              totalEmployerCosts: { $sum: "$employerCosts" },
            },
          },
        ]),
        this.payableModel.aggregate([
          { $match: payableMatch },
          { $group: { _id: "$type", total: { $sum: "$totalAmount" } } },
        ]),
        this.paymentModel.aggregate([
          {
            $match: {
              tenantId: tenantKey,
              status: "confirmed",
              date: { $gte: from, $lte: to },
            },
          },
          { $group: { _id: null, totalCollected: { $sum: "$amount" } } },
        ]),
        this.inventoryModel.aggregate([
          { $match: { tenantId: tenantObjectId, isActive: true } },
          {
            $group: {
              _id: null,
              totalValue: {
                $sum: {
                  $multiply: [
                    { $ifNull: ["$totalQuantity", 0] },
                    { $ifNull: ["$averageCostPrice", 0] },
                  ],
                },
              },
            },
          },
        ]),
        this.payableModel.aggregate([
          {
            $match: {
              tenantId: tenantKey,
              status: { $in: ["open", "partially_paid"] },
            },
          },
          {
            $group: {
              _id: null,
              totalPayable: {
                $sum: {
                  $subtract: [
                    { $ifNull: ["$totalAmount", 0] },
                    { $ifNull: ["$paidAmount", 0] },
                  ],
                },
              },
            },
          },
        ]),
      ]);

    const rc = rcResult[0] || { totalRevenue: 0, totalDirectCost: 0, totalDiscounts: 0 };
    const os = osResult[0] || { totalAmount: 0, orderCount: 0, avgTicket: 0, totalOrderDiscounts: 0 };
    const pr = payrollRes[0] || { totalNetPay: 0, totalEmployerCosts: 0 };

    const totalRevenue = rc.totalRevenue ?? 0;
    const totalDirectCost = rc.totalDirectCost ?? 0;
    const grossProfit = totalRevenue - totalDirectCost;
    const grossMarginPct = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    const fixedCostTypes = ["payroll", "utility_bill", "service_payment"];
    const variableCostTypes = ["purchase_order"];
    let estFixed = pr.totalNetPay + pr.totalEmployerCosts;
    let estVariable = 0;
    let unclass = 0;
    for (const item of expByType) {
      const t = item._id as string;
      const amt = (item.total ?? 0) as number;
      if (fixedCostTypes.includes(t)) estFixed += amt;
      else if (variableCostTypes.includes(t)) estVariable += amt;
      else unclass += amt;
    }

    const totalAllExp = estFixed + estVariable + unclass;
    const nIncome = (os.totalAmount ?? 0) - totalAllExp;
    const netPct = os.totalAmount > 0 ? (nIncome / os.totalAmount) * 100 : 0;

    const periodDays = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000));
    const fixedAssets = await this.fixedAssetModel
      .find({ tenantId: tenantKey, status: "active" })
      .lean();
    let monthlyDep = 0;
    for (const asset of fixedAssets) {
      if (asset.depreciationMethod === "straight_line") {
        monthlyDep += (asset.acquisitionCost - (asset.residualValue ?? 0)) / asset.usefulLifeMonths;
      } else if (asset.depreciationMethod === "declining_balance") {
        const bv = asset.acquisitionCost - (asset.accumulatedDepreciation ?? 0);
        monthlyDep += bv * (2 / asset.usefulLifeMonths);
      }
    }
    const ebitdaVal = nIncome + monthlyDep * (periodDays / 30);

    const cashCol = confirmedPay[0]?.totalCollected ?? 0;
    const invValue = invVal[0]?.totalValue ?? 0;
    const curLiab = pendPay[0]?.totalPayable ?? 0;
    const curAssets = cashCol + invValue;
    const liqRatio = curLiab > 0 ? curAssets / curLiab : null;

    return {
      avgTicket: os.avgTicket ?? 0,
      grossMarginPercent: grossMarginPct,
      netMarginPercent: netPct,
      totalRevenue: os.totalAmount ?? 0,
      totalExpenses: totalAllExp,
      ebitda: ebitdaVal,
      liquidityRatio: liqRatio,
      netIncome: nIncome,
    };
  }

  // ── Expense/Income Group Drill-Down ────────────────────────
  async getExpenseIncomeBreakdown(
    tenantId: string,
    period?: string,
    granularity = "month",
    compare = false,
    groupBy = "type",
    fromDate?: Date,
    toDate?: Date,
  ) {
    const { objectId: tenantObjectId, key: tenantKey } =
      this.normalizeTenantIdentifiers(tenantId);

    let from: Date;
    let to: Date;
    if (fromDate && toDate) {
      from = fromDate;
      to = toDate;
    } else {
      const range = this.buildDateRange(period);
      from = range.from;
      to = range.to;
    }

    const dateFormat = this.getGranularityFormat(granularity);

    const orderMatch = {
      tenantId: tenantKey,
      status: { $nin: ["draft", "cancelled", "refunded"] },
      createdAt: { $gte: from, $lte: to },
    };

    const payableMatch = {
      tenantId: tenantKey,
      status: { $in: ["open", "partially_paid", "paid"] },
      issueDate: { $gte: from, $lte: to },
    };

    // ── Expense aggregation pipelines (differ by groupBy) ────
    const expenseAggregations =
      groupBy === "account"
        ? this.buildAccountExpenseAggregations(payableMatch, dateFormat)
        : this.buildTypeExpenseAggregations(payableMatch, dateFormat);

    // ── Run all aggregations in parallel ─────────────────────
    const [
      expensesByGroup,
      expensesTrend,
      expensesDrillDown,
      incomeByCategory,
      incomeTrend,
      incomeDrillDown,
      payrollTotals,
      payrollTrend,
    ] = await Promise.all([
      expenseAggregations.byGroup,
      expenseAggregations.trend,
      expenseAggregations.drillDown,

      // 4. Income grouped by product category
      this.orderModel.aggregate([
        { $match: orderMatch },
        { $unwind: "$items" },
        {
          $lookup: {
            from: "products",
            let: { pid: "$items.productId" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$pid"] } } },
              { $project: { category: 1 } },
            ],
            as: "productInfo",
          },
        },
        {
          $addFields: {
            categoryName: {
              $let: {
                vars: {
                  rawCat: {
                    $arrayElemAt: ["$productInfo.category", 0],
                  },
                },
                in: {
                  $cond: {
                    if: { $isArray: "$$rawCat" },
                    then: {
                      $ifNull: [
                        { $arrayElemAt: ["$$rawCat", 0] },
                        "Sin Categoria",
                      ],
                    },
                    else: {
                      $ifNull: ["$$rawCat", "Sin Categoria"],
                    },
                  },
                },
              },
            },
          },
        },
        {
          $group: {
            _id: "$categoryName",
            total: {
              $sum: {
                $ifNull: ["$items.finalPrice", "$items.totalPrice"],
              },
            },
            count: { $sum: { $ifNull: ["$items.quantity", 1] } },
          },
        },
        { $sort: { total: -1 } },
      ]),

      // 5. Income temporal trend by category
      this.orderModel.aggregate([
        { $match: orderMatch },
        { $unwind: "$items" },
        {
          $lookup: {
            from: "products",
            let: { pid: "$items.productId" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$pid"] } } },
              { $project: { category: 1 } },
            ],
            as: "productInfo",
          },
        },
        {
          $addFields: {
            categoryName: {
              $let: {
                vars: {
                  rawCat: {
                    $arrayElemAt: ["$productInfo.category", 0],
                  },
                },
                in: {
                  $cond: {
                    if: { $isArray: "$$rawCat" },
                    then: {
                      $ifNull: [
                        { $arrayElemAt: ["$$rawCat", 0] },
                        "Sin Categoria",
                      ],
                    },
                    else: {
                      $ifNull: ["$$rawCat", "Sin Categoria"],
                    },
                  },
                },
              },
            },
          },
        },
        {
          $group: {
            _id: {
              category: "$categoryName",
              period: {
                $dateToString: {
                  format: dateFormat,
                  date: "$createdAt",
                  timezone: "UTC",
                },
              },
            },
            total: {
              $sum: {
                $ifNull: ["$items.finalPrice", "$items.totalPrice"],
              },
            },
          },
        },
        { $sort: { "_id.period": 1 } },
      ]),

      // 6. Income drill-down: within each category, group by productName
      this.orderModel.aggregate([
        { $match: orderMatch },
        { $unwind: "$items" },
        {
          $lookup: {
            from: "products",
            let: { pid: "$items.productId" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$pid"] } } },
              { $project: { category: 1 } },
            ],
            as: "productInfo",
          },
        },
        {
          $addFields: {
            categoryName: {
              $let: {
                vars: {
                  rawCat: {
                    $arrayElemAt: ["$productInfo.category", 0],
                  },
                },
                in: {
                  $cond: {
                    if: { $isArray: "$$rawCat" },
                    then: {
                      $ifNull: [
                        { $arrayElemAt: ["$$rawCat", 0] },
                        "Sin Categoria",
                      ],
                    },
                    else: {
                      $ifNull: ["$$rawCat", "Sin Categoria"],
                    },
                  },
                },
              },
            },
          },
        },
        {
          $group: {
            _id: {
              category: "$categoryName",
              productName: "$items.productName",
            },
            total: {
              $sum: {
                $ifNull: ["$items.finalPrice", "$items.totalPrice"],
              },
            },
            count: { $sum: { $ifNull: ["$items.quantity", 1] } },
          },
        },
        { $sort: { total: -1 } },
      ]),

      // 7. Payroll totals
      this.payrollRunModel.aggregate([
        {
          $match: {
            tenantId: tenantObjectId,
            status: { $in: ["approved", "posted", "paid"] },
            periodStart: { $gte: from },
            periodEnd: { $lte: to },
          },
        },
        {
          $group: {
            _id: null,
            totalNetPay: { $sum: "$netPay" },
            totalEmployerCosts: { $sum: "$employerCosts" },
            runCount: { $sum: 1 },
          },
        },
      ]),

      // 8. Payroll trend by granularity
      this.payrollRunModel.aggregate([
        {
          $match: {
            tenantId: tenantObjectId,
            status: { $in: ["approved", "posted", "paid"] },
            periodStart: { $gte: from },
            periodEnd: { $lte: to },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: dateFormat,
                date: "$periodStart",
                timezone: "UTC",
              },
            },
            total: { $sum: { $add: ["$netPay", "$employerCosts"] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    // ── Shape expense groups ─────────────────────────────────
    const EXPENSE_TYPE_LABELS: Record<string, string> = {
      purchase_order: "Ordenes de Compra (COGS)",
      payroll: "Nomina",
      service_payment: "Servicios",
      utility_bill: "Servicios Publicos",
      other: "Otros Gastos",
    };

    const expTrendMap = new Map<
      string,
      Array<{ period: string; total: number }>
    >();
    for (const row of expensesTrend) {
      const key = row._id.type;
      if (!expTrendMap.has(key)) expTrendMap.set(key, []);
      expTrendMap.get(key)!.push({ period: row._id.period, total: row.total });
    }

    const expDrillMap = new Map<
      string,
      Array<{ name: string; total: number; count: number }>
    >();
    for (const row of expensesDrillDown) {
      const key = row._id.type;
      if (!expDrillMap.has(key)) expDrillMap.set(key, []);
      expDrillMap.get(key)!.push({
        name: row._id.payeeName,
        total: row.total,
        count: row.count,
      });
    }

    // Merge payroll from PayrollRun into expense groups (only for type grouping)
    if (groupBy === "type") {
      const payrollData = payrollTotals[0];
      const payrollTotal = payrollData
        ? (payrollData.totalNetPay ?? 0) + (payrollData.totalEmployerCosts ?? 0)
        : 0;

      const payrollFromPayable = expensesByGroup.find(
        (e: any) => e._id === "payroll",
      );

      if (payrollTotal > 0) {
        if (payrollFromPayable) {
          payrollFromPayable.total += payrollTotal;
        } else {
          expensesByGroup.push({
            _id: "payroll",
            total: payrollTotal,
            count: payrollData?.runCount ?? 0,
          });
        }

        if (!expTrendMap.has("payroll")) expTrendMap.set("payroll", []);
        for (const row of payrollTrend) {
          const existing = expTrendMap
            .get("payroll")!
            .find((t) => t.period === row._id);
          if (existing) {
            existing.total += row.total;
          } else {
            expTrendMap
              .get("payroll")!
              .push({ period: row._id, total: row.total });
          }
        }
      }
    }

    const totalExpenses = expensesByGroup.reduce(
      (sum: number, e: any) => sum + (e.total ?? 0),
      0,
    );

    const expenseGroups = expensesByGroup
      .sort((a: any, b: any) => b.total - a.total)
      .map((e: any) => {
        const key = e._id as string;
        let trend = expTrendMap.get(key) ?? [];
        if (granularity === "quarter") {
          trend = this.collapseTrendToQuarters(trend);
        }
        const drillItems = (expDrillMap.get(key) ?? []).slice(0, 20);
        const groupTotal = e.total ?? 0;

        const label =
          groupBy === "account"
            ? (e.code ? `${e.code} - ` : "") + key
            : EXPENSE_TYPE_LABELS[key] ?? key;

        return {
          key,
          label,
          total: Number(groupTotal.toFixed(2)),
          count: e.count ?? 0,
          percentage:
            totalExpenses > 0
              ? Number(((groupTotal / totalExpenses) * 100).toFixed(2))
              : 0,
          trend: trend.sort((a, b) => a.period.localeCompare(b.period)),
          drillDown: drillItems.map((d) => ({
            name: d.name,
            total: Number(d.total.toFixed(2)),
            count: d.count,
            percentage:
              groupTotal > 0
                ? Number(((d.total / groupTotal) * 100).toFixed(2))
                : 0,
          })),
          delta: null as any,
        };
      });

    // ── Shape income groups ──────────────────────────────────
    const incTrendMap = new Map<
      string,
      Array<{ period: string; total: number }>
    >();
    for (const row of incomeTrend) {
      const key = row._id.category;
      if (!incTrendMap.has(key)) incTrendMap.set(key, []);
      incTrendMap.get(key)!.push({ period: row._id.period, total: row.total });
    }

    const incDrillMap = new Map<
      string,
      Array<{ name: string; total: number; count: number }>
    >();
    for (const row of incomeDrillDown) {
      const key = row._id.category;
      if (!incDrillMap.has(key)) incDrillMap.set(key, []);
      incDrillMap.get(key)!.push({
        name: row._id.productName,
        total: row.total,
        count: row.count,
      });
    }

    const totalIncome = incomeByCategory.reduce(
      (sum: number, c: any) => sum + (c.total ?? 0),
      0,
    );

    const incomeGroups = incomeByCategory
      .sort((a: any, b: any) => b.total - a.total)
      .map((c: any) => {
        const key = c._id as string;
        let trend = incTrendMap.get(key) ?? [];
        if (granularity === "quarter") {
          trend = this.collapseTrendToQuarters(trend);
        }
        const drillItems = (incDrillMap.get(key) ?? []).slice(0, 20);
        const groupTotal = c.total ?? 0;

        return {
          key,
          label: key,
          total: Number(groupTotal.toFixed(2)),
          count: c.count ?? 0,
          percentage:
            totalIncome > 0
              ? Number(((groupTotal / totalIncome) * 100).toFixed(2))
              : 0,
          trend: trend.sort((a, b) => a.period.localeCompare(b.period)),
          drillDown: drillItems.map((d) => ({
            name: d.name,
            total: Number(d.total.toFixed(2)),
            count: d.count,
            percentage:
              groupTotal > 0
                ? Number(((d.total / groupTotal) * 100).toFixed(2))
                : 0,
          })),
          delta: null as any,
        };
      });

    // ── Comparison with previous period ──────────────────────
    let comparison: any = null;

    if (compare) {
      const prev = this.shiftRange(from, to);
      const prevPayableMatch = {
        tenantId: tenantKey,
        status: { $in: ["open", "partially_paid", "paid"] },
        issueDate: { $gte: prev.from, $lte: prev.to },
      };
      const prevOrderMatch = {
        tenantId: tenantKey,
        status: { $nin: ["draft", "cancelled", "refunded"] },
        createdAt: { $gte: prev.from, $lte: prev.to },
      };

      const prevExpAgg =
        groupBy === "account"
          ? this.payableModel.aggregate([
              { $match: prevPayableMatch },
              { $unwind: "$lines" },
              {
                $lookup: {
                  from: "chartofaccounts",
                  localField: "lines.accountId",
                  foreignField: "_id",
                  as: "accountInfo",
                },
              },
              {
                $group: {
                  _id: {
                    $ifNull: [
                      { $arrayElemAt: ["$accountInfo.name", 0] },
                      "Sin Cuenta",
                    ],
                  },
                  total: { $sum: "$lines.amount" },
                },
              },
            ])
          : this.payableModel.aggregate([
              { $match: prevPayableMatch },
              {
                $group: {
                  _id: "$type",
                  total: { $sum: "$totalAmount" },
                },
              },
            ]);

      const [prevExpByGroup, prevIncByCategory, prevPayroll] =
        await Promise.all([
          prevExpAgg,
          this.orderModel.aggregate([
            { $match: prevOrderMatch },
            { $unwind: "$items" },
            {
              $lookup: {
                from: "products",
                let: { pid: "$items.productId" },
                pipeline: [
                  { $match: { $expr: { $eq: ["$_id", "$$pid"] } } },
                  { $project: { category: 1 } },
                ],
                as: "productInfo",
              },
            },
            {
              $addFields: {
                categoryName: {
                  $let: {
                    vars: {
                      rawCat: {
                        $arrayElemAt: ["$productInfo.category", 0],
                      },
                    },
                    in: {
                      $cond: {
                        if: { $isArray: "$$rawCat" },
                        then: {
                          $ifNull: [
                            { $arrayElemAt: ["$$rawCat", 0] },
                            "Sin Categoria",
                          ],
                        },
                        else: {
                          $ifNull: ["$$rawCat", "Sin Categoria"],
                        },
                      },
                    },
                  },
                },
              },
            },
            {
              $group: {
                _id: "$categoryName",
                total: {
                  $sum: {
                    $ifNull: ["$items.finalPrice", "$items.totalPrice"],
                  },
                },
              },
            },
          ]),
          this.payrollRunModel.aggregate([
            {
              $match: {
                tenantId: tenantObjectId,
                status: { $in: ["approved", "posted", "paid"] },
                periodStart: { $gte: prev.from },
                periodEnd: { $lte: prev.to },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: { $add: ["$netPay", "$employerCosts"] } },
              },
            },
          ]),
        ]);

      const prevExpMap = new Map<string, number>();
      for (const e of prevExpByGroup) prevExpMap.set(e._id, e.total);
      if (groupBy === "type" && prevPayroll[0]?.total) {
        const existing = prevExpMap.get("payroll") ?? 0;
        prevExpMap.set("payroll", existing + prevPayroll[0].total);
      }

      const prevExpTotal = Array.from(prevExpMap.values()).reduce(
        (s, v) => s + v,
        0,
      );

      const prevIncMap = new Map<string, number>();
      for (const c of prevIncByCategory) prevIncMap.set(c._id, c.total);
      const prevIncTotal = Array.from(prevIncMap.values()).reduce(
        (s, v) => s + v,
        0,
      );

      for (const group of expenseGroups) {
        const prevVal = prevExpMap.get(group.key) ?? 0;
        const abs = group.total - prevVal;
        const pct =
          prevVal !== 0 ? (abs / Math.abs(prevVal)) * 100 : null;
        group.delta = {
          previous: Number(prevVal.toFixed(2)),
          absoluteChange: Number(abs.toFixed(2)),
          percentChange: pct != null ? Number(pct.toFixed(2)) : null,
          direction:
            abs > 0.005 ? ("up" as const) : abs < -0.005 ? ("down" as const) : ("flat" as const),
        };
      }

      for (const group of incomeGroups) {
        const prevVal = prevIncMap.get(group.key) ?? 0;
        const abs = group.total - prevVal;
        const pct =
          prevVal !== 0 ? (abs / Math.abs(prevVal)) * 100 : null;
        group.delta = {
          previous: Number(prevVal.toFixed(2)),
          absoluteChange: Number(abs.toFixed(2)),
          percentChange: pct != null ? Number(pct.toFixed(2)) : null,
          direction:
            abs > 0.005 ? ("up" as const) : abs < -0.005 ? ("down" as const) : ("flat" as const),
        };
      }

      comparison = {
        period: { from: prev.from.toISOString(), to: prev.to.toISOString() },
        expenses: {
          total: Number(prevExpTotal.toFixed(2)),
          groups: Array.from(prevExpMap.entries()).map(([key, total]) => ({
            key,
            total: Number(total.toFixed(2)),
          })),
        },
        income: {
          total: Number(prevIncTotal.toFixed(2)),
          groups: Array.from(prevIncMap.entries()).map(([key, total]) => ({
            key,
            total: Number(total.toFixed(2)),
          })),
        },
      };
    }

    // ── Build response ───────────────────────────────────────
    const periodDays = Math.max(
      1,
      Math.ceil((to.getTime() - from.getTime()) / 86400000),
    );

    return {
      period: {
        from: from.toISOString(),
        to: to.toISOString(),
        days: periodDays,
        label: period || "30d",
        granularity,
        groupBy,
      },
      expenses: {
        total: Number(totalExpenses.toFixed(2)),
        groups: expenseGroups,
      },
      income: {
        total: Number(totalIncome.toFixed(2)),
        groups: incomeGroups,
      },
      ...(comparison ? { comparison } : {}),
    };
  }

  private groupInvestmentsByCategory(
    investments: Array<{
      category: string;
      investedAmount: number;
      actualReturn: number;
    }>,
  ) {
    const groups: Record<
      string,
      { invested: number; returned: number; count: number }
    > = {};
    for (const inv of investments) {
      const cat = inv.category || "other";
      if (!groups[cat]) {
        groups[cat] = { invested: 0, returned: 0, count: 0 };
      }
      groups[cat].invested += inv.investedAmount ?? 0;
      groups[cat].returned += inv.actualReturn ?? 0;
      groups[cat].count += 1;
    }
    return Object.entries(groups).map(([category, data]) => ({
      category,
      ...data,
      roi:
        data.invested > 0
          ? Number(
              (((data.returned - data.invested) / data.invested) * 100).toFixed(
                2,
              ),
            )
          : null,
    }));
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

  private async ensureFeature(
    feature: keyof FeatureFlags,
    message: string,
  ): Promise<void> {
    const flags = await this.featureFlagsService.getFeatureFlags();
    if (!flags[feature]) {
      throw new ForbiddenException(message);
    }
  }

  private buildTypeExpenseAggregations(
    payableMatch: any,
    dateFormat: string,
  ) {
    return {
      byGroup: this.payableModel.aggregate([
        { $match: payableMatch },
        {
          $group: {
            _id: "$type",
            total: { $sum: "$totalAmount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
      ]),
      trend: this.payableModel.aggregate([
        { $match: payableMatch },
        {
          $group: {
            _id: {
              type: "$type",
              period: {
                $dateToString: {
                  format: dateFormat,
                  date: "$issueDate",
                  timezone: "UTC",
                },
              },
            },
            total: { $sum: "$totalAmount" },
          },
        },
        { $sort: { "_id.period": 1 } },
      ]),
      drillDown: this.payableModel.aggregate([
        { $match: payableMatch },
        {
          $group: {
            _id: { type: "$type", payeeName: "$payeeName" },
            total: { $sum: "$totalAmount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
      ]),
    };
  }

  private buildAccountExpenseAggregations(
    payableMatch: any,
    dateFormat: string,
  ) {
    const basePipeline: any[] = [
      { $match: payableMatch },
      { $unwind: "$lines" },
      {
        $lookup: {
          from: "chartofaccounts",
          localField: "lines.accountId",
          foreignField: "_id",
          as: "accountInfo",
        },
      },
      {
        $addFields: {
          accountName: {
            $ifNull: [
              { $arrayElemAt: ["$accountInfo.name", 0] },
              "Sin Cuenta",
            ],
          },
          accountCode: {
            $ifNull: [
              { $arrayElemAt: ["$accountInfo.code", 0] },
              "",
            ],
          },
        },
      },
    ];

    return {
      byGroup: this.payableModel.aggregate([
        ...basePipeline,
        {
          $group: {
            _id: "$accountName",
            total: { $sum: "$lines.amount" },
            count: { $sum: 1 },
            code: { $first: "$accountCode" },
          },
        },
        { $sort: { total: -1 } },
      ]),
      trend: this.payableModel.aggregate([
        ...basePipeline,
        {
          $group: {
            _id: {
              type: "$accountName",
              period: {
                $dateToString: {
                  format: dateFormat,
                  date: "$issueDate",
                  timezone: "UTC",
                },
              },
            },
            total: { $sum: "$lines.amount" },
          },
        },
        { $sort: { "_id.period": 1 } },
      ]),
      drillDown: this.payableModel.aggregate([
        ...basePipeline,
        {
          $group: {
            _id: { type: "$accountName", payeeName: "$payeeName" },
            total: { $sum: "$lines.amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
      ]),
    };
  }

  private getGranularityFormat(granularity: string): string {
    switch (granularity) {
      case "year":
        return "%Y";
      case "quarter":
      case "month":
      default:
        return "%Y-%m";
    }
  }

  private monthToQuarter(monthStr: string): string {
    const [year, month] = monthStr.split("-");
    const q = Math.ceil(parseInt(month, 10) / 3);
    return `${year}-Q${q}`;
  }

  private collapseTrendToQuarters(
    trend: Array<{ period: string; total: number }>,
  ): Array<{ period: string; total: number }> {
    const map = new Map<string, number>();
    for (const t of trend) {
      const qKey = this.monthToQuarter(t.period);
      map.set(qKey, (map.get(qKey) ?? 0) + t.total);
    }
    return Array.from(map.entries())
      .map(([period, total]) => ({ period, total }))
      .sort((a, b) => a.period.localeCompare(b.period));
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
