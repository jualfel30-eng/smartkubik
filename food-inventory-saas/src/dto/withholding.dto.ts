import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsDateString,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { WithholdingType, WithholdingStatus } from '../schemas/withholding-document.schema';

/**
 * DTO para crear una retención IVA desde una factura
 */
export class CreateIvaRetentionDto {
  @ApiProperty({ description: 'ID de la factura a la que se aplica la retención' })
  @IsMongoId()
  @IsNotEmpty()
  affectedDocumentId: string;

  @ApiProperty({
    description: 'Porcentaje de retención IVA (75 o 100)',
    enum: [75, 100],
    example: 75,
  })
  @IsNumber()
  @IsIn([75, 100])
  @IsNotEmpty()
  retentionPercentage: 75 | 100;

  @ApiProperty({ description: 'ID de la serie para el comprobante' })
  @IsMongoId()
  @IsNotEmpty()
  seriesId: string;

  @ApiPropertyOptional({ description: 'Fecha de la operación' })
  @IsOptional()
  @IsDateString()
  operationDate?: string;

  @ApiPropertyOptional({ description: 'Notas adicionales' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO para crear una retención ISLR
 */
export class CreateIslrRetentionDto {
  @ApiProperty({ description: 'ID de la factura a la que se aplica la retención' })
  @IsMongoId()
  @IsNotEmpty()
  affectedDocumentId: string;

  @ApiProperty({ description: 'Código del concepto ISLR' })
  @IsString()
  @IsNotEmpty()
  conceptCode: string;

  @ApiProperty({ description: 'Descripción del concepto' })
  @IsString()
  @IsNotEmpty()
  conceptDescription: string;

  @ApiProperty({ description: 'Porcentaje de retención ISLR' })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsNotEmpty()
  retentionPercentage: number;

  @ApiProperty({ description: 'ID de la serie para el comprobante' })
  @IsMongoId()
  @IsNotEmpty()
  seriesId: string;

  @ApiPropertyOptional({ description: 'Monto base imponible (opcional, se toma de la factura por defecto)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  baseAmount?: number;

  @ApiPropertyOptional({ description: 'Sustraendo (si aplica)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sustraendo?: number;

  @ApiPropertyOptional({ description: 'Fecha de la operación' })
  @IsOptional()
  @IsDateString()
  operationDate?: string;

  @ApiPropertyOptional({ description: 'Notas adicionales' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO para crear una retención varia (ARCV - tipo 07)
 */
export class CreateArcvRetentionDto {
  @ApiProperty({ description: 'ID de la factura a la que se aplica la retención' })
  @IsMongoId()
  @IsNotEmpty()
  affectedDocumentId: string;

  @ApiProperty({
    description: 'Tipo de retención (municipal, timbre_fiscal, otros)',
    example: 'municipal'
  })
  @IsString()
  @IsNotEmpty()
  retentionType: string;

  @ApiProperty({ description: 'Descripción del concepto' })
  @IsString()
  @IsNotEmpty()
  conceptDescription: string;

  @ApiProperty({ description: 'Porcentaje de retención' })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsNotEmpty()
  retentionPercentage: number;

  @ApiProperty({ description: 'ID de la serie para el comprobante' })
  @IsMongoId()
  @IsNotEmpty()
  seriesId: string;

  @ApiPropertyOptional({ description: 'Código del concepto' })
  @IsOptional()
  @IsString()
  conceptCode?: string;

  @ApiPropertyOptional({ description: 'Código impositivo' })
  @IsOptional()
  @IsString()
  taxCode?: string;

  @ApiPropertyOptional({ description: 'Monto base imponible (opcional, se toma de la factura por defecto)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  baseAmount?: number;

  @ApiPropertyOptional({ description: 'Período de retención (YYYY-MM)' })
  @IsOptional()
  @IsString()
  period?: string;

  @ApiPropertyOptional({ description: 'Fecha de cierre del ejercicio fiscal' })
  @IsOptional()
  @IsDateString()
  fiscalYearEnd?: string;

  @ApiPropertyOptional({ description: 'Fecha de la operación' })
  @IsOptional()
  @IsDateString()
  operationDate?: string;

  @ApiPropertyOptional({ description: 'Notas adicionales' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO para emitir una retención (solicitar control number)
 */
export class IssueWithholdingDto {
  @ApiPropertyOptional({ description: 'Información fiscal adicional' })
  @IsOptional()
  fiscalInfo?: {
    period?: string;
    declarationNumber?: string;
  };
}

/**
 * DTO para actualizar estado de retención
 */
export class UpdateWithholdingStatusDto {
  @ApiProperty({
    enum: ['draft', 'validated', 'issued', 'sent', 'archived'],
  })
  @IsEnum(['draft', 'validated', 'issued', 'sent', 'archived'])
  status: WithholdingStatus;
}

/**
 * DTO para filtros de búsqueda de retenciones
 */
export class WithholdingFiltersDto {
  @ApiPropertyOptional({ description: 'Tipo de retención' })
  @IsOptional()
  @IsEnum(['iva', 'islr', 'arcv'])
  type?: WithholdingType;

  @ApiPropertyOptional({ description: 'Estado del documento' })
  @IsOptional()
  @IsEnum(['draft', 'validated', 'issued', 'sent', 'archived'])
  status?: WithholdingStatus;

  @ApiPropertyOptional({ description: 'Fecha desde (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Fecha hasta (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'RIF del beneficiario' })
  @IsOptional()
  @IsString()
  beneficiaryTaxId?: string;

  @ApiPropertyOptional({ description: 'RIF del emisor' })
  @IsOptional()
  @IsString()
  issuerTaxId?: string;

  @ApiPropertyOptional({ description: 'Período fiscal (YYYY-MM)' })
  @IsOptional()
  @IsString()
  period?: string;
}

/**
 * Response DTO para cálculo de retención
 */
export class RetentionCalculationDto {
  @ApiProperty()
  baseAmount: number;

  @ApiProperty()
  taxAmount: number;

  @ApiProperty()
  retentionPercentage: number;

  @ApiProperty()
  retentionAmount: number;

  @ApiProperty()
  totalRetention: number;
}
