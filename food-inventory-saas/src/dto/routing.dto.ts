import {
  IsString,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
  IsDateString,
} from "class-validator";
import { Type, Transform } from "class-transformer";

/**
 * DTO para crear una operación de routing
 */
export class CreateRoutingOperationDto {
  @IsNumber()
  sequence: number;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsMongoId()
  workCenterId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  setupTime?: number;

  @IsNumber()
  @Min(0)
  cycleTime: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  teardownTime?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  laborRequired?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  machinesRequired?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  additionalCost?: number;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsBoolean()
  requiresQualityCheck?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO para crear un Routing
 */
export class CreateRoutingDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsMongoId()
  productId: string;

  @IsOptional()
  @IsMongoId()
  productVariantId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRoutingOperationDto)
  operations: CreateRoutingOperationDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validTo?: string;
}

/**
 * DTO para actualizar un Routing
 */
export class UpdateRoutingDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRoutingOperationDto)
  operations?: CreateRoutingOperationDto[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validTo?: string;
}

/**
 * DTO para query de Routings
 */
export class RoutingQueryDto {
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
}
