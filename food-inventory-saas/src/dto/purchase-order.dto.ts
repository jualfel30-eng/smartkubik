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
  ArrayMinSize,
  IsNotEmpty,
  IsEnum,
  Matches,
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

  @IsOptional()
  @IsMongoId()
  variantId?: string;

  @IsOptional()
  @IsString()
  @SanitizeString()
  variantName?: string;

  @IsOptional()
  @IsString()
  @SanitizeString()
  variantSku?: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNumber()
  @IsPositive()
  costPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discount?: number; // Percentage discount (0-100)

  @IsOptional()
  @IsString()
  @SanitizeString()
  lotNumber?: string;

  @IsOptional()
  @IsDateString()
  expirationDate?: string;
}

// Monedas soportadas para pagos
export enum PaymentCurrency {
  USD = "USD",
  VES = "VES",
  EUR = "EUR",
  USD_BCV = "USD_BCV", // Tasa BCV
  EUR_BCV = "EUR_BCV", // Tasa BCV
}

class PaymentTermsDto {
  @IsBoolean()
  isCredit: boolean;

  @IsNumber()
  @Min(0)
  creditDays: number; // Calculated from paymentDueDate - purchaseDate

  @IsArray()
  @ArrayMinSize(1, { message: "Debe seleccionar al menos un método de pago" })
  @IsString({ each: true })
  paymentMethods: string[]; // ['efectivo', 'transferencia', 'pago_movil', 'zelle', 'binance', etc.]

  @IsNotEmpty({ message: "La moneda de pago es obligatoria" })
  @IsEnum(PaymentCurrency, { message: "Moneda de pago inválida" })
  expectedCurrency: PaymentCurrency; // Moneda esperada para el pago

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
  @Matches(
    /^[VEJGPN]-?\d{7,9}(-\d)?$/,
    { message: 'RIF debe tener formato válido: V/E (cédula o RIF), J (RIF jurídico), G, P, N' }
  )
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

  @IsNotEmpty({ message: "Los términos de pago son obligatorios" })
  @ValidateNested()
  @Type(() => PaymentTermsDto)
  paymentTerms: PaymentTermsDto;
}

export class ReceivePurchaseOrderDto {
  @IsOptional()
  @IsString()
  @SanitizeString()
  receivedBy?: string;
}
