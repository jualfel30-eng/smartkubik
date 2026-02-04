import {
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  ValidateNested,
  IsMongoId,
  IsNumber,
  IsBoolean,
  ValidateIf,
  IsNotEmpty,
  Min,
  IsEnum,
  IsObject,
} from "class-validator";
import { Type } from "class-transformer";

class PaymentTermsDto {
  @IsBoolean()
  isCredit: boolean;

  @IsOptional()
  @IsDateString()
  paymentDueDate?: string;

  @IsArray()
  @IsString({ each: true })
  paymentMethods: string[];

  @IsOptional()
  @IsString()
  customPaymentMethod?: string;

  @IsString()
  expectedCurrency: string;

  @IsBoolean()
  requiresAdvancePayment: boolean;

  @IsNumber()
  advancePaymentPercentage: number;
}

// This is a rich product DTO, mirroring CreateProductDto
class RichProductDataDto {
  @IsString() @IsNotEmpty() sku: string;
  @IsString() @IsNotEmpty() name: string;
  @IsArray() @IsString({ each: true }) category: string[];
  @IsArray() @IsString({ each: true }) subcategory: string[];
  @IsString() @IsNotEmpty() brand: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() ingredients?: string;
  @IsOptional() @IsString() origin?: string;
  @IsOptional() @IsString() productType?: string;
  @IsBoolean() isPerishable: boolean;
  @IsOptional() @IsNumber() shelfLifeDays?: number;
  @IsOptional()
  @IsEnum(["ambiente", "refrigerado", "congelado"])
  storageTemperature?: string;
  @IsBoolean() ivaApplicable: boolean;
  @IsString() @IsNotEmpty() taxCategory: string;
  @IsBoolean() isSoldByWeight: boolean;
  @IsString() unitOfMeasure: string;
  @IsOptional() @IsBoolean() hasMultipleSellingUnits?: boolean;
  @IsOptional() @IsArray() sellingUnits?: any[];
  @IsObject() pricingRules: any;
  @IsObject() inventoryConfig: any;
  @IsOptional() @IsObject() attributes?: any;
  @IsOptional() @IsBoolean() sendToKitchen?: boolean;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductVariantDataDto)
  variants: ProductVariantDataDto[];
}

class ProductVariantDataDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsNotEmpty() sku: string;
  @IsString() @IsNotEmpty() barcode: string;
  @IsString() @IsNotEmpty() unit: string;
  @IsNumber() @Min(0.01) unitSize: number;
  @IsNumber() @Min(0) basePrice: number;
  @IsNumber() @Min(0) costPrice: number;
  @IsOptional() @IsArray() @IsString({ each: true }) images?: string[];
}

class SupplierDataDto {
  @IsOptional() @IsMongoId() supplierId?: string;

  @ValidateIf((o) => !o.supplierId)
  @IsString()
  @IsNotEmpty()
  newSupplierName?: string;

  @ValidateIf((o) => !o.supplierId)
  @IsString()
  @IsNotEmpty()
  newSupplierRif?: string;

  @ValidateIf((o) => !o.supplierId)
  @IsString()
  @IsNotEmpty()
  newSupplierContactName?: string;

  @IsOptional()
  @IsString()
  newSupplierContactPhone?: string;

  @IsOptional()
  @IsString()
  newSupplierContactEmail?: string;
}

class InventoryDataDto {
  @IsNumber() quantity: number;
  @IsNumber() costPrice: number;
  @IsOptional() @IsString() lotNumber?: string;
  @IsOptional() @IsDateString() expirationDate?: string;
}

export class CreateProductWithPurchaseDto {
  @ValidateNested()
  @Type(() => RichProductDataDto)
  product: RichProductDataDto;

  @ValidateNested()
  @Type(() => SupplierDataDto)
  supplier: SupplierDataDto;

  @ValidateNested()
  @Type(() => InventoryDataDto)
  inventory: InventoryDataDto;

  @IsDateString()
  purchaseDate: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @ValidateNested()
  @Type(() => PaymentTermsDto)
  paymentTerms: PaymentTermsDto;
}
