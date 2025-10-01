import {
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  ValidateNested,
  IsMongoId,
  IsNumber,
  IsPositive,
  ValidateIf,
  IsBoolean,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";
import { SanitizeString, SanitizeText } from "../decorators/sanitize.decorator";

class PurchaseOrderItemDto {
  @IsMongoId()
  productId: string;

  @IsString()
  @SanitizeString()
  productName: string;

  @IsString()
  @SanitizeString()
  productSku: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNumber()
  @IsPositive()
  costPrice: number;

  @IsOptional()
  @IsString()
  @SanitizeString()
  lotNumber?: string;

  @IsOptional()
  @IsDateString()
  expirationDate?: string;
}

class PaymentTermsDto {
  @IsBoolean()
  isCredit: boolean;

  @IsNumber()
  @Min(0)
  creditDays: number; // Calculated from paymentDueDate - purchaseDate

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  paymentMethods?: string[]; // ['efectivo', 'transferencia', 'pago_movil', 'zelle', 'binance', etc.]

  @IsOptional()
  @IsDateString()
  paymentDueDate?: string;

  @IsBoolean()
  requiresAdvancePayment: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  advancePaymentPercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  advancePaymentAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  remainingBalance?: number;
}

export class CreatePurchaseOrderDto {
  @IsOptional()
  @IsMongoId()
  supplierId?: string; // Optional: for existing suppliers

  // These fields are for creating a new supplier on the fly
  @ValidateIf((o) => !o.supplierId)
  @IsString()
  @SanitizeString()
  newSupplierName?: string;

  @ValidateIf((o) => !o.supplierId)
  @IsString()
  @SanitizeString()
  newSupplierRif?: string;

  @ValidateIf((o) => !o.supplierId)
  @IsString()
  @SanitizeString()
  newSupplierContactName?: string;

  @IsOptional()
  @IsString()
  @SanitizeString()
  newSupplierContactPhone?: string;

  @IsOptional()
  @IsString()
  newSupplierContactEmail?: string; // Email no necesita sanitización

  @IsDateString()
  purchaseDate: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items: PurchaseOrderItemDto[];

  @IsString()
  @IsOptional()
  @SanitizeText()
  notes?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentTermsDto)
  paymentTerms?: PaymentTermsDto;
}
