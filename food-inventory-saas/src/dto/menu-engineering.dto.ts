import { IsEnum, IsOptional, IsString, IsNumber } from "class-validator";

export class MenuEngineeringQueryDto {
  @IsOptional()
  @IsEnum(["7d", "14d", "30d", "60d", "90d"])
  period?: string = "30d";
}

export class ForecastingQueryDto {
  @IsOptional()
  @IsString()
  productId?: string; // Si no se envía, forecasting para todos los productos

  @IsOptional()
  @IsEnum(["7d", "14d", "30d"])
  forecastPeriod?: string = "7d"; // Período a predecir

  @IsOptional()
  @IsEnum(["7d", "14d", "30d", "60d", "90d"])
  historicalPeriod?: string = "30d"; // Período histórico para análisis
}

export class PriceOptimizationQueryDto {
  @IsOptional()
  @IsString()
  productId?: string; // Si no se envía, optimización para todos

  @IsOptional()
  @IsNumber()
  targetMargin?: number; // Margen objetivo en %
}

// Response interfaces
export interface MenuItemAnalysis {
  productId: string;
  productName: string;
  category: "star" | "plowhorse" | "puzzle" | "dog";
  quantitySold: number;
  revenue: number;
  cost: number;
  contributionMargin: number;
  contributionMarginPercent: number;
  avgPrice: number;
  recommendation: string;
  aiInsights?: {
    forecasting?: ProductForecast;
    priceOptimization?: PriceOptimizationSuggestion;
    smartSuggestions?: string[];
  };
}

export interface MenuEngineeringSummary {
  totalItems: number;
  totalRevenue: number;
  totalContributionMargin: number;
}

export interface MenuEngineeringMetrics {
  starsCount: number;
  starsRevenue: number;
  plowhorsesCount: number;
  plowhorsesRevenue: number;
  puzzlesCount: number;
  puzzlesRevenue: number;
  dogsCount: number;
  dogsRevenue: number;
}

export interface MenuEngineeringResponse {
  summary: MenuEngineeringSummary;
  metrics: MenuEngineeringMetrics;
  categories: {
    stars: MenuItemAnalysis[];
    plowhorses: MenuItemAnalysis[];
    puzzles: MenuItemAnalysis[];
    dogs: MenuItemAnalysis[];
  };
  period: {
    from: Date;
    to: Date;
  };
}

// AI-Enhanced Interfaces

export interface ProductForecast {
  productId: string;
  productName: string;
  currentAvgDailySales: number;
  predictedDailySales: number[];
  predictedTotalSales: number;
  trend: "increasing" | "decreasing" | "stable";
  confidence: number; // 0-100
  factors: string[];
  recommendations: string[];
}

export interface ForecastingResponse {
  period: {
    from: Date;
    to: Date;
    forecastDays: number;
  };
  forecasts: ProductForecast[];
  summary: {
    totalPredictedRevenue: number;
    totalPredictedUnits: number;
    highDemandProducts: string[];
    lowDemandProducts: string[];
  };
}

export interface PriceOptimizationSuggestion {
  productId: string;
  productName: string;
  currentPrice: number;
  currentMargin: number;
  suggestedPrice: number;
  suggestedMargin: number;
  expectedImpact: {
    revenueChange: number; // % change
    volumeChange: number; // % change
    profitChange: number; // $ change
  };
  reasoning: string[];
  confidence: number; // 0-100
  riskLevel: "low" | "medium" | "high";
}

export interface PriceOptimizationResponse {
  suggestions: PriceOptimizationSuggestion[];
  summary: {
    totalPotentialRevenueIncrease: number;
    totalPotentialProfitIncrease: number;
    itemsToAdjust: number;
  };
}

export interface SmartMenuSuggestion {
  type: "eliminate" | "promote" | "reformulate" | "reposition" | "bundle";
  productIds: string[];
  productNames: string[];
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  expectedImpact: string;
  actionItems: string[];
  estimatedROI?: number;
}

export interface SmartSuggestionsResponse {
  suggestions: SmartMenuSuggestion[];
  summary: {
    totalSuggestions: number;
    highPriority: number;
    estimatedTotalImpact: string;
  };
}
