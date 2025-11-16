import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsMongoId,
  IsArray,
  ValidateNested,
  IsDateString,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";

// Registro de propina en orden
export class RegisterTipsDto {
  @IsNumber()
  @Min(0)
  amount: number;

  @IsEnum(["cash", "card", "digital"])
  method: string;
}

// Crear regla de distribución
class TipsDistributionRulesDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  hourlyWeight?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  salesWeight?: number;

  @IsOptional()
  @IsString()
  customFormula?: string;

  @IsArray()
  @IsString({ each: true })
  includedRoles: string[];

  @IsBoolean()
  poolTips: boolean;
}

export class CreateTipsDistributionRuleDto {
  @IsString()
  name: string;

  @IsEnum(["equal", "by-hours", "by-sales", "custom"])
  type: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ValidateNested()
  @Type(() => TipsDistributionRulesDto)
  rules: TipsDistributionRulesDto;
}

export class UpdateTipsDistributionRuleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(["equal", "by-hours", "by-sales", "custom"])
  type?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => TipsDistributionRulesDto)
  rules?: TipsDistributionRulesDto;
}

// Distribuir propinas
export class DistributeTipsDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsMongoId()
  distributionRuleId: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  employeeIds?: string[]; // opcional, para distribuir solo a ciertos empleados
}

// Query para obtener reporte
export class TipsReportQueryDto {
  @IsOptional()
  @IsDateString()
  start?: string;

  @IsOptional()
  @IsDateString()
  end?: string;

  @IsOptional()
  @IsEnum(["pending", "distributed", "paid"])
  status?: string;
}

// Query para reporte consolidado
export class ConsolidatedTipsQueryDto {
  @IsOptional()
  @IsString()
  period?: string; // 'last-week', 'last-month', etc

  @IsOptional()
  @IsDateString()
  start?: string;

  @IsOptional()
  @IsDateString()
  end?: string;
}
