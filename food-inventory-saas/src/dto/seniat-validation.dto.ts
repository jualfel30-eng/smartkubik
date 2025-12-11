import { IsString, IsOptional, IsBoolean, IsDateString, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for SENIAT validation request
 */
export class ValidateSeniatDto {
  @ApiProperty({
    description: 'ID of the billing document to validate',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  documentId: string;

  @ApiPropertyOptional({
    description: 'Skip control number validation (for draft validation)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  skipControlNumber?: boolean;
}

/**
 * DTO for SENIAT statistics query
 */
export class SeniatStatsDto {
  @ApiPropertyOptional({
    description: 'Start date for statistics (ISO 8601 format)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for statistics (ISO 8601 format)',
    example: '2024-12-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Filter by document status',
    enum: ['draft', 'issued', 'sent', 'all'],
    default: 'all',
  })
  @IsOptional()
  @IsEnum(['draft', 'issued', 'sent', 'all'])
  status?: 'draft' | 'issued' | 'sent' | 'all';

  @ApiPropertyOptional({
    description: 'Filter by document type',
    enum: ['invoice', 'credit_note', 'debit_note', 'all'],
    default: 'all',
  })
  @IsOptional()
  @IsEnum(['invoice', 'credit_note', 'debit_note', 'all'])
  documentType?: 'invoice' | 'credit_note' | 'debit_note' | 'all';
}

/**
 * Response DTO for SENIAT validation result
 */
export class SeniatValidationResultDto {
  @ApiProperty({
    description: 'Whether the validation passed',
    example: true,
  })
  valid: boolean;

  @ApiProperty({
    description: 'Array of validation errors',
    example: ['RIF del cliente es inválido', 'Monto total no cuadra'],
    type: [String],
  })
  errors: string[];

  @ApiPropertyOptional({
    description: 'Array of validation warnings',
    example: ['Documento tiene más de 30 días de antigüedad'],
    type: [String],
  })
  warnings?: string[];

  @ApiPropertyOptional({
    description: 'Document ID that was validated',
    example: '507f1f77bcf86cd799439011',
  })
  documentId?: string;

  @ApiPropertyOptional({
    description: 'Document number',
    example: 'FAC-2024-0001',
  })
  documentNumber?: string;
}

/**
 * Response DTO for SENIAT XML generation
 */
export class SeniatXmlGenerationResultDto {
  @ApiProperty({
    description: 'Whether XML generation was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Generated XML string',
    example: '<?xml version="1.0"...',
  })
  xml: string;

  @ApiProperty({
    description: 'SHA-256 hash of the XML',
    example: 'a3d5c...',
  })
  xmlHash: string;

  @ApiProperty({
    description: 'QR code in base64 format',
    example: 'data:image/png;base64,iVBOR...',
  })
  qrCode: string;

  @ApiProperty({
    description: 'Verification URL for the document',
    example: 'https://seniat.gob.ve/verify?rif=J123...',
  })
  verificationUrl: string;

  @ApiPropertyOptional({
    description: 'Timestamp when XML was generated',
    example: '2024-01-15T10:30:00Z',
  })
  generatedAt?: Date;

  @ApiPropertyOptional({
    description: 'Document ID',
    example: '507f1f77bcf86cd799439011',
  })
  documentId?: string;
}

/**
 * Response DTO for electronic invoice statistics
 */
export class ElectronicInvoiceStatsDto {
  @ApiProperty({
    description: 'Total number of invoices in period',
    example: 150,
  })
  totalInvoices: number;

  @ApiProperty({
    description: 'Number of issued invoices',
    example: 120,
  })
  issuedInvoices: number;

  @ApiProperty({
    description: 'Number of draft invoices',
    example: 25,
  })
  draftInvoices: number;

  @ApiProperty({
    description: 'Number of sent invoices',
    example: 100,
  })
  sentInvoices: number;

  @ApiProperty({
    description: 'Number of invoices with XML generated',
    example: 120,
  })
  withXmlGenerated: number;

  @ApiProperty({
    description: 'Total amount of issued invoices',
    example: 150000.50,
  })
  totalAmount: number;

  @ApiProperty({
    description: 'Total tax amount',
    example: 24000.08,
  })
  totalTaxAmount: number;

  @ApiProperty({
    description: 'Statistics by document type',
    example: {
      invoice: { count: 120, amount: 140000 },
      credit_note: { count: 5, amount: 5000 },
      debit_note: { count: 3, amount: 3000 },
    },
  })
  byDocumentType: {
    [key: string]: {
      count: number;
      amount: number;
    };
  };

  @ApiPropertyOptional({
    description: 'Statistics by month',
    example: [
      { month: '2024-01', count: 45, amount: 50000 },
      { month: '2024-02', count: 50, amount: 55000 },
    ],
    type: 'array',
  })
  byMonth?: Array<{
    month: string;
    count: number;
    amount: number;
  }>;

  @ApiPropertyOptional({
    description: 'Average invoice amount',
    example: 1250.50,
  })
  averageInvoiceAmount?: number;

  @ApiProperty({
    description: 'Start date of the statistics period',
    example: '2024-01-01',
  })
  startDate: string;

  @ApiProperty({
    description: 'End date of the statistics period',
    example: '2024-12-31',
  })
  endDate: string;
}

/**
 * DTO for generating SENIAT XML
 */
export class GenerateSeniatXmlDto {
  @ApiProperty({
    description: 'ID of the billing document',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  documentId: string;

  @ApiPropertyOptional({
    description: 'Force regeneration even if XML already exists',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  forceRegenerate?: boolean;

  @ApiPropertyOptional({
    description: 'Include digital signature',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeSignature?: boolean;
}

/**
 * DTO for downloading SENIAT XML
 */
export class DownloadSeniatXmlDto {
  @ApiProperty({
    description: 'ID of the billing document',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString()
  documentId: string;

  @ApiPropertyOptional({
    description: 'Include QR code in response',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeQrCode?: boolean;
}
