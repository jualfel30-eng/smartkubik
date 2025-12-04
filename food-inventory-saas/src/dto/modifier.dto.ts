import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsMongoId,
  Min,
  MaxLength,
  IsArray,
  ValidateNested,
  IsEnum,
} from "class-validator";
import { Type } from "class-transformer";
import { SanitizeString, SanitizeText } from "../decorators/sanitize.decorator";

/**
 * DTO para definir un efecto de componente
 */
export class ComponentEffectDto {
  @IsMongoId()
  componentProductId: string;

  @IsEnum(["exclude", "multiply", "add"])
  action: "exclude" | "multiply" | "add";

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantity?: number;
}

/**
 * DTO para crear un Modificador
 */
export class CreateModifierDto {
  @IsString()
  @MaxLength(100)
  @SanitizeString()
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @SanitizeText()
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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComponentEffectDto)
  componentEffects?: ComponentEffectDto[];
}

/**
 * DTO para actualizar un Modificador
 */
export class UpdateModifierDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @SanitizeString()
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @SanitizeText()
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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComponentEffectDto)
  componentEffects?: ComponentEffectDto[];
}

/**
 * DTO para aplicar un modificador a un OrderItem
 */
export class AppliedModifierDto {
  @IsMongoId()
  modifierId: string;

  @IsString()
  @SanitizeString()
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
