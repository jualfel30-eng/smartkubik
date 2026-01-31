import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsDateString,
  IsEnum,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';

// ============ IVA PURCHASE BOOK ============

export class CreateIvaPurchaseBookDto {
  @IsNumber()
  @Min(1)
  @Max(12)
  month: number;

  @IsNumber()
  year: number;

  @IsDateString()
  @IsNotEmpty()
  operationDate: string;

  @IsString()
  @IsNotEmpty()
  supplierId: string;

  @IsString()
  @IsNotEmpty()
  supplierName: string;

  @IsString()
  @IsNotEmpty()
  supplierRif: string;

  @IsString()
  @IsOptional()
  supplierAddress?: string;

  @IsString()
  @IsNotEmpty()
  invoiceNumber: string;

  @IsString()
  @IsNotEmpty()
  invoiceControlNumber: string;

  @IsDateString()
  @IsOptional()
  invoiceDate?: string;

  @IsString()
  @IsOptional()
  affectedInvoiceNumber?: string;

  @IsString()
  @IsOptional()
  affectedInvoiceControlNumber?: string;

  @IsEnum(['purchase', 'import', 'service', 'debit_note', 'credit_note'])
  @IsOptional()
  transactionType?: string;

  @IsNumber()
  @Min(0)
  baseAmount: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  ivaRate: number;

  @IsNumber()
  @Min(0)
  ivaAmount: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  withheldIvaAmount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  totalAmount?: number;

  @IsString()
  @IsOptional()
  withholdingId?: string;

  @IsString()
  @IsOptional()
  withholdingCertificate?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  withholdingPercentage?: number;

  @IsString()
  @IsOptional()
  purchaseOrderId?: string;

  @IsString()
  @IsOptional()
  payableId?: string;

  @IsString()
  @IsOptional()
  observations?: string;
}

export class UpdateIvaPurchaseBookDto {
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(12)
  month?: number;

  @IsNumber()
  @IsOptional()
  year?: number;

  @IsDateString()
  @IsOptional()
  operationDate?: string;

  @IsString()
  @IsOptional()
  supplierName?: string;

  @IsString()
  @IsOptional()
  supplierRif?: string;

  @IsString()
  @IsOptional()
  supplierAddress?: string;

  @IsString()
  @IsOptional()
  invoiceNumber?: string;

  @IsString()
  @IsOptional()
  invoiceControlNumber?: string;

  @IsDateString()
  @IsOptional()
  invoiceDate?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  baseAmount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  ivaRate?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  ivaAmount?: number;

  @IsString()
  @IsOptional()
  observations?: string;
}

// ============ IVA SALES BOOK ============

export class CreateIvaSalesBookDto {
  @IsNumber()
  @Min(1)
  @Max(12)
  month: number;

  @IsNumber()
  year: number;

  @IsDateString()
  @IsNotEmpty()
  operationDate: string;

  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsString()
  @IsNotEmpty()
  customerName: string;

  @IsString()
  @IsNotEmpty()
  customerRif: string;

  @IsString()
  @IsOptional()
  customerAddress?: string;

  @IsString()
  @IsNotEmpty()
  invoiceNumber: string;

  @IsString()
  @IsNotEmpty()
  invoiceControlNumber: string;

  @IsDateString()
  @IsOptional()
  invoiceDate?: string;

  @IsString()
  @IsOptional()
  affectedInvoiceNumber?: string;

  @IsString()
  @IsOptional()
  affectedInvoiceControlNumber?: string;

  @IsEnum(['sale', 'export', 'service', 'debit_note', 'credit_note'])
  @IsOptional()
  transactionType?: string;

  @IsNumber()
  @Min(0)
  baseAmount: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  ivaRate: number;

  @IsNumber()
  @Min(0)
  ivaAmount: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  withheldIvaAmount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  totalAmount?: number;

  @IsString()
  @IsOptional()
  withholdingCertificate?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  withholdingPercentage?: number;

  @IsBoolean()
  @IsOptional()
  isElectronic?: boolean;

  @IsString()
  @IsOptional()
  electronicCode?: string;

  @IsString()
  @IsOptional()
  orderId?: string;

  @IsString()
  @IsOptional()
  billingDocumentId?: string;

  @IsString()
  @IsOptional()
  observations?: string;

  // Traceability Fields
  @IsString()
  @IsOptional()
  originalCurrency?: string;

  @IsNumber()
  @IsOptional()
  exchangeRate?: number;

  @IsNumber()
  @IsOptional()
  originalBaseAmount?: number;

  @IsNumber()
  @IsOptional()
  originalIvaAmount?: number;

  @IsNumber()
  @IsOptional()
  originalTotalAmount?: number;

  @IsBoolean()
  @IsOptional()
  isForeignCurrency?: boolean;
}

export class UpdateIvaSalesBookDto {
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(12)
  month?: number;

  @IsNumber()
  @IsOptional()
  year?: number;

  @IsDateString()
  @IsOptional()
  operationDate?: string;

  @IsString()
  @IsOptional()
  customerName?: string;

  @IsString()
  @IsOptional()
  customerRif?: string;

  @IsString()
  @IsOptional()
  customerAddress?: string;

  @IsString()
  @IsOptional()
  invoiceNumber?: string;

  @IsString()
  @IsOptional()
  invoiceControlNumber?: string;

  @IsDateString()
  @IsOptional()
  invoiceDate?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  baseAmount?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  ivaRate?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  ivaAmount?: number;

  @IsString()
  @IsOptional()
  observations?: string;
}

export class AnnulSalesEntryDto {
  @IsString()
  @IsNotEmpty()
  annulmentReason: string;
}

// ============ FILTROS Y EXPORTACIÓN ============

export class ExportIvaBooksDto {
  @IsNumber()
  @Min(1)
  @Max(12)
  month: number;

  @IsNumber()
  year: number;

  @IsEnum(['txt', 'excel', 'pdf'])
  @IsOptional()
  format?: string;
}
