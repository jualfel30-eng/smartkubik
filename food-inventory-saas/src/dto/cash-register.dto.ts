import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

// ============================================
// DTOs para Fondos de Caja
// ============================================

export class CashDenominationsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  d_500?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  d_200?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  d_100?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  d_50?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  d_20?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  d_10?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  d_5?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  d_2?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  d_1?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  coins?: number;
}

export class CashFundDto {
  @IsString()
  currency: string; // 'USD', 'VES'

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => CashDenominationsDto)
  denominations?: CashDenominationsDto;
}

// ============================================
// DTOs para Apertura de Caja
// ============================================

export class OpenCashRegisterDto {
  @IsString()
  registerName: string; // "Caja 1", "Caja Principal"

  @IsOptional()
  @IsString()
  registerId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CashFundDto)
  openingFunds?: CashFundDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  openingAmountUsd?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  openingAmountVes?: number;

  @IsOptional()
  @IsString()
  openingNotes?: string;

  @IsOptional()
  @IsString()
  workShift?: string; // 'morning', 'afternoon', 'night'
}

// ============================================
// DTOs para Movimientos de Efectivo
// ============================================

export class CashMovementDto {
  @IsEnum(['in', 'out'])
  type: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  currency: string;

  @IsString()
  reason: string; // 'change_request', 'petty_cash', 'bank_deposit', 'expense', 'correction', 'other'

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  reference?: string;
}

// ============================================
// DTOs para Cierre de Caja
// ============================================

export class CashDifferenceDto {
  @IsString()
  currency: string;

  @IsNumber()
  declaredAmount: number;

  @IsOptional()
  @IsString()
  explanation?: string;
}

export class CloseCashRegisterDto {
  @IsMongoId()
  sessionId: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CashFundDto)
  closingFunds?: CashFundDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  closingAmountUsd?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  closingAmountVes?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CashDifferenceDto)
  declaredAmounts?: CashDifferenceDto[];

  @IsOptional()
  @IsString()
  closingNotes?: string;

  @IsOptional()
  @IsNumber()
  exchangeRate?: number;
}

// ============================================
// DTOs para Cierre Global (Admin)
// ============================================

export class CreateGlobalClosingDto {
  @IsDateString()
  periodStart: string;

  @IsDateString()
  periodEnd: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  sessionIds?: string[]; // IDs de sesiones a incluir (vacío = todas las del período)

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  cashierIds?: string[]; // Filtrar por cajeros específicos

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  registerNames?: string[]; // Filtrar por cajas específicas

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  exchangeRate?: number;
}

// ============================================
// DTOs para Consulta y Filtros
// ============================================

export class CashRegisterQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsMongoId()
  cashierId?: string;

  @IsOptional()
  @IsString()
  registerName?: string;

  @IsOptional()
  @IsEnum(['open', 'closing', 'closed', 'suspended'])
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}

export class CashRegisterClosingQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsMongoId()
  cashierId?: string;

  @IsOptional()
  @IsString()
  registerName?: string;

  @IsOptional()
  @IsEnum(['individual', 'consolidated'])
  closingType?: string;

  @IsOptional()
  @IsEnum(['draft', 'pending_approval', 'approved', 'rejected'])
  status?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  hasDifferences?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}

// ============================================
// DTOs para Aprobación/Rechazo
// ============================================

export class ApproveClosingDto {
  @IsMongoId()
  closingId: string;

  @IsOptional()
  @IsString()
  approvalNotes?: string;
}

export class RejectClosingDto {
  @IsMongoId()
  closingId: string;

  @IsString()
  rejectionReason: string;
}

// ============================================
// DTOs para Exportación
// ============================================

export class ExportClosingDto {
  @IsOptional()
  @IsMongoId()
  closingId?: string;

  @IsEnum(['pdf', 'csv', 'excel'])
  format: string;

  @IsOptional()
  @IsBoolean()
  includeTransactions?: boolean;

  @IsOptional()
  @IsBoolean()
  includePaymentDetails?: boolean;
}

export class ExportMultipleClosingsDto {
  @IsArray()
  @IsMongoId({ each: true })
  closingIds: string[];

  @IsEnum(['pdf', 'csv', 'excel'])
  format: string;

  @IsOptional()
  @IsBoolean()
  consolidate?: boolean; // Unificar en un solo documento
}

// ============================================
// DTOs para Reportes
// ============================================

export class CashRegisterReportDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  cashierIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  registerNames?: string[];

  @IsOptional()
  @IsEnum(['daily', 'weekly', 'monthly'])
  groupBy?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  includeDetails?: boolean;
}

// ============================================
// DTOs de Respuesta
// ============================================

export class PaymentMethodSummaryResponseDto {
  methodId: string;
  methodName: string;
  currency: string;
  transactionCount: number;
  totalAmount: number;
  totalAmountUsd: number;
  totalAmountVes: number;
  igtfAmount: number;
  tipsAmount: number;
}

export class TaxSummaryResponseDto {
  taxType: string;
  rate: number;
  baseAmount: number;
  taxAmount: number;
  transactionCount: number;
}

export class CashRegisterClosingSummaryDto {
  closingNumber: string;
  registerName: string;
  cashierName: string;
  periodStart: Date;
  periodEnd: Date;
  totalTransactions: number;
  totalGrossSalesUsd: number;
  totalGrossSalesVes: number;
  totalNetSalesUsd: number;
  totalNetSalesVes: number;
  totalIvaCollected: number;
  totalIgtfCollected: number;
  totalTipsUsd: number;
  totalTipsVes: number;
  hasDifferences: boolean;
  cashDifferences: {
    currency: string;
    expectedAmount: number;
    declaredAmount: number;
    difference: number;
    status: string;
  }[];
  paymentMethodSummary: PaymentMethodSummaryResponseDto[];
  taxSummary: TaxSummaryResponseDto[];
  status: string;
  exchangeRate: number;
}
