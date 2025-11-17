import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Order, OrderDocument } from "../../schemas/order.schema";
import { Product, ProductDocument } from "../../schemas/product.schema";
import {
  BillOfMaterials,
  BillOfMaterialsDocument,
} from "../../schemas/bill-of-materials.schema";
import {
  MenuEngineeringQueryDto,
  MenuEngineeringResponse,
  MenuItemAnalysis,
} from "../../dto/menu-engineering.dto";

@Injectable()
export class MenuEngineeringService {
  private readonly logger = new Logger(MenuEngineeringService.name);

  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(BillOfMaterials.name)
    private readonly bomModel: Model<BillOfMaterialsDocument>,
  ) {}

  async analyze(
    query: MenuEngineeringQueryDto,
    tenantId: string,
  ): Promise<MenuEngineeringResponse> {
    const period = query.period || "30d";
    const dateRange = this.getPeriodDateRange(period);

    this.logger.log(
      `Analyzing menu for tenant ${tenantId} from ${dateRange.from} to ${dateRange.to}`,
    );

    // STEP 1: Get sales data from orders
    const salesData = await this.getSalesData(
      tenantId,
      dateRange.from,
      dateRange.to,
    );

    if (salesData.length === 0) {
      return this.getEmptyResponse(dateRange);
    }

    // STEP 2: Enrich with cost data from BOMs
    const enrichedData = await this.enrichWithCostData(salesData, tenantId);

    // STEP 3: Classify items into categories
    const classified = this.classifyMenuItems(enrichedData);

    // STEP 4: Build response
    return this.buildResponse(classified, dateRange);
  }

  private getPeriodDateRange(period: string): { from: Date; to: Date } {
    const to = new Date();
    const from = new Date();

    switch (period) {
      case "7d":
        from.setDate(from.getDate() - 7);
        break;
      case "14d":
        from.setDate(from.getDate() - 14);
        break;
      case "30d":
        from.setDate(from.getDate() - 30);
        break;
      case "60d":
        from.setDate(from.getDate() - 60);
        break;
      case "90d":
        from.setDate(from.getDate() - 90);
        break;
      default:
        from.setDate(from.getDate() - 30);
    }

    return { from, to };
  }

  private async getSalesData(
    tenantId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<any[]> {
    // Aggregate sales by product from orders
    const pipeline = [
      {
        $match: {
          tenantId: new Types.ObjectId(tenantId),
          createdAt: { $gte: fromDate, $lte: toDate },
          status: { $in: ["completed", "paid"] },
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          quantitySold: { $sum: "$items.quantity" },
          revenue: { $sum: "$items.finalAmount" },
          avgPrice: { $avg: "$items.finalAmount" },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: { path: "$product", preserveNullAndEmptyArrays: false } },
      {
        $project: {
          productId: "$_id",
          productName: "$product.name",
          productCategory: "$product.category",
          quantitySold: 1,
          revenue: 1,
          avgPrice: { $divide: ["$revenue", "$quantitySold"] },
        },
      },
    ];

    return this.orderModel.aggregate(pipeline).exec();
  }

  private async enrichWithCostData(
    salesData: any[],
    tenantId: string,
  ): Promise<any[]> {
    const enriched: any[] = [];

    for (const item of salesData) {
      // Find BOM for this product
      const bom = await this.bomModel
        .findOne({
          productId: item.productId,
          tenantId: new Types.ObjectId(tenantId),
          isActive: true,
        })
        .lean()
        .exec();

      let costPerUnit = 0;
      if (bom && (bom as any)?.costBreakdown) {
        costPerUnit = (bom as any).costBreakdown?.totalCost || 0;
      } else {
        // Fallback: use product cost if no BOM
        const product = await this.productModel
          .findById(item.productId)
          .lean()
          .exec();
        costPerUnit = (product as any)?.cost || 0;
      }

      const totalCost = costPerUnit * item.quantitySold;
      const contributionMargin = item.revenue - totalCost;
      const contributionMarginPercent =
        item.revenue > 0 ? (contributionMargin / item.revenue) * 100 : 0;

      enriched.push({
        ...item,
        costPerUnit,
        totalCost,
        contributionMargin,
        contributionMarginPercent,
      });
    }

    return enriched;
  }

  private classifyMenuItems(items: any[]): {
    stars: MenuItemAnalysis[];
    plowhorses: MenuItemAnalysis[];
    puzzles: MenuItemAnalysis[];
    dogs: MenuItemAnalysis[];
  } {
    if (items.length === 0) {
      return { stars: [], plowhorses: [], puzzles: [], dogs: [] };
    }

    // Calculate averages for classification
    const avgQuantitySold =
      items.reduce((sum, i) => sum + i.quantitySold, 0) / items.length;
    const avgContributionMarginPercent =
      items.reduce((sum, i) => sum + i.contributionMarginPercent, 0) /
      items.length;

    this.logger.debug(
      `Classification thresholds: avgQty=${avgQuantitySold}, avgMargin=${avgContributionMarginPercent}%`,
    );

    const stars: MenuItemAnalysis[] = [];
    const plowhorses: MenuItemAnalysis[] = [];
    const puzzles: MenuItemAnalysis[] = [];
    const dogs: MenuItemAnalysis[] = [];

    for (const item of items) {
      const isPopular = item.quantitySold >= avgQuantitySold;
      const isProfitable =
        item.contributionMarginPercent >= avgContributionMarginPercent;

      let category:
        | "star"
        | "plowhorse"
        | "puzzle"
        | "dog" = "dog";
      let recommendation = "";

      if (isPopular && isProfitable) {
        category = "star";
        recommendation =
          "Mantén la calidad, promociona activamente, entrena staff para upsell";
        stars.push(this.mapToAnalysis(item, category, recommendation));
      } else if (isPopular && !isProfitable) {
        category = "plowhorse";
        recommendation =
          "Aumenta precio gradualmente, reduce costos de ingredientes o porciones";
        plowhorses.push(this.mapToAnalysis(item, category, recommendation));
      } else if (!isPopular && isProfitable) {
        category = "puzzle";
        recommendation =
          "Mejora visibilidad en menú, capacita staff para recomendar, considera reducir precio";
        puzzles.push(this.mapToAnalysis(item, category, recommendation));
      } else {
        category = "dog";
        recommendation =
          "Evalúa eliminar del menú o reformular completamente";
        dogs.push(this.mapToAnalysis(item, category, recommendation));
      }
    }

    // Sort each category by revenue (descending)
    const sortByRevenue = (a: MenuItemAnalysis, b: MenuItemAnalysis) =>
      b.revenue - a.revenue;
    stars.sort(sortByRevenue);
    plowhorses.sort(sortByRevenue);
    puzzles.sort(sortByRevenue);
    dogs.sort(sortByRevenue);

    return { stars, plowhorses, puzzles, dogs };
  }

  private mapToAnalysis(
    item: any,
    category: "star" | "plowhorse" | "puzzle" | "dog",
    recommendation: string,
  ): MenuItemAnalysis {
    return {
      productId: item.productId.toString(),
      productName: item.productName,
      category,
      quantitySold: item.quantitySold,
      revenue: parseFloat(item.revenue.toFixed(2)),
      cost: parseFloat(item.totalCost.toFixed(2)),
      contributionMargin: parseFloat(item.contributionMargin.toFixed(2)),
      contributionMarginPercent: parseFloat(
        item.contributionMarginPercent.toFixed(1),
      ),
      avgPrice: parseFloat(item.avgPrice.toFixed(2)),
      recommendation,
    };
  }

  private buildResponse(
    classified: {
      stars: MenuItemAnalysis[];
      plowhorses: MenuItemAnalysis[];
      puzzles: MenuItemAnalysis[];
      dogs: MenuItemAnalysis[];
    },
    dateRange: { from: Date; to: Date },
  ): MenuEngineeringResponse {
    const allItems = [
      ...classified.stars,
      ...classified.plowhorses,
      ...classified.puzzles,
      ...classified.dogs,
    ];

    const summary = {
      totalItems: allItems.length,
      totalRevenue: allItems.reduce((sum, i) => sum + i.revenue, 0),
      totalContributionMargin: allItems.reduce(
        (sum, i) => sum + i.contributionMargin,
        0,
      ),
    };

    const metrics = {
      starsCount: classified.stars.length,
      starsRevenue: classified.stars.reduce((sum, i) => sum + i.revenue, 0),
      plowhorsesCount: classified.plowhorses.length,
      plowhorsesRevenue: classified.plowhorses.reduce(
        (sum, i) => sum + i.revenue,
        0,
      ),
      puzzlesCount: classified.puzzles.length,
      puzzlesRevenue: classified.puzzles.reduce((sum, i) => sum + i.revenue, 0),
      dogsCount: classified.dogs.length,
      dogsRevenue: classified.dogs.reduce((sum, i) => sum + i.revenue, 0),
    };

    return {
      summary,
      metrics,
      categories: {
        stars: classified.stars,
        plowhorses: classified.plowhorses,
        puzzles: classified.puzzles,
        dogs: classified.dogs,
      },
      period: {
        from: dateRange.from,
        to: dateRange.to,
      },
    };
  }

  private getEmptyResponse(dateRange: {
    from: Date;
    to: Date;
  }): MenuEngineeringResponse {
    return {
      summary: {
        totalItems: 0,
        totalRevenue: 0,
        totalContributionMargin: 0,
      },
      metrics: {
        starsCount: 0,
        starsRevenue: 0,
        plowhorsesCount: 0,
        plowhorsesRevenue: 0,
        puzzlesCount: 0,
        puzzlesRevenue: 0,
        dogsCount: 0,
        dogsRevenue: 0,
      },
      categories: {
        stars: [],
        plowhorses: [],
        puzzles: [],
        dogs: [],
      },
      period: {
        from: dateRange.from,
        to: dateRange.to,
      },
    };
  }
}
