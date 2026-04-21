import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Order, OrderDocument } from "../../schemas/order.schema";
import { Product, ProductDocument } from "../../schemas/product.schema";
import { Inventory, InventoryDocument } from "../../schemas/inventory.schema";
import { Supplier, SupplierDocument } from "../../schemas/supplier.schema";
import {
  TenantMetrics,
  TenantMetricsDocument,
} from "../../schemas/tenant-metrics.schema";
import {
  TenantEventLog,
  TenantEventLogDocument,
} from "../../schemas/tenant-event-log.schema";
import { TenantEventService } from "../tenant-events/tenant-event.service";

@Injectable()
export class IntelligenceService {
  private readonly logger = new Logger(IntelligenceService.name);

  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Inventory.name)
    private readonly inventoryModel: Model<InventoryDocument>,
    @InjectModel(Supplier.name)
    private readonly supplierModel: Model<SupplierDocument>,
    @InjectModel(TenantMetrics.name)
    private readonly metricsModel: Model<TenantMetricsDocument>,
    @InjectModel(TenantEventLog.name)
    private readonly eventLogModel: Model<TenantEventLogDocument>,
    private readonly tenantEventService: TenantEventService,
  ) {}

  /**
   * Generate daily insights for a tenant.
   * Called by the scheduler or on-demand via AI tool.
   */
  async generateDailyInsights(tenantId: string): Promise<{
    salesInsights: any;
    inventoryAlerts: any;
    supplierAlerts: any;
    suggestions: string[];
  }> {
    const tenantOid = new Types.ObjectId(tenantId);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [salesInsights, inventoryAlerts, supplierAlerts] = await Promise.all([
      this.analyzeSales(tenantOid, yesterday, todayStart, thirtyDaysAgo),
      this.checkInventoryAlerts(tenantOid),
      this.analyzeSupplierPerformance(tenantOid),
    ]);

    const suggestions = this.generateSuggestions(
      salesInsights,
      inventoryAlerts,
      supplierAlerts,
    );

    return { salesInsights, inventoryAlerts, supplierAlerts, suggestions };
  }

  /**
   * Calculate and store aggregated metrics for a tenant.
   */
  async calculateMetrics(tenantId: string): Promise<TenantMetricsDocument> {
    const tenantOid = new Types.ObjectId(tenantId);
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    // Sales metrics
    const [recentOrders, previousOrders] = await Promise.all([
      this.orderModel
        .find({
          tenantId: tenantOid,
          createdAt: { $gte: thirtyDaysAgo },
        })
        .select("totalAmount items createdAt customer")
        .lean(),
      this.orderModel
        .find({
          tenantId: tenantOid,
          createdAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
        })
        .select("totalAmount")
        .lean(),
    ]);

    const recentTotal = recentOrders.reduce(
      (s, o: any) => s + (o.totalAmount || 0),
      0,
    );
    const previousTotal = previousOrders.reduce(
      (s, o: any) => s + (o.totalAmount || 0),
      0,
    );
    const weeklyTrend =
      previousTotal > 0
        ? ((recentTotal - previousTotal) / previousTotal) * 100
        : 0;

    // Top products from orders
    const productSales: Record<
      string,
      { name: string; qty: number; revenue: number }
    > = {};
    for (const order of recentOrders as any[]) {
      for (const item of order.items || []) {
        const key = item.productId?.toString() || item.productName;
        if (!productSales[key]) {
          productSales[key] = {
            name: item.productName || key,
            qty: 0,
            revenue: 0,
          };
        }
        productSales[key].qty += item.quantity || 0;
        productSales[key].revenue += (item.quantity || 0) * (item.price || 0);
      }
    }
    const topProducts = Object.entries(productSales)
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .slice(0, 10)
      .map(([id, data]) => ({
        productId: id,
        name: data.name,
        quantity: data.qty,
        revenue: data.revenue,
      }));

    // Peak day of week
    const dayCount = [0, 0, 0, 0, 0, 0, 0];
    for (const order of recentOrders) {
      dayCount[new Date(order.createdAt as any).getDay()]++;
    }
    const dayNames = [
      "domingo",
      "lunes",
      "martes",
      "miercoles",
      "jueves",
      "viernes",
      "sabado",
    ];
    const peakDayIdx = dayCount.indexOf(Math.max(...dayCount));

    // Inventory metrics
    const inventories = await this.inventoryModel
      .find({ tenantId: tenantOid, isDeleted: { $ne: true } })
      .select("availableQuantity averageCostPrice alerts productName")
      .lean();

    const totalValue = inventories.reduce(
      (s, i: any) =>
        s + (i.availableQuantity || 0) * (i.averageCostPrice || 0),
      0,
    );
    const belowReorder = inventories.filter(
      (i: any) => i.alerts?.lowStock,
    ).length;

    // AI metrics (event count)
    const totalEvents = await this.tenantEventService.getTotalEventCount(
      tenantId,
    );

    const metrics = {
      salesMetrics: {
        dailyAverage: recentTotal / 30,
        weeklyTrend: Math.round(weeklyTrend * 10) / 10,
        monthlyTotal: recentTotal,
        topProducts,
        topCustomers: [],
        peakDayOfWeek: dayNames[peakDayIdx],
        peakHour: 12,
      },
      inventoryMetrics: {
        totalValue,
        turnoverRate: totalValue > 0 ? recentTotal / totalValue : 0,
        itemsBelowReorder: belowReorder,
        itemsExpiringSoon: 0,
        deadStock: [],
      },
      supplierMetrics: {
        averageLeadTime: 0,
        topSuppliers: [],
        lateDeliveryRate: 0,
      },
      aiMetrics: {
        totalEventsProcessed: totalEvents,
        totalWhatsAppInteractions: 0,
        totalActionsExecuted: 0,
        insightsSent: 0,
        estimatedHoursSaved: Math.round(totalEvents * 0.02), // ~1.2 min per event automated
      },
      lastCalculatedAt: now,
    };

    const result = await this.metricsModel.findOneAndUpdate(
      { tenantId: tenantOid },
      { $set: metrics },
      { upsert: true, new: true },
    );

    return result;
  }

  /**
   * Get the "intelligence trap" summary — shows accumulated AI value.
   */
  async getIntelligenceSummary(tenantId: string): Promise<Record<string, any>> {
    const [metrics, eventCount] = await Promise.all([
      this.metricsModel
        .findOne({ tenantId: new Types.ObjectId(tenantId) })
        .lean(),
      this.tenantEventService.getTotalEventCount(tenantId),
    ]);

    return {
      ok: true,
      summary: {
        totalTransaccionesProcesadas: eventCount,
        horasEstimadasAhorradas: metrics?.aiMetrics?.estimatedHoursSaved || 0,
        insightsEnviados: metrics?.aiMetrics?.insightsSent || 0,
        valorInventario: metrics?.inventoryMetrics?.totalValue
          ? `$${metrics.inventoryMetrics.totalValue.toFixed(2)}`
          : "$0.00",
        tendenciaVentas:
          metrics?.salesMetrics?.weeklyTrend !== undefined
            ? `${metrics.salesMetrics.weeklyTrend > 0 ? "+" : ""}${metrics.salesMetrics.weeklyTrend}%`
            : "—",
        diaPicoVentas: metrics?.salesMetrics?.peakDayOfWeek || "—",
        mensaje:
          eventCount > 100
            ? `Tu AI ha procesado ${eventCount} transacciones y ha aprendido patrones unicos de tu negocio. Cada dia que pasa, las sugerencias son mas precisas.`
            : `Tu AI esta aprendiendo tu negocio. Con ${eventCount} transacciones procesadas, las sugerencias mejoraran con cada operacion.`,
      },
    };
  }

  // ─── Private Analysis Methods ─────────────────────────────────────

  private async analyzeSales(
    tenantOid: Types.ObjectId,
    yesterday: Date,
    todayStart: Date,
    thirtyDaysAgo: Date,
  ) {
    const yesterdayOrders = await this.orderModel
      .find({
        tenantId: tenantOid,
        createdAt: { $gte: yesterday, $lt: todayStart },
      })
      .select("totalAmount items")
      .lean();

    const total = yesterdayOrders.reduce(
      (s, o: any) => s + (o.totalAmount || 0),
      0,
    );

    return {
      ventasAyer: `$${total.toFixed(2)}`,
      ordenesAyer: yesterdayOrders.length,
    };
  }

  private async checkInventoryAlerts(tenantOid: Types.ObjectId) {
    const lowStock = await this.inventoryModel
      .find({
        tenantId: tenantOid,
        availableQuantity: { $lte: 5 },
        isDeleted: { $ne: true },
      })
      .select("productName productSku availableQuantity")
      .limit(10)
      .lean();

    return {
      productosStockBajo: lowStock.map((i: any) => ({
        producto: i.productName || i.productSku,
        stock: i.availableQuantity,
      })),
    };
  }

  private async analyzeSupplierPerformance(tenantOid: Types.ObjectId) {
    // Simplified — check suppliers with late deliveries
    const suppliers = await this.supplierModel
      .find({
        tenantId: tenantOid,
        isDeleted: { $ne: true },
        "metrics.onTimeDeliveryRate": { $lt: 80 },
      })
      .select("name metrics.onTimeDeliveryRate metrics.totalOrders")
      .limit(5)
      .lean();

    return {
      proveedoresConRetrasos: suppliers.map((s: any) => ({
        nombre: s.name,
        tasaATiempo: `${s.metrics?.onTimeDeliveryRate || 0}%`,
      })),
    };
  }

  private generateSuggestions(
    sales: any,
    inventory: any,
    suppliers: any,
  ): string[] {
    const suggestions: string[] = [];

    if (inventory.productosStockBajo?.length > 0) {
      suggestions.push(
        `Tienes ${inventory.productosStockBajo.length} producto(s) con stock bajo. Considera generar una propuesta de compra.`,
      );
    }

    if (suppliers.proveedoresConRetrasos?.length > 0) {
      suggestions.push(
        `${suppliers.proveedoresConRetrasos.length} proveedor(es) tienen tasa de entrega a tiempo menor a 80%. Considera diversificar.`,
      );
    }

    return suggestions;
  }
}
