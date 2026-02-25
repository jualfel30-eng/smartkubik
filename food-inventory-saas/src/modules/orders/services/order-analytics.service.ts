import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Order, OrderDocument } from "../../../schemas/order.schema";
import { Tenant, TenantDocument } from "../../../schemas/tenant.schema";
import { OrderQueryDto } from "../../../dto/order.dto";
import { getVerticalProfile } from "../../../config/vertical-profiles";

@Injectable()
export class OrderAnalyticsService {
  private readonly logger = new Logger(OrderAnalyticsService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
  ) {}

  async getTopSellingProducts(
    tenantId: string,
    limit: number = 5,
  ): Promise<any[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return this.orderModel.aggregate([
      {
        $match: {
          tenantId: new Types.ObjectId(tenantId),
          status: { $ne: "cancelled" },
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          totalQuantity: { $sum: "$items.quantity" },
          totalRevenue: {
            $sum: { $multiply: ["$items.quantity", "$items.unitPrice"] },
          },
          productName: { $first: "$items.productName" },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      { $unwind: { path: "$productInfo", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          productName: { $ifNull: ["$productInfo.name", "$productName"] },
          totalQuantity: 1,
          totalRevenue: 1,
        },
      },
    ]);
  }

  async exportOrders(
    query: OrderQueryDto,
    tenantId: string,
    buildOrderQuery: (query: OrderQueryDto, tenantId: string) => any,
  ): Promise<string> {
    const { filter, sortOptions, limit } = buildOrderQuery(query, tenantId);
    const effectiveLimit = Math.min(Math.max(limit, 1), 5000);

    const orders = await this.orderModel
      .find(filter)
      .sort(sortOptions)
      .limit(effectiveLimit)
      .populate("customerId", "name")
      .lean();

    const tenant = await this.tenantModel
      .findById(tenantId)
      .select("verticalProfile")
      .lean();
    const verticalProfile = getVerticalProfile(
      tenant?.verticalProfile?.key,
      tenant?.verticalProfile?.overrides,
    );
    const productAttributes = verticalProfile.attributeSchema.filter(
      (attr) => attr.scope === "product",
    );
    const variantAttributes = verticalProfile.attributeSchema.filter(
      (attr) => attr.scope === "variant",
    );

    const headers = [
      "OrderNumber",
      "Fecha",
      "Cliente",
      "Estado",
      "TotalUSD",
      "SKU",
      "Producto",
      "VarianteSKU",
      "Cantidad",
      "PrecioTotal",
    ]
      .concat(
        productAttributes.map(
          (attr) =>
            `Atributo Producto (${attr.key})${attr.label ? ` - ${attr.label}` : ""}`,
        ),
      )
      .concat(
        variantAttributes.map(
          (attr) =>
            `Atributo Variante (${attr.key})${attr.label ? ` - ${attr.label}` : ""}`,
        ),
      );

    const rows: string[][] = [];

    for (const order of orders) {
      const createdAt = order.createdAt
        ? new Date(order.createdAt).toISOString()
        : "";

      for (const item of order.items || []) {
        const attributes = item.attributes || {};
        const baseRow: (string | number)[] = [
          order.orderNumber || "",
          createdAt,
          order.customerName || "",
          order.status || "",
          order.totalAmount ?? 0,
          item.productSku || "",
          item.productName || "",
          item.variantSku || "",
          item.quantity ?? 0,
          item.totalPrice ?? 0,
        ];

        const productAttributeValues = productAttributes.map(
          (attr) => attributes?.[attr.key] ?? "",
        );
        const variantAttributeValues = variantAttributes.map(
          (attr) => attributes?.[attr.key] ?? "",
        );

        const row = baseRow
          .concat(productAttributeValues)
          .concat(variantAttributeValues)
          .map((value) =>
            value === null || value === undefined ? "" : String(value),
          );

        rows.push(row);
      }
    }

    const csvRows = [headers]
      .concat(rows)
      .map((row) =>
        row.map((value) => `"${value.replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    return `\uFEFF${csvRows}`;
  }

  async getAnalyticsBySource(
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    const matchQuery: any = { tenantId };

    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) {
        matchQuery.createdAt.$gte = startDate;
      }
      if (endDate) {
        matchQuery.createdAt.$lte = endDate;
      }
    }

    const analytics = await this.orderModel.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$source",
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" },
          averageOrderValue: { $avg: "$totalAmount" },
        },
      },
      {
        $project: {
          _id: 0,
          source: "$_id",
          totalOrders: 1,
          totalRevenue: { $round: ["$totalRevenue", 2] },
          averageOrderValue: { $round: ["$averageOrderValue", 2] },
        },
      },
      { $sort: { totalRevenue: -1 } },
    ]);

    const summary = await this.orderModel.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" },
          averageOrderValue: { $avg: "$totalAmount" },
        },
      },
      {
        $project: {
          _id: 0,
          totalOrders: 1,
          totalRevenue: { $round: ["$totalRevenue", 2] },
          averageOrderValue: { $round: ["$averageOrderValue", 2] },
        },
      },
    ]);

    return {
      bySource: analytics,
      summary: summary[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
      },
      dateRange: {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      },
    };
  }
}
