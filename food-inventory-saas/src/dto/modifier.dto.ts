import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsMongoId,
  Min,
  MaxLength,
} from "class-validator";
import { Type } from "class-transformer";

/**
 * DTO para crear un Modificador
 */
export class CreateModifierDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  priceAdjustment: number;

  @IsOptional()
  @IsBoolean()
  available?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;

  @IsMongoId()
  groupId: string;
}

/**
 * DTO para actualizar un Modificador
 */
export class UpdateModifierDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  priceAdjustment?: number;

  @IsOptional()
  @IsBoolean()
  available?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;

  @IsOptional()
  @IsMongoId()
  groupId?: string;
}

/**
 * DTO para aplicar un modificador a un OrderItem
 */
export class AppliedModifierDto {
  @IsMongoId()
  modifierId: string;

  @IsString()
  name: string;

  @IsNumber()
  @Type(() => Number)
  priceAdjustment: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity?: number;
}
