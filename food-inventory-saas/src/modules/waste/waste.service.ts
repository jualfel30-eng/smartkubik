import { Injectable, NotFoundException, InternalServerErrorException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  WasteEntry,
  WasteEntryDocument,
} from "../../schemas/waste-entry.schema";
import { Product, ProductDocument } from "../../schemas/product.schema";
import {
  CreateWasteEntryDto,
  UpdateWasteEntryDto,
  WasteQueryDto,
  WasteAnalyticsResponse,
  WasteTrendsResponse,
} from "../../dto/waste.dto";
import { ConfigService } from "@nestjs/config";
import { ChatOpenAI } from "@langchain/openai";
import { InventoryService } from "../inventory/inventory.service";

@Injectable()
export class WasteService {
  private llm: ChatOpenAI | null = null;

  constructor(
    @InjectModel(WasteEntry.name)
    private readonly wasteModel: Model<WasteEntryDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    private readonly inventoryService: InventoryService,
    private readonly configService: ConfigService,
  ) {
    // Inicializar OpenAI si está disponible
    const openaiKey = this.configService.get<string>("OPENAI_API_KEY");
    if (openaiKey && openaiKey !== "your-openai-api-key-here") {
      this.llm = new ChatOpenAI({
        openAIApiKey: openaiKey,
        modelName: "gpt-4o-mini",
        temperature: 0.4,
      });
    }
  }

  /**
   * Crear nueva entrada de desperdicio
   */
  async create(
    dto: CreateWasteEntryDto,
    tenantId: string,
    userId?: string,
    userName?: string,
  ): Promise<WasteEntry> {
    // Obtener información del producto
    const product = await this.productModel
      .findOne({
        _id: new Types.ObjectId(dto.productId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: { $ne: true },
      })
      .exec();

    if (!product) {
      throw new NotFoundException("Product not found");
    }

    try {
      // Calcular costo - obtener del primer/preferido proveedor
      let costPerUnit = 0;
      if (product.suppliers && product.suppliers.length > 0) {
        const preferredSupplier = product.suppliers.find((s) => s.isPreferred);
        costPerUnit =
          preferredSupplier?.costPrice || product.suppliers[0].costPrice || 0;
      } else if (product.sellingUnits && product.sellingUnits.length > 0) {
        const defaultUnit = product.sellingUnits.find((u) => u.isDefault);
        costPerUnit =
          defaultUnit?.costPerUnit || product.sellingUnits[0].costPerUnit || 0;
      }
      // If we fall through here, costPerUnit remains 0, which is safe
      console.log(`Computed costPerUnit: ${costPerUnit} for product ${product._id}`);
      const totalCost = costPerUnit * dto.quantity;

      // Generar sugerencia de prevención si es AI-powered
      let preventionSuggestion: string | undefined;
      if (this.llm && dto.isPreventable) {
        preventionSuggestion = await this.generatePreventionSuggestion(
          product.name,
          dto.reason,
          dto.quantity,
          dto.unit,
        );
      }

      const entry = new this.wasteModel({
        tenantId: new Types.ObjectId(tenantId),
        productId: new Types.ObjectId(dto.productId),
        productName: product.name,
        sku: product.sku,
        quantity: dto.quantity,
        unit: dto.unit,
        reason: dto.reason,
        costPerUnit,
        totalCost,
        location: dto.location,
        notes: dto.notes,
        wasteDate: dto.wasteDate ? new Date(dto.wasteDate) : new Date(),
        isPreventable: dto.isPreventable || false,
        preventionSuggestion,
        reportedBy: userId ? new Types.ObjectId(userId) : undefined,
        reportedByName: userName,
        category: Array.isArray(product.category) ? product.category[0] : product.category,
        environmentalFactors: dto.environmentalFactors,
      });

      const savedEntry = await entry.save();

      // Deduct from inventory
      try {
        // Find inventory item for this product
        // We need to find the inventory ID. Since createMovement requires inventoryId,
        // we first find the inventory.
        // NOTE: InventoryService.createMovement expects inventoryId, but we might not have it easily if there are multiple lots.
        // However, usually there is one main inventory record per product/variant.

        const inventory = await this.inventoryService["inventoryModel"].findOne({
          productId: new Types.ObjectId(dto.productId),
          tenantId: new Types.ObjectId(tenantId),
          isActive: true
        });

        if (inventory) {
          await this.inventoryService.createMovement(
            {
              inventoryId: inventory._id.toString(),
              productId: dto.productId,
              productSku: product.sku,
              movementType: "out",
              quantity: dto.quantity,
              unitCost: costPerUnit,
              reason: `Merma: ${dto.reason}`,
              reference: savedEntry._id.toString(),
            } as any, // casting to any to avoid strict DTO validation issues if minor mismatches exist
            { id: userId, tenantId }, // user context
          );
        } else {
          console.warn(`No inventory found for waste product ${dto.productId} to deduct stock.`);
        }
      } catch (error) {
        console.error("Error deducting inventory for waste (STACK):", error.stack);
        console.error("Error deducting inventory for waste (MSG):", error.message);
        // We don't fail the waste creation if inventory update fails, but log it
      }

      return savedEntry;
    } catch (error) {
      console.error("Error in WasteService.create:", error);
      throw new InternalServerErrorException(`Error creating waste entry: ${(error as any).message} - Stack: ${(error as any).stack}`);
    }
  }

  /**
   * Obtener todas las entradas con filtros
   */
  async findAll(query: WasteQueryDto, tenantId: string): Promise<WasteEntry[]> {
    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };

    if (query.startDate || query.endDate) {
      filter.wasteDate = {};
      if (query.startDate) {
        filter.wasteDate.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        filter.wasteDate.$lte = new Date(query.endDate);
      }
    }

    if (query.productId) {
      filter.productId = new Types.ObjectId(query.productId);
    }

    if (query.category) {
      filter.category = query.category;
    }

    if (query.reason) {
      filter.reason = query.reason;
    }

    if (query.location) {
      filter.location = query.location;
    }

    if (query.isPreventable !== undefined) {
      filter.isPreventable = query.isPreventable;
    }

    return this.wasteModel
      .find(filter)
      .populate("productId")
      .sort({ wasteDate: -1 })
      .exec();
  }

  /**
   * Obtener una entrada por ID
   */
  async findOne(id: string, tenantId: string): Promise<WasteEntry> {
    const entry = await this.wasteModel
      .findOne({
        _id: new Types.ObjectId(id),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      })
      .populate("productId")
      .exec();

    if (!entry) {
      throw new NotFoundException("Waste entry not found");
    }

    return entry;
  }

  /**
   * Actualizar entrada
   */
  async update(
    id: string,
    dto: UpdateWasteEntryDto,
    tenantId: string,
  ): Promise<WasteEntry> {
    const entry = await this.findOne(id, tenantId);

    Object.assign(entry, dto);

    // Recalcular costo si cambió la cantidad
    if (dto.quantity) {
      entry.totalCost = entry.costPerUnit * dto.quantity;
    }

    return entry.save();
  }

  /**
   * Eliminar entrada (soft delete)
   */
  async remove(id: string, tenantId: string): Promise<void> {
    const entry = await this.findOne(id, tenantId);
    entry.isDeleted = true;
    await entry.save();
  }

  /**
   * Obtener analytics completo
   */
  async getAnalytics(
    query: WasteQueryDto,
    tenantId: string,
  ): Promise<WasteAnalyticsResponse> {
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
      wasteDate: { $gte: startDate, $lte: endDate },
      isDeleted: false,
    };

    const entries = await this.wasteModel.find(filter).exec();

    // Summary
    const totalEntries = entries.length;
    const totalQuantity = entries.reduce((sum, e) => sum + e.quantity, 0);
    const totalCost = entries.reduce((sum, e) => sum + e.totalCost, 0);

    const preventableEntries = entries.filter((e) => e.isPreventable);
    const preventableCost = preventableEntries.reduce(
      (sum, e) => sum + e.totalCost,
      0,
    );

    // By Reason
    const reasonMap = new Map<string, any>();
    entries.forEach((e) => {
      if (!reasonMap.has(e.reason)) {
        reasonMap.set(e.reason, { count: 0, quantity: 0, cost: 0 });
      }
      const stats = reasonMap.get(e.reason);
      stats.count += 1;
      stats.quantity += e.quantity;
      stats.cost += e.totalCost;
    });

    const byReason = Array.from(reasonMap.entries()).map(([reason, stats]) => ({
      reason,
      count: stats.count,
      quantity: stats.quantity,
      cost: stats.cost,
      percentage: totalCost > 0 ? (stats.cost / totalCost) * 100 : 0,
    }));

    // By Category
    const categoryMap = new Map<string, any>();
    entries.forEach((e) => {
      const cat = e.category || "uncategorized";
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, { count: 0, quantity: 0, cost: 0 });
      }
      const stats = categoryMap.get(cat);
      stats.count += 1;
      stats.quantity += e.quantity;
      stats.cost += e.totalCost;
    });

    const byCategory = Array.from(categoryMap.entries()).map(
      ([category, stats]) => ({
        category,
        count: stats.count,
        quantity: stats.quantity,
        cost: stats.cost,
        percentage: totalCost > 0 ? (stats.cost / totalCost) * 100 : 0,
      }),
    );

    // By Location
    const locationMap = new Map<string, any>();
    entries.forEach((e) => {
      const loc = e.location || "unknown";
      if (!locationMap.has(loc)) {
        locationMap.set(loc, { count: 0, quantity: 0, cost: 0 });
      }
      const stats = locationMap.get(loc);
      stats.count += 1;
      stats.quantity += e.quantity;
      stats.cost += e.totalCost;
    });

    const byLocation = Array.from(locationMap.entries()).map(
      ([location, stats]) => ({
        location,
        count: stats.count,
        quantity: stats.quantity,
        cost: stats.cost,
      }),
    );

    // Top Wasted Products
    const productMap = new Map<string, any>();
    entries.forEach((e) => {
      const key = e.productId.toString();
      if (!productMap.has(key)) {
        productMap.set(key, {
          productId: e.productId.toString(),
          productName: e.productName,
          sku: e.sku || "",
          quantity: 0,
          cost: 0,
          frequency: 0,
          reasonsCount: new Map(),
        });
      }
      const stats = productMap.get(key);
      stats.quantity += e.quantity;
      stats.cost += e.totalCost;
      stats.frequency += 1;

      const reasonCount = stats.reasonsCount.get(e.reason) || 0;
      stats.reasonsCount.set(e.reason, reasonCount + 1);
    });

    const topWastedProducts = Array.from(productMap.values())
      .map((p) => {
        // Encontrar la razón más común
        let mainReason = "unknown";
        let maxCount = 0;
        p.reasonsCount.forEach((count: number, reason: string) => {
          if (count > maxCount) {
            maxCount = count;
            mainReason = reason;
          }
        });

        return {
          productId: p.productId,
          productName: p.productName,
          sku: p.sku,
          quantity: p.quantity,
          cost: p.cost,
          frequency: p.frequency,
          mainReason,
        };
      })
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);

    // Trends
    const daysDiff = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const dailyAverage = daysDiff > 0 ? totalCost / daysDiff : 0;

    // Determinar tendencia
    const midpoint = new Date(
      startDate.getTime() + (endDate.getTime() - startDate.getTime()) / 2,
    );
    const firstHalfCost = entries
      .filter((e) => e.wasteDate < midpoint)
      .reduce((sum, e) => sum + e.totalCost, 0);
    const secondHalfCost = entries
      .filter((e) => e.wasteDate >= midpoint)
      .reduce((sum, e) => sum + e.totalCost, 0);

    let weeklyTrend: "increasing" | "decreasing" | "stable" = "stable";
    if (secondHalfCost > firstHalfCost * 1.1) {
      weeklyTrend = "increasing";
    } else if (secondHalfCost < firstHalfCost * 0.9) {
      weeklyTrend = "decreasing";
    }

    // Peak days
    const dayWasteMap = new Map<string, number>();
    entries.forEach((e) => {
      const dayName = e.wasteDate.toLocaleDateString("en-US", {
        weekday: "long",
      });
      dayWasteMap.set(dayName, (dayWasteMap.get(dayName) || 0) + e.totalCost);
    });

    const peakDays = Array.from(dayWasteMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map((e) => e[0]);

    // Peak reasons
    const peakReasons = byReason
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 3)
      .map((r) => r.reason);

    // Generate Recommendations
    const recommendations = await this.generateRecommendations(
      byReason,
      topWastedProducts,
      preventableEntries.length,
      totalEntries,
      weeklyTrend,
    );

    return {
      period: { start: startDate, end: endDate },
      summary: {
        totalEntries,
        totalQuantity,
        totalCost,
        preventableWaste: {
          count: preventableEntries.length,
          cost: preventableCost,
          percentage: totalCost > 0 ? (preventableCost / totalCost) * 100 : 0,
        },
      },
      byReason,
      byCategory,
      byLocation,
      topWastedProducts,
      trends: {
        dailyAverage,
        weeklyTrend,
        peakDays,
        peakReasons,
      },
      recommendations,
    };
  }

  /**
   * Obtener tendencias temporales
   */
  async getTrends(
    query: WasteQueryDto,
    tenantId: string,
  ): Promise<WasteTrendsResponse> {
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    const entries = await this.wasteModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        wasteDate: { $gte: startDate, $lte: endDate },
        isDeleted: false,
      })
      .exec();

    // Daily data
    const dailyMap = new Map<string, any>();
    entries.forEach((e) => {
      const dateKey = e.wasteDate.toISOString().split("T")[0];
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, { count: 0, quantity: 0, cost: 0 });
      }
      const stats = dailyMap.get(dateKey);
      stats.count += 1;
      stats.quantity += e.quantity;
      stats.cost += e.totalCost;
    });

    const dailyData = Array.from(dailyMap.entries())
      .map(([date, stats]) => ({
        date,
        count: stats.count,
        quantity: stats.quantity,
        cost: stats.cost,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Weekly comparison
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const currentWeek = entries
      .filter((e) => e.wasteDate >= weekAgo)
      .reduce((sum, e) => sum + e.totalCost, 0);

    const previousWeek = entries
      .filter((e) => e.wasteDate >= twoWeeksAgo && e.wasteDate < weekAgo)
      .reduce((sum, e) => sum + e.totalCost, 0);

    const weeklyChange =
      previousWeek > 0
        ? ((currentWeek - previousWeek) / previousWeek) * 100
        : 0;

    // Monthly comparison
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const currentMonth = entries
      .filter((e) => e.wasteDate >= monthAgo)
      .reduce((sum, e) => sum + e.totalCost, 0);

    const previousMonth = entries
      .filter((e) => e.wasteDate >= twoMonthsAgo && e.wasteDate < monthAgo)
      .reduce((sum, e) => sum + e.totalCost, 0);

    const monthlyChange =
      previousMonth > 0
        ? ((currentMonth - previousMonth) / previousMonth) * 100
        : 0;

    return {
      period: { start: startDate, end: endDate },
      dailyData,
      weeklyComparison: {
        currentWeek,
        previousWeek,
        change: weeklyChange,
      },
      monthlyComparison: {
        currentMonth,
        previousMonth,
        change: monthlyChange,
      },
    };
  }

  // ===== MÉTODOS PRIVADOS =====

  /**
   * Generar sugerencia de prevención con AI
   */
  private async generatePreventionSuggestion(
    productName: string,
    reason: string,
    quantity: number,
    unit: string,
  ): Promise<string> {
    if (!this.llm) {
      return this.getBasicPreventionSuggestion(reason);
    }

    try {
      const prompt = `Como experto en gestión de restaurantes, sugiere 1-2 acciones específicas y prácticas para prevenir el siguiente desperdicio:

Producto: ${productName}
Razón del desperdicio: ${reason}
Cantidad desperdiciada: ${quantity} ${unit}

Provee una sugerencia concisa (máximo 2 oraciones) enfocada en prevención práctica.`;

      const response = await this.llm.invoke(prompt);
      return response.content.toString().trim();
    } catch (error) {
      console.error("Error generating AI prevention suggestion:", error);
      return this.getBasicPreventionSuggestion(reason);
    }
  }

  /**
   * Sugerencias básicas sin AI
   */
  private getBasicPreventionSuggestion(reason: string): string {
    const suggestions: Record<string, string> = {
      spoilage:
        "Implementar sistema FIFO y revisar fechas de caducidad diariamente.",
      overproduction:
        "Ajustar niveles de producción basándose en demanda histórica.",
      "preparation-error":
        "Reforzar capacitación del personal en técnicas de preparación.",
      "customer-return":
        "Mejorar control de calidad antes de servir al cliente.",
      accident: "Revisar procedimientos de seguridad y organización en cocina.",
      "quality-issue": "Mejorar control de calidad en recepción de mercancía.",
      expired: "Implementar alertas de proximidad de caducidad.",
      "broken-damaged": "Mejorar condiciones de almacenamiento y manejo.",
      other: "Analizar causa raíz y documentar procedimientos de prevención.",
    };

    return suggestions[reason] || suggestions.other;
  }

  /**
   * Generar recomendaciones basadas en analytics
   */
  private async generateRecommendations(
    byReason: any[],
    topProducts: any[],
    preventableCount: number,
    totalCount: number,
    trend: string,
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Recomendaciones basadas en razón principal
    if (byReason.length > 0) {
      const topReason = byReason[0];
      if (topReason.percentage > 30) {
        recommendations.push(
          `${topReason.reason} representa ${topReason.percentage.toFixed(1)}% del desperdicio. Prioriza acciones para reducir esta causa.`,
        );
      }
    }

    // Recomendaciones basadas en productos
    if (topProducts.length > 0 && topProducts[0].cost > 0) {
      recommendations.push(
        `${topProducts[0].productName} es el producto con mayor desperdicio ($${topProducts[0].cost.toFixed(2)}). Implementa controles específicos.`,
      );
    }

    // Desperdicio prevenible
    if (preventableCount > 0 && totalCount > 0) {
      const preventablePercentage = (preventableCount / totalCount) * 100;
      if (preventablePercentage > 50) {
        recommendations.push(
          `${preventablePercentage.toFixed(0)}% del desperdicio es prevenible. Enfócate en mejorar procedimientos operativos.`,
        );
      }
    }

    // Tendencia
    if (trend === "increasing") {
      recommendations.push(
        "El desperdicio está aumentando. Revisa cambios recientes en operaciones o proveedores.",
      );
    } else if (trend === "decreasing") {
      recommendations.push(
        "El desperdicio está disminuyendo. Continúa con las prácticas actuales.",
      );
    }

    // Si no hay recomendaciones, agregar una genérica
    if (recommendations.length === 0) {
      recommendations.push(
        "Implementa un sistema de revisión semanal de desperdicios para identificar patrones.",
      );
    }

    return recommendations;
  }
}
