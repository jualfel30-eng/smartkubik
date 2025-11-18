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

// Exportar propinas a nómina
export class ExportTipsToPayrollDto {
  @IsMongoId()
  payrollRunId: string; // ID del PayrollRun al que se exportarán las propinas

  @IsDateString()
  periodStart: string; // Período de propinas a exportar

  @IsDateString()
  periodEnd: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  employeeIds?: string[]; // Opcional: solo exportar propinas de ciertos empleados

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  taxRate?: number; // Tasa de impuesto sobre propinas (default: 0)

  @IsOptional()
  @IsEnum(["federal", "state", "local"])
  taxJurisdiction?: string; // Jurisdicción fiscal

  @IsOptional()
  @IsBoolean()
  calculateTaxes?: boolean; // Si se debe calcular retención de impuestos
}

// Calcular impuestos sobre propinas
export class CalculateTipsTaxesDto {
  @IsDateString()
  periodStart: string;

  @IsDateString()
  periodEnd: string;

  @IsOptional()
  @IsMongoId()
  employeeId?: string; // Opcional: calcular solo para un empleado

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  federalTaxRate?: number; // Tasa federal (default: valor del tenant)

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  stateTaxRate?: number; // Tasa estatal

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  localTaxRate?: number; // Tasa local
}

// Response de exportación
export interface ExportTipsToPayrollResponse {
  success: boolean;
  payrollRunId: string;
  employeesProcessed: number;
  totalTipsExported: number;
  totalTaxWithholding: number;
  exportedReports: Array<{
    employeeId: string;
    employeeName: string;
    tipsAmount: number;
    taxWithholding: number;
    netTips: number;
  }>;
}

// Response de cálculo de impuestos
export interface TipsTaxCalculationResponse {
  period: {
    start: Date;
    end: Date;
  };
  calculations: Array<{
    employeeId: string;
    employeeName: string;
    totalTips: number;
    taxableAmount: number;
    federalTax: number;
    stateTax: number;
    localTax: number;
    totalTax: number;
    netTips: number;
  }>;
  summary: {
    totalEmployees: number;
    totalTips: number;
    totalTaxableAmount: number;
    totalTaxWithholding: number;
    totalNetTips: number;
  };
}
