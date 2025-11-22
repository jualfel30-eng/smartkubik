import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsMongoId,
  IsDateString,
  ValidateNested,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

// Environmental factors DTO (debe ir antes porque se usa en CreateWasteEntryDto)
class EnvironmentalFactorsDto {
  @IsOptional()
  @IsNumber()
  temperature?: number;

  @IsOptional()
  @IsNumber()
  humidity?: number;

  @IsOptional()
  @IsEnum(["refrigerated", "frozen", "ambient"])
  storageCondition?: string;
}

// DTO para crear entrada de desperdicio
export class CreateWasteEntryDto {
  @IsMongoId()
  productId: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsString()
  unit: string;

  @IsEnum([
    "spoilage",
    "overproduction",
    "preparation-error",
    "customer-return",
    "accident",
    "quality-issue",
    "expired",
    "broken-damaged",
    "other",
  ])
  reason: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  wasteDate?: string;

  @IsOptional()
  @IsBoolean()
  isPreventable?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => EnvironmentalFactorsDto)
  environmentalFactors?: EnvironmentalFactorsDto;
}

// DTO para actualizar entrada
export class UpdateWasteEntryDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsEnum([
    "spoilage",
    "overproduction",
    "preparation-error",
    "customer-return",
    "accident",
    "quality-issue",
    "expired",
    "broken-damaged",
    "other",
  ])
  reason?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isPreventable?: boolean;

  @IsOptional()
  @IsString()
  preventionSuggestion?: string;
}

// Query para filtrar reportes
export class WasteQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsMongoId()
  productId?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum([
    "spoilage",
    "overproduction",
    "preparation-error",
    "customer-return",
    "accident",
    "quality-issue",
    "expired",
    "broken-damaged",
    "other",
  ])
  reason?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsBoolean()
  isPreventable?: boolean;
}

// Response con analytics
export interface WasteAnalyticsResponse {
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalEntries: number;
    totalQuantity: number;
    totalCost: number;
    preventableWaste: {
      count: number;
      cost: number;
      percentage: number;
    };
  };
  byReason: Array<{
    reason: string;
    count: number;
    quantity: number;
    cost: number;
    percentage: number;
  }>;
  byCategory: Array<{
    category: string;
    count: number;
    quantity: number;
    cost: number;
    percentage: number;
  }>;
  byLocation: Array<{
    location: string;
    count: number;
    quantity: number;
    cost: number;
  }>;
  topWastedProducts: Array<{
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    cost: number;
    frequency: number;
    mainReason: string;
  }>;
  trends: {
    dailyAverage: number;
    weeklyTrend: "increasing" | "decreasing" | "stable";
    peakDays: string[]; // Días con más desperdicio
    peakReasons: string[]; // Razones más comunes
  };
  recommendations: string[];
}

// Response de tendencias temporales
export interface WasteTrendsResponse {
  period: {
    start: Date;
    end: Date;
  };
  dailyData: Array<{
    date: string;
    count: number;
    quantity: number;
    cost: number;
  }>;
  weeklyComparison: {
    currentWeek: number;
    previousWeek: number;
    change: number; // Porcentaje
  };
  monthlyComparison: {
    currentMonth: number;
    previousMonth: number;
    change: number;
  };
}

// DTO para batch crear entradas (útil para importación)
export class BatchCreateWasteDto {
  @ValidateNested({ each: true })
  @Type(() => CreateWasteEntryDto)
  entries: CreateWasteEntryDto[];
}
