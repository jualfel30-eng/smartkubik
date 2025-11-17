import { IsEnum, IsOptional } from "class-validator";

export class MenuEngineeringQueryDto {
  @IsOptional()
  @IsEnum(["7d", "14d", "30d", "60d", "90d"])
  period?: string = "30d";
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
