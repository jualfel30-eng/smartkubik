import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { ConfigService } from "@nestjs/config";
import { ChatOpenAI } from "@langchain/openai";
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
  ForecastingQueryDto,
  ForecastingResponse,
  ProductForecast,
  PriceOptimizationQueryDto,
  PriceOptimizationResponse,
  PriceOptimizationSuggestion,
  SmartSuggestionsResponse,
  SmartMenuSuggestion,
} from "../../dto/menu-engineering.dto";

@Injectable()
export class MenuEngineeringService {
  private readonly logger = new Logger(MenuEngineeringService.name);
  private llm: ChatOpenAI | null = null;

  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(BillOfMaterials.name)
    private readonly bomModel: Model<BillOfMaterialsDocument>,
    private readonly configService: ConfigService,
  ) {
    const openaiKey = this.configService.get<string>("OPENAI_API_KEY");
    if (openaiKey && openaiKey !== "your-openai-api-key-here") {
      this.llm = new ChatOpenAI({
        openAIApiKey: openaiKey,
        modelName: "gpt-4o-mini",
        temperature: 0.3,
      });
      this.logger.log("OpenAI LLM initialized for Menu Engineering");
    } else {
      this.logger.warn(
        "OpenAI API key not configured - AI features will be disabled",
      );
    }
  }

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

  // ========== AI-POWERED FEATURES ==========

  /**
   * Forecasting con IA - Predice demanda futura basado en histórico
   */
  async forecastDemand(
    query: ForecastingQueryDto,
    tenantId: string,
  ): Promise<ForecastingResponse> {
    const historicalPeriod = query.historicalPeriod || "30d";
    const forecastPeriod = query.forecastPeriod || "7d";

    const dateRange = this.getPeriodDateRange(historicalPeriod);
    const salesData = await this.getSalesData(
      tenantId,
      dateRange.from,
      dateRange.to,
    );

    if (salesData.length === 0) {
      throw new Error("No hay datos históricos suficientes para forecasting");
    }

    // Filtrar por producto específico si se proporciona
    const products = query.productId
      ? salesData.filter((p) => p.productId.toString() === query.productId)
      : salesData;

    // Obtener datos diarios para análisis de tendencias
    const dailySalesData = await this.getDailySalesData(
      tenantId,
      dateRange.from,
      dateRange.to,
    );

    const forecasts: ProductForecast[] = [];
    const forecastDays = this.getForecastDays(forecastPeriod);

    for (const product of products) {
      const productDailySales = dailySalesData.filter(
        (d) => d.productId.toString() === product.productId.toString(),
      );

      const forecast = await this.generateProductForecast(
        product,
        productDailySales,
        forecastDays,
      );

      forecasts.push(forecast);
    }

    // Calcular summary
    const totalPredictedUnits = forecasts.reduce(
      (sum, f) => sum + f.predictedTotalSales,
      0,
    );

    // Estimación de revenue (usando precio promedio histórico)
    const totalPredictedRevenue = forecasts.reduce((sum, f) => {
      const product = products.find(
        (p) => p.productId.toString() === f.productId,
      );
      return sum + (product?.avgPrice || 0) * f.predictedTotalSales;
    }, 0);

    // Identificar productos de alta/baja demanda
    const avgPredicted =
      forecasts.reduce((sum, f) => sum + f.predictedTotalSales, 0) /
      forecasts.length;

    const highDemandProducts = forecasts
      .filter((f) => f.predictedTotalSales > avgPredicted * 1.2)
      .map((f) => f.productName);

    const lowDemandProducts = forecasts
      .filter((f) => f.predictedTotalSales < avgPredicted * 0.5)
      .map((f) => f.productName);

    return {
      period: {
        from: new Date(),
        to: new Date(Date.now() + forecastDays * 24 * 60 * 60 * 1000),
        forecastDays,
      },
      forecasts,
      summary: {
        totalPredictedRevenue,
        totalPredictedUnits,
        highDemandProducts,
        lowDemandProducts,
      },
    };
  }

  /**
   * Optimización de precios con IA
   */
  async optimizePrices(
    query: PriceOptimizationQueryDto,
    tenantId: string,
  ): Promise<PriceOptimizationResponse> {
    // Obtener análisis actual
    const analysis = await this.analyze({ period: "30d" }, tenantId);
    const allItems = [
      ...analysis.categories.stars,
      ...analysis.categories.plowhorses,
      ...analysis.categories.puzzles,
      ...analysis.categories.dogs,
    ];

    // Filtrar por producto específico si se proporciona
    const items = query.productId
      ? allItems.filter((i) => i.productId === query.productId)
      : allItems;

    const suggestions: PriceOptimizationSuggestion[] = [];

    for (const item of items) {
      const suggestion = await this.generatePriceOptimization(
        item,
        query.targetMargin,
      );
      if (suggestion) {
        suggestions.push(suggestion);
      }
    }

    // Calcular summary
    const totalPotentialRevenueIncrease = suggestions.reduce(
      (sum, s) => sum + s.expectedImpact.profitChange,
      0,
    );

    const totalPotentialProfitIncrease = suggestions.reduce(
      (sum, s) => sum + s.expectedImpact.profitChange,
      0,
    );

    return {
      suggestions,
      summary: {
        totalPotentialRevenueIncrease,
        totalPotentialProfitIncrease,
        itemsToAdjust: suggestions.length,
      },
    };
  }

  /**
   * Sugerencias inteligentes con IA
   */
  async generateSmartSuggestions(
    tenantId: string,
  ): Promise<SmartSuggestionsResponse> {
    // Obtener análisis actual
    const analysis = await this.analyze({ period: "30d" }, tenantId);

    if (!this.llm) {
      // Fallback sin IA: sugerencias básicas por categoría
      return this.generateBasicSuggestions(analysis);
    }

    const suggestions: SmartMenuSuggestion[] = [];

    // 1. Sugerencias para Dogs (eliminar o reformular)
    if (analysis.categories.dogs.length > 0) {
      const dogSuggestion = await this.generateDogsSuggestion(
        analysis.categories.dogs,
      );
      suggestions.push(dogSuggestion);
    }

    // 2. Sugerencias para Puzzles (promocionar)
    if (analysis.categories.puzzles.length > 0) {
      const puzzleSuggestion = await this.generatePuzzlesSuggestion(
        analysis.categories.puzzles,
      );
      suggestions.push(puzzleSuggestion);
    }

    // 3. Sugerencias para Plowhorses (aumentar margen)
    if (analysis.categories.plowhorses.length > 0) {
      const plowhorseSuggestion = await this.generatePlowhorsesSuggestion(
        analysis.categories.plowhorses,
      );
      suggestions.push(plowhorseSuggestion);
    }

    // 4. Sugerencias para Stars (mantener y promocionar más)
    if (analysis.categories.stars.length > 0) {
      const starSuggestion = await this.generateStarsSuggestion(
        analysis.categories.stars,
      );
      suggestions.push(starSuggestion);
    }

    // 5. Sugerencias de bundles con IA
    const bundleSuggestion = await this.generateBundleSuggestions(analysis);
    if (bundleSuggestion) {
      suggestions.push(bundleSuggestion);
    }

    const highPriority = suggestions.filter((s) => s.priority === "high").length;

    return {
      suggestions,
      summary: {
        totalSuggestions: suggestions.length,
        highPriority,
        estimatedTotalImpact:
          "Se estima un aumento de 15-25% en rentabilidad implementando todas las sugerencias",
      },
    };
  }

  // ========== HELPER METHODS ==========

  private getForecastDays(period: string): number {
    switch (period) {
      case "7d":
        return 7;
      case "14d":
        return 14;
      case "30d":
        return 30;
      default:
        return 7;
    }
  }

  private async getDailySalesData(
    tenantId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<any[]> {
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
          _id: {
            productId: "$items.productId",
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          },
          quantity: { $sum: "$items.quantity" },
          revenue: { $sum: "$items.finalAmount" },
        },
      },
      {
        $project: {
          productId: "$_id.productId",
          date: "$_id.date",
          quantity: 1,
          revenue: 1,
        },
      },
      { $sort: { date: 1 } },
    ];

    return this.orderModel.aggregate(pipeline as any).exec();
  }

  private async generateProductForecast(
    product: any,
    dailySales: any[],
    forecastDays: number,
  ): Promise<ProductForecast> {
    const totalDays =
      dailySales.length > 0 ? new Set(dailySales.map((d) => d.date)).size : 1;
    const currentAvgDailySales = product.quantitySold / totalDays;

    // Análisis de tendencia simple (sin IA por ahora)
    let trend: "increasing" | "decreasing" | "stable" = "stable";
    if (dailySales.length >= 7) {
      const firstWeekAvg =
        dailySales.slice(0, 7).reduce((sum, d) => sum + d.quantity, 0) / 7;
      const lastWeekAvg =
        dailySales
          .slice(-7)
          .reduce((sum, d) => sum + (d.quantity || 0), 0) / 7;

      if (lastWeekAvg > firstWeekAvg * 1.1) trend = "increasing";
      else if (lastWeekAvg < firstWeekAvg * 0.9) trend = "decreasing";
    }

    // Predicción simple: usar promedio con ajuste por tendencia
    let multiplier = 1.0;
    if (trend === "increasing") multiplier = 1.15;
    if (trend === "decreasing") multiplier = 0.85;

    const predictedDaily = currentAvgDailySales * multiplier;
    const predictedDailySales = Array(forecastDays).fill(predictedDaily);
    const predictedTotalSales = predictedDaily * forecastDays;

    // Usar IA si está disponible para mejorar predicciones
    if (this.llm) {
      try {
        const aiInsights = await this.getAIForecastInsights(
          product,
          dailySales,
          trend,
        );
        return {
          productId: product.productId.toString(),
          productName: product.productName,
          currentAvgDailySales: parseFloat(currentAvgDailySales.toFixed(2)),
          predictedDailySales: predictedDailySales.map((v) =>
            parseFloat(v.toFixed(2)),
          ),
          predictedTotalSales: parseFloat(predictedTotalSales.toFixed(0)),
          trend,
          confidence: 75,
          factors: aiInsights.factors,
          recommendations: aiInsights.recommendations,
        };
      } catch (error) {
        this.logger.error("Error getting AI insights for forecast", error);
      }
    }

    // Fallback sin IA
    return {
      productId: product.productId.toString(),
      productName: product.productName,
      currentAvgDailySales: parseFloat(currentAvgDailySales.toFixed(2)),
      predictedDailySales: predictedDailySales.map((v) =>
        parseFloat(v.toFixed(2)),
      ),
      predictedTotalSales: parseFloat(predictedTotalSales.toFixed(0)),
      trend,
      confidence: 65,
      factors: ["Promedio histórico", `Tendencia ${trend}`],
      recommendations: this.getBasicRecommendations(trend, product.productName),
    };
  }

  private async getAIForecastInsights(
    product: any,
    dailySales: any[],
    trend: string,
  ): Promise<{ factors: string[]; recommendations: string[] }> {
    if (!this.llm) {
      return { factors: [], recommendations: [] };
    }

    const prompt = `Analiza el siguiente producto de restaurante y proporciona insights:

Producto: ${product.productName}
Ventas totales: ${product.quantitySold} unidades
Tendencia: ${trend}
Precio promedio: $${product.avgPrice}
Margen: ${product.contributionMarginPercent}%

Ventas diarias (últimos ${dailySales.length} días): ${dailySales.map((d) => d.quantity).join(", ")}

Proporciona:
1. 3 factores clave que explican la demanda
2. 3 recomendaciones accionables

Responde en formato JSON:
{
  "factors": ["factor1", "factor2", "factor3"],
  "recommendations": ["rec1", "rec2", "rec3"]
}`;

    const response = await this.llm.invoke(prompt);
    const content =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    try {
      const parsed = JSON.parse(content);
      return parsed;
    } catch (error) {
      this.logger.error("Error parsing AI response", error);
      return { factors: [], recommendations: [] };
    }
  }

  private getBasicRecommendations(
    trend: string,
    productName: string,
  ): string[] {
    if (trend === "increasing") {
      return [
        `Asegurar inventario suficiente de ${productName}`,
        "Considerar promoción especial para maximizar ventas",
        "Capacitar staff para upsell este producto",
      ];
    } else if (trend === "decreasing") {
      return [
        `Evaluar razones de baja demanda para ${productName}`,
        "Considerar promoción o descuento temporal",
        "Revisar calidad y presentación del platillo",
      ];
    } else {
      return [
        "Mantener niveles de inventario actuales",
        "Monitorear tendencias semanalmente",
        "Considerar variaciones estacionales",
      ];
    }
  }

  private async generatePriceOptimization(
    item: MenuItemAnalysis,
    targetMargin?: number,
  ): Promise<PriceOptimizationSuggestion | null> {
    // Lógica de optimización
    let suggestedPrice = item.avgPrice;
    let reasoning: string[] = [];
    let riskLevel: "low" | "medium" | "high" = "low";

    if (item.category === "plowhorse") {
      // Plowhorses: aumentar precio para mejorar margen
      const targetMarginPercent = targetMargin || 30;
      const costPerUnit = item.cost / item.quantitySold;
      suggestedPrice = costPerUnit / (1 - targetMarginPercent / 100);

      const priceIncrease =
        ((suggestedPrice - item.avgPrice) / item.avgPrice) * 100;

      if (priceIncrease > 15) {
        riskLevel = "high";
        reasoning.push(
          "Aumento de precio >15% puede afectar significativamente la demanda",
        );
      } else if (priceIncrease > 10) {
        riskLevel = "medium";
        reasoning.push("Aumento moderado de precio con riesgo controlado");
      } else {
        riskLevel = "low";
        reasoning.push("Aumento pequeño de precio con bajo riesgo");
      }

      reasoning.push(
        `Producto muy popular pero poco rentable - mejorar margen`,
      );
      reasoning.push(
        `Elasticidad de demanda baja debido a alta popularidad`,
      );
    } else if (item.category === "puzzle") {
      // Puzzles: reducir precio levemente para aumentar demanda
      suggestedPrice = item.avgPrice * 0.9;
      riskLevel = "low";
      reasoning.push("Reducción de precio para aumentar visibilidad");
      reasoning.push("Producto rentable pero poco popular");
      reasoning.push("Mayor volumen puede compensar reducción de margen");
    } else if (item.category === "dog") {
      // Dogs: no optimizar precio, mejor eliminar o reformular
      return null;
    } else {
      // Stars: mantener precio o aumentar levemente
      return null; // No necesitan ajuste
    }

    const suggestedMargin =
      ((suggestedPrice - item.cost / item.quantitySold) / suggestedPrice) * 100;

    // Estimaciones de impacto
    const priceChange = ((suggestedPrice - item.avgPrice) / item.avgPrice) * 100;
    let volumeChange = 0;

    if (priceChange > 0) {
      // Aumento de precio: asumimos elasticidad -0.5
      volumeChange = priceChange * -0.5;
    } else {
      // Reducción de precio: asumimos elasticidad -1.2
      volumeChange = priceChange * -1.2;
    }

    const newVolume = item.quantitySold * (1 + volumeChange / 100);
    const newRevenue = newVolume * suggestedPrice;
    const currentRevenue = item.revenue;
    const revenueChange = ((newRevenue - currentRevenue) / currentRevenue) * 100;

    const newProfit = newVolume * (suggestedPrice - item.cost / item.quantitySold);
    const currentProfit = item.contributionMargin;
    const profitChange = newProfit - currentProfit;

    return {
      productId: item.productId,
      productName: item.productName,
      currentPrice: parseFloat(item.avgPrice.toFixed(2)),
      currentMargin: parseFloat(item.contributionMarginPercent.toFixed(1)),
      suggestedPrice: parseFloat(suggestedPrice.toFixed(2)),
      suggestedMargin: parseFloat(suggestedMargin.toFixed(1)),
      expectedImpact: {
        revenueChange: parseFloat(revenueChange.toFixed(1)),
        volumeChange: parseFloat(volumeChange.toFixed(1)),
        profitChange: parseFloat(profitChange.toFixed(2)),
      },
      reasoning,
      confidence: riskLevel === "low" ? 85 : riskLevel === "medium" ? 70 : 55,
      riskLevel,
    };
  }

  private generateBasicSuggestions(
    analysis: MenuEngineeringResponse,
  ): SmartSuggestionsResponse {
    const suggestions: SmartMenuSuggestion[] = [];

    if (analysis.categories.dogs.length > 0) {
      suggestions.push({
        type: "eliminate",
        productIds: analysis.categories.dogs.map((d) => d.productId),
        productNames: analysis.categories.dogs.map((d) => d.productName),
        priority: "high",
        title: "Eliminar platillos de bajo rendimiento",
        description: `${analysis.categories.dogs.length} platillos con baja popularidad y baja rentabilidad`,
        expectedImpact:
          "Liberar recursos de cocina y mejorar eficiencia operativa",
        actionItems: [
          "Revisar feedback de clientes sobre estos platillos",
          "Considerar reemplazo con productos más rentables",
          "Evaluar si hay versiones mejoradas posibles",
        ],
      });
    }

    if (analysis.categories.puzzles.length > 0) {
      suggestions.push({
        type: "promote",
        productIds: analysis.categories.puzzles.map((p) => p.productId),
        productNames: analysis.categories.puzzles.map((p) => p.productName),
        priority: "high",
        title: "Promocionar platillos rentables",
        description: `${analysis.categories.puzzles.length} platillos con alta rentabilidad pero baja popularidad`,
        expectedImpact: "Aumento estimado de 20-30% en ventas de estos items",
        actionItems: [
          "Destacar en menú con diseño especial",
          "Capacitar meseros para recomendar activamente",
          "Crear combo con platillos populares",
          "Publicar en redes sociales con fotografías atractivas",
        ],
      });
    }

    return {
      suggestions,
      summary: {
        totalSuggestions: suggestions.length,
        highPriority: suggestions.filter((s) => s.priority === "high").length,
        estimatedTotalImpact:
          "Implementando estas sugerencias se estima mejora de 15-20% en rentabilidad",
      },
    };
  }

  private async generateDogsSuggestion(
    dogs: MenuItemAnalysis[],
  ): Promise<SmartMenuSuggestion> {
    return {
      type: "eliminate",
      productIds: dogs.slice(0, 5).map((d) => d.productId),
      productNames: dogs.slice(0, 5).map((d) => d.productName),
      priority: "high",
      title: "Eliminar o reformular platillos de bajo rendimiento",
      description: `${dogs.length} platillos con baja popularidad y baja rentabilidad están afectando tu eficiencia`,
      expectedImpact:
        "Reducción de complejidad operativa y mejora de rentabilidad general",
      actionItems: [
        "Hacer prueba de eliminación temporal de 2 semanas",
        "Evaluar impacto en costos de inventario",
        "Considerar reformulación con ingredientes más económicos",
        "Analizar feedback de clientes antes de decisión final",
      ],
      estimatedROI: dogs.reduce((sum, d) => sum + Math.abs(d.contributionMargin), 0),
    };
  }

  private async generatePuzzlesSuggestion(
    puzzles: MenuItemAnalysis[],
  ): Promise<SmartMenuSuggestion> {
    return {
      type: "promote",
      productIds: puzzles.slice(0, 5).map((p) => p.productId),
      productNames: puzzles.slice(0, 5).map((p) => p.productName),
      priority: "high",
      title: "Aumentar visibilidad de platillos rentables",
      description: `${puzzles.length} platillos altamente rentables necesitan más exposición`,
      expectedImpact: "Aumento proyectado de 25-35% en ventas de estos items",
      actionItems: [
        "Posicionar en lugar destacado del menú físico",
        "Entrenamiento especial para meseros (comisión adicional)",
        "Crear campaña de redes sociales con fotografía profesional",
        "Ofrecer degustación gratuita pequeña a clientes frecuentes",
        "Considerar reducción de precio de 5-10% para impulsar demanda inicial",
      ],
      estimatedROI:
        puzzles.reduce((sum, p) => sum + p.contributionMargin, 0) * 0.3,
    };
  }

  private async generatePlowhorsesSuggestion(
    plowhorses: MenuItemAnalysis[],
  ): Promise<SmartMenuSuggestion> {
    return {
      type: "reformulate",
      productIds: plowhorses.slice(0, 5).map((p) => p.productId),
      productNames: plowhorses.slice(0, 5).map((p) => p.productName),
      priority: "medium",
      title: "Mejorar rentabilidad de platillos populares",
      description: `${plowhorses.length} platillos muy vendidos pero poco rentables`,
      expectedImpact: "Aumento de margen de 5-10% sin afectar ventas",
      actionItems: [
        "Revisar proveedores para reducir costo de ingredientes",
        "Ajustar tamaño de porciones (reducción de 5-10%)",
        "Aumentar precio gradualmente (2-3% cada 2 meses)",
        "Sustituir ingredientes costosos por alternativas similares",
        "Crear versión premium con mayor margen",
      ],
      estimatedROI:
        plowhorses.reduce((sum, p) => sum + p.revenue, 0) * 0.08,
    };
  }

  private async generateStarsSuggestion(
    stars: MenuItemAnalysis[],
  ): Promise<SmartMenuSuggestion> {
    return {
      type: "promote",
      productIds: stars.slice(0, 3).map((s) => s.productId),
      productNames: stars.slice(0, 3).map((s) => s.productName),
      priority: "medium",
      title: "Maximizar ventas de platillos estrella",
      description: `${stars.length} platillos son tus estrellas - mantén su éxito`,
      expectedImpact: "Proteger y aumentar ingresos de productos top",
      actionItems: [
        "Garantizar calidad consistente al 100%",
        "Nunca permitir que se agoten (prioridad en inventario)",
        "Crear variaciones premium con mayor precio",
        "Usar como ancla para upselling de acompañamientos",
        "Destacar en marketing y redes sociales",
      ],
      estimatedROI: stars.reduce((sum, s) => sum + s.contributionMargin, 0) * 0.15,
    };
  }

  private async generateBundleSuggestions(
    analysis: MenuEngineeringResponse,
  ): Promise<SmartMenuSuggestion | null> {
    const stars = analysis.categories.stars;
    const puzzles = analysis.categories.puzzles;

    if (stars.length === 0 || puzzles.length === 0) {
      return null;
    }

    // Combinar 1 star + 1 puzzle
    const topStar = stars[0];
    const topPuzzle = puzzles[0];

    return {
      type: "bundle",
      productIds: [topStar.productId, topPuzzle.productId],
      productNames: [topStar.productName, topPuzzle.productName],
      priority: "high",
      title: "Crear combo estratégico",
      description: `Combinar "${topStar.productName}" (popular) con "${topPuzzle.productName}" (rentable)`,
      expectedImpact:
        "Aumentar ventas del producto rentable aprovechando popularidad del otro",
      actionItems: [
        `Crear combo a precio especial (15% descuento vs suma individual)`,
        "Destacar ahorro en menú",
        "Capacitar meseros para ofrecer combo",
        "Medir impacto durante 4 semanas",
      ],
      estimatedROI: topPuzzle.contributionMargin * 10, // Estimamos vender 10 combos adicionales
    };
  }
}
