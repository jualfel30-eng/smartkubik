import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsDateString,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePriceListDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(['standard', 'wholesale', 'retail', 'promotional', 'seasonal', 'custom'])
  type: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  priority?: number;

  @IsOptional()
  autoApplyRules?: {
    customerTypes?: string[];
    minimumOrderAmount?: number;
    locations?: string[];
  };
}

export class UpdatePriceListDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['standard', 'wholesale', 'retail', 'promotional', 'seasonal', 'custom'])
  type?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsNumber()
  priority?: number;

  @IsOptional()
  autoApplyRules?: {
    customerTypes?: string[];
    minimumOrderAmount?: number;
    locations?: string[];
  };
}

export class AssignProductToPriceListDto {
  @IsString()
  productId: string;

  @IsString()
  variantSku: string;

  @IsString()
  priceListId: string;

  @IsNumber()
  @Min(0)
  customPrice: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;
}

export class BulkAssignProductsToPriceListDto {
  @IsString()
  priceListId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductPriceAssignment)
  products: ProductPriceAssignment[];
}

export class ProductPriceAssignment {
  @IsString()
  productId: string;

  @IsString()
  variantSku: string;

  @IsNumber()
  @Min(0)
  customPrice: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
