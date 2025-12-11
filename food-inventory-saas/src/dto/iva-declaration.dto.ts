import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsDateString,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';

/**
 * DTO para iniciar/calcular una declaración de IVA
 */
export class CalculateIvaDeclarationDto {
  @IsNumber()
  @Min(1)
  @Max(12)
  month: number;

  @IsNumber()
  year: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  previousCreditBalance?: number; // Excedente del período anterior

  @IsBoolean()
  @IsOptional()
  autoCalculate?: boolean; // Calcular automáticamente desde libros
}

/**
 * DTO para actualizar valores manualmente
 */
export class UpdateIvaDeclarationDto {
  @IsNumber()
  @IsOptional()
  @Min(0)
  salesBaseAmount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  salesIvaAmount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  salesExemptAmount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  salesExportAmount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  purchasesBaseAmount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  purchasesIvaAmount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  purchasesImportAmount?: number;

  @IsNumber()
  @IsOptional()
  ivaWithheldOnSales?: number;

  @IsNumber()
  @IsOptional()
  ivaWithheldOnPurchases?: number;

  @IsNumber()
  @IsOptional()
  previousCreditBalance?: number;

  @IsNumber()
  @IsOptional()
  adjustments?: number;

  @IsString()
  @IsOptional()
  adjustmentReason?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  penalties?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  interests?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

/**
 * DTO para presentar la declaración a SENIAT
 */
export class FileIvaDeclarationDto {
  @IsDateString()
  @IsOptional()
  filingDate?: string; // Si no se especifica, se usa la fecha actual

  @IsBoolean()
  @IsOptional()
  generateXML?: boolean; // Generar XML para SENIAT

  @IsBoolean()
  @IsOptional()
  validateBeforeFiling?: boolean; // Validar antes de presentar
}

/**
 * DTO para registrar pago de la declaración
 */
export class RecordPaymentDto {
  @IsDateString()
  @IsNotEmpty()
  paymentDate: string;

  @IsString()
  @IsNotEmpty()
  paymentReference: string; // Referencia bancaria

  @IsNumber()
  @Min(0)
  amountPaid: number;

  @IsString()
  @IsOptional()
  paymentMethod?: string; // Transferencia, cheque, etc.

  @IsString()
  @IsOptional()
  notes?: string;
}

/**
 * DTO para rectificar una declaración
 */
export class RectifyIvaDeclarationDto {
  @IsString()
  @IsNotEmpty()
  rectificationReason: string;

  @IsNumber()
  @IsOptional()
  month?: number;

  @IsNumber()
  @IsOptional()
  year?: number;
}
