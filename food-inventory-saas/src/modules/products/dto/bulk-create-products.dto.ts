import { IsArray, IsString, IsBoolean, IsNumber, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BulkProductDto {
  @IsString()
  sku: string;

  @IsString()
  name: string;

  @IsString()
  category: string;

  @IsString()
  @IsOptional()
  subcategory?: string;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsString()
  @IsOptional()
  unitOfMeasure?: string;

  @IsBoolean()
  @IsOptional()
  isSoldByWeight?: boolean;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  ingredients?: string;

  @IsBoolean()
  isPerishable: boolean;

  @IsNumber()
  @IsOptional()
  shelfLifeDays?: number;

  @IsString()
  @IsOptional()
  storageTemperature?: string;

  @IsBoolean()
  ivaApplicable: boolean;

  @IsString()
  @IsOptional()
  taxCategory?: string;

  @IsString()
  variantName: string;

  @IsString()
  @IsOptional()
  variantSku?: string;

  @IsString()
  @IsOptional()
  variantBarcode?: string;

  @IsString()
  variantUnit: string;

  @IsNumber()
  variantUnitSize: number;

  @IsNumber()
  variantBasePrice: number;

  @IsNumber()
  variantCostPrice: number;

  @IsString()
  @IsOptional()
  image1?: string;

  @IsString()
  @IsOptional()
  image2?: string;

  @IsString()
  @IsOptional()
  image3?: string;

  @IsNumber()
  @IsOptional()
  minimumStock?: number;

  @IsNumber()
  @IsOptional()
  maximumStock?: number;

  @IsNumber()
  @IsOptional()
  reorderPoint?: number;

  @IsNumber()
  @IsOptional()
  reorderQuantity?: number;
}

export class BulkCreateProductsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkProductDto)
  products: BulkProductDto[];
}
