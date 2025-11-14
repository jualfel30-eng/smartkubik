import {
  IsString,
  IsMongoId,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsDateString,
} from "class-validator";
import { Transform } from "class-transformer";

/**
 * DTO para crear una Production Version
 */
export class CreateProductionVersionDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsMongoId()
  productId: string;

  @IsOptional()
  @IsMongoId()
  productVariantId?: string;

  @IsMongoId()
  bomId: string;

  @IsOptional()
  @IsMongoId()
  routingId?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validTo?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO para actualizar una Production Version
 */
export class UpdateProductionVersionDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsMongoId()
  bomId?: string;

  @IsOptional()
  @IsMongoId()
  routingId?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validTo?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO para query de Production Versions
 */
export class ProductionVersionQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  limit?: number = 20;

  @IsOptional()
  @IsMongoId()
  productId?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  isDefault?: boolean;
}
