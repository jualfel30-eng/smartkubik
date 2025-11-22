import {
  IsOptional,
  IsString,
  IsNumber,
  IsDateString,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

export class ProductCustomerMatrixFiltersDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  minPurchaseCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minTotalSpent?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class CustomerProductMatrixFiltersDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  minPurchaseCount?: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class PurchaseAffinityQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minAffinityScore?: number;

  @IsOptional()
  @IsString()
  customerId?: string;
}

export class TopCustomersQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;
}

export class TopProductsQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;
}
