import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsArray,
  IsMongoId,
  Min,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO para crear un Grupo de Modificadores
 */
export class CreateModifierGroupDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum(['single', 'multiple'])
  selectionType: 'single' | 'multiple';

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minSelections?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @ValidateIf((o) => o.maxSelections !== null)
  maxSelections?: number;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsBoolean()
  available?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  applicableProducts?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableCategories?: string[];
}

/**
 * DTO para actualizar un Grupo de Modificadores
 */
export class UpdateModifierGroupDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(['single', 'multiple'])
  selectionType?: 'single' | 'multiple';

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minSelections?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @ValidateIf((o) => o.maxSelections !== null)
  maxSelections?: number;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsBoolean()
  available?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  sortOrder?: number;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  applicableProducts?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableCategories?: string[];
}

/**
 * DTO para asignar un grupo de modificadores a productos
 */
export class AssignGroupToProductsDto {
  @IsMongoId()
  groupId: string;

  @IsArray()
  @IsMongoId({ each: true })
  productIds: string[];
}
