import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsDate,
  IsEnum,
  IsOptional,
  IsBoolean,
  Min,
  Max,
  IsMongoId,
  MinLength,
  MaxLength,
  IsNotEmpty,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  IslrOperationType,
  IslrBeneficiaryType,
  IslrWithholdingStatus,
} from '../schemas/islr-withholding.schema';

export class CreateIslrWithholdingDto {
  @ApiProperty({
    description: 'Fecha de la retención',
    example: '2024-01-15',
  })
  @IsDate()
  @Type(() => Date)
  withholdingDate: Date;

  @ApiProperty({
    description: 'Tipo de beneficiario',
    enum: ['supplier', 'employee'],
    example: 'supplier',
  })
  @IsEnum(['supplier', 'employee'])
  beneficiaryType: IslrBeneficiaryType;

  @ApiPropertyOptional({
    description: 'ID del proveedor (si beneficiaryType = supplier)',
    example: '507f1f77bcf86cd799439011',
  })
  @IsOptional()
  @IsMongoId()
  @ValidateIf((o) => o.beneficiaryType === 'supplier')
  supplierId?: string;

  @ApiPropertyOptional({
    description: 'ID del empleado (si beneficiaryType = employee)',
    example: '507f1f77bcf86cd799439012',
  })
  @IsOptional()
  @IsMongoId()
  @ValidateIf((o) => o.beneficiaryType === 'employee')
  employeeId?: string;

  @ApiProperty({
    description: 'RIF del beneficiario',
    example: 'J-12345678-9',
    minLength: 10,
    maxLength: 15,
  })
  @IsString()
  @MinLength(10)
  @MaxLength(15)
  beneficiaryRif: string;

  @ApiProperty({
    description: 'Nombre completo del beneficiario',
    example: 'SERVICIOS PROFESIONALES CA',
    minLength: 3,
    maxLength: 200,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  beneficiaryName: string;

  @ApiPropertyOptional({
    description: 'Dirección fiscal del beneficiario',
    example: 'Av. Principal, Caracas',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  beneficiaryAddress?: string;

  @ApiProperty({
    description: 'Número del documento fuente (factura, recibo)',
    example: 'FAC-2024-0001',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  documentNumber: string;

  @ApiProperty({
    description: 'Fecha del documento fuente',
    example: '2024-01-15',
  })
  @IsDate()
  @Type(() => Date)
  documentDate: Date;

  @ApiProperty({
    description: 'Monto base imponible',
    example: 10000,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  baseAmount: number;

  @ApiProperty({
    description: 'Porcentaje de retención (1-34%)',
    example: 3,
    minimum: 0,
    maximum: 34,
  })
  @IsNumber()
  @Min(0)
  @Max(34)
  withholdingPercentage: number;

  @ApiProperty({
    description: 'Tipo de operación ISLR',
    enum: [
      'salarios',
      'honorarios_profesionales',
      'comisiones',
      'intereses',
      'dividendos',
      'arrendamiento',
      'regalias',
      'servicio_transporte',
      'otros_servicios',
    ],
    example: 'honorarios_profesionales',
  })
  @IsEnum([
    'salarios',
    'honorarios_profesionales',
    'comisiones',
    'intereses',
    'dividendos',
    'arrendamiento',
    'regalias',
    'servicio_transporte',
    'otros_servicios',
  ])
  operationType: IslrOperationType;

  @ApiProperty({
    description: 'Código de concepto ISLR según tabla SENIAT',
    example: '001',
    minLength: 2,
    maxLength: 10,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(10)
  conceptCode: string;

  @ApiPropertyOptional({
    description: 'Descripción del concepto',
    example: 'Honorarios profesionales por servicios de consultoría',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  conceptDescription?: string;

  @ApiPropertyOptional({
    description: 'Notas adicionales',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class UpdateIslrWithholdingDto {
  @ApiPropertyOptional({
    description: 'Fecha de la retención',
    example: '2024-01-15',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  withholdingDate?: Date;

  @ApiPropertyOptional({
    description: 'RIF del beneficiario',
    example: 'J-12345678-9',
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(15)
  beneficiaryRif?: string;

  @ApiPropertyOptional({
    description: 'Nombre completo del beneficiario',
    example: 'SERVICIOS PROFESIONALES CA',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  beneficiaryName?: string;

  @ApiPropertyOptional({
    description: 'Dirección fiscal del beneficiario',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  beneficiaryAddress?: string;

  @ApiPropertyOptional({
    description: 'Número del documento fuente',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  documentNumber?: string;

  @ApiPropertyOptional({
    description: 'Fecha del documento fuente',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  documentDate?: Date;

  @ApiPropertyOptional({
    description: 'Monto base imponible',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  baseAmount?: number;

  @ApiPropertyOptional({
    description: 'Porcentaje de retención',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(34)
  withholdingPercentage?: number;

  @ApiPropertyOptional({
    description: 'Tipo de operación ISLR',
    enum: [
      'salarios',
      'honorarios_profesionales',
      'comisiones',
      'intereses',
      'dividendos',
      'arrendamiento',
      'regalias',
      'servicio_transporte',
      'otros_servicios',
    ],
  })
  @IsOptional()
  @IsEnum([
    'salarios',
    'honorarios_profesionales',
    'comisiones',
    'intereses',
    'dividendos',
    'arrendamiento',
    'regalias',
    'servicio_transporte',
    'otros_servicios',
  ])
  operationType?: IslrOperationType;

  @ApiPropertyOptional({
    description: 'Código de concepto ISLR',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(10)
  conceptCode?: string;

  @ApiPropertyOptional({
    description: 'Descripción del concepto',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  conceptDescription?: string;

  @ApiPropertyOptional({
    description: 'Notas adicionales',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class AnnulIslrWithholdingDto {
  @ApiProperty({
    description: 'Razón de anulación',
    example: 'Error en el cálculo del monto',
    minLength: 10,
    maxLength: 500,
  })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  annulmentReason: string;
}

export class ExportIslrARCDto {
  @ApiProperty({
    description: 'Mes del período (1-12)',
    example: 1,
    minimum: 1,
    maximum: 12,
  })
  @IsNumber()
  @Min(1)
  @Max(12)
  month: number;

  @ApiProperty({
    description: 'Año del período',
    example: 2024,
    minimum: 2000,
    maximum: 2100,
  })
  @IsNumber()
  @Min(2000)
  @Max(2100)
  year: number;

  @ApiPropertyOptional({
    description: 'Incluir solo retenciones no exportadas previamente',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  onlyNotExported?: boolean;
}

export class IslrWithholdingFilterDto {
  @ApiPropertyOptional({
    description: 'Estado de la retención',
    enum: ['draft', 'posted', 'annulled', 'all'],
    default: 'all',
  })
  @IsOptional()
  @IsEnum(['draft', 'posted', 'annulled', 'all'])
  status?: IslrWithholdingStatus | 'all';

  @ApiPropertyOptional({
    description: 'Tipo de beneficiario',
    enum: ['supplier', 'employee', 'all'],
    default: 'all',
  })
  @IsOptional()
  @IsEnum(['supplier', 'employee', 'all'])
  beneficiaryType?: IslrBeneficiaryType | 'all';

  @ApiPropertyOptional({
    description: 'Tipo de operación',
    enum: [
      'salarios',
      'honorarios_profesionales',
      'comisiones',
      'intereses',
      'dividendos',
      'arrendamiento',
      'regalias',
      'servicio_transporte',
      'otros_servicios',
      'all',
    ],
    default: 'all',
  })
  @IsOptional()
  @IsEnum([
    'salarios',
    'honorarios_profesionales',
    'comisiones',
    'intereses',
    'dividendos',
    'arrendamiento',
    'regalias',
    'servicio_transporte',
    'otros_servicios',
    'all',
  ])
  operationType?: IslrOperationType | 'all';

  @ApiPropertyOptional({
    description: 'Fecha de inicio del rango',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @ApiPropertyOptional({
    description: 'Fecha de fin del rango',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @ApiPropertyOptional({
    description: 'RIF del beneficiario para búsqueda',
    example: 'J-12345678-9',
  })
  @IsOptional()
  @IsString()
  beneficiaryRif?: string;

  @ApiPropertyOptional({
    description: 'Exportadas a ARC',
    enum: ['yes', 'no', 'all'],
    default: 'all',
  })
  @IsOptional()
  @IsEnum(['yes', 'no', 'all'])
  exportedToARC?: 'yes' | 'no' | 'all';

  @ApiPropertyOptional({
    description: 'Número de página',
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: 'Cantidad de registros por página',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}

export class IslrWithholdingSummaryDto {
  @ApiProperty({
    description: 'Mes del período (1-12)',
    example: 1,
    minimum: 1,
    maximum: 12,
  })
  @IsNumber()
  @Min(1)
  @Max(12)
  month: number;

  @ApiProperty({
    description: 'Año del período',
    example: 2024,
    minimum: 2000,
    maximum: 2100,
  })
  @IsNumber()
  @Min(2000)
  @Max(2100)
  year: number;
}

export class IslrWithholdingSummaryResultDto {
  @ApiProperty({
    description: 'Mes del período',
    example: 1,
  })
  month: number;

  @ApiProperty({
    description: 'Año del período',
    example: 2024,
  })
  year: number;

  @ApiProperty({
    description: 'Total de retenciones en el período',
    example: 15,
  })
  totalWithholdings: number;

  @ApiProperty({
    description: 'Monto total retenido',
    example: 45000.5,
  })
  totalAmount: number;

  @ApiProperty({
    description: 'Base imponible total',
    example: 1500000,
  })
  totalBaseAmount: number;

  @ApiProperty({
    description: 'Resumen por beneficiario',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        beneficiaryRif: { type: 'string', example: 'J-12345678-9' },
        beneficiaryName: { type: 'string', example: 'SERVICIOS CA' },
        count: { type: 'number', example: 3 },
        totalAmount: { type: 'number', example: 9000 },
      },
    },
  })
  byBeneficiary: Array<{
    beneficiaryRif: string;
    beneficiaryName: string;
    count: number;
    totalAmount: number;
  }>;

  @ApiProperty({
    description: 'Resumen por tipo de operación',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        operationType: { type: 'string', example: 'honorarios_profesionales' },
        count: { type: 'number', example: 5 },
        totalAmount: { type: 'number', example: 15000 },
      },
    },
  })
  byOperationType: Array<{
    operationType: IslrOperationType;
    count: number;
    totalAmount: number;
  }>;

  @ApiProperty({
    description: 'Retenciones exportadas a ARC',
    example: 10,
  })
  exportedCount: number;

  @ApiProperty({
    description: 'Retenciones pendientes de exportar',
    example: 5,
  })
  pendingExportCount: number;
}
