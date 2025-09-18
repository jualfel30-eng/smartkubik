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
} from "class-validator";
import { Type } from "class-transformer";

class PurchaseOrderItemDto {
  @IsMongoId()
  productId: string;

  @IsString()
  productName: string;

  @IsString()
  productSku: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNumber()
  @IsPositive()
  costPrice: number;

  @IsOptional()
  @IsString()
  lotNumber?: string;

  @IsOptional()
  @IsDateString()
  expirationDate?: string;
}

export class CreatePurchaseOrderDto {
  @IsOptional()
  @IsMongoId()
  supplierId?: string; // Optional: for existing suppliers

  // These fields are for creating a new supplier on the fly
  @ValidateIf((o) => !o.supplierId)
  @IsString()
  newSupplierName?: string;

  @ValidateIf((o) => !o.supplierId)
  @IsString()
  newSupplierRif?: string;

  @ValidateIf((o) => !o.supplierId)
  @IsString()
  newSupplierContactName?: string;

  @IsOptional()
  @IsString()
  newSupplierContactPhone?: string;

  @IsOptional()
  @IsString()
  newSupplierContactEmail?: string;

  @IsDateString()
  purchaseDate: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items: PurchaseOrderItemDto[];

  @IsString()
  @IsOptional()
  notes?: string;
}
