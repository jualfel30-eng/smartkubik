import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNotEmpty,
  Min,
  IsEnum,
  IsObject,
  ArrayMinSize,
} from "class-validator";
import { Type, Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { UnitCategory } from "../schemas/unit-type.schema";

/**
 * DTO for unit conversion rules within a unit type
 */
export class UnitConversionRuleDto {
  @ApiProperty({
    description: "Nombre de la unidad",
    example: "kilogramo",
  })
  @IsString()
  @IsNotEmpty()
  unit: string;

  @ApiProperty({
    description: "Abreviación de la unidad",
    example: "kg",
  })
  @IsString()
  @IsNotEmpty()
  abbreviation: string;

  @ApiPropertyOptional({
    description: "Nombre en plural",
    example: "kilogramos",
  })
  @IsOptional()
  @IsString()
  pluralName?: string;

  @ApiProperty({
    description: "Factor de conversión relativo a la unidad base",
    example: 1.0,
    minimum: 0.0000001,
  })
  @IsNumber()
  @Min(0.0000001)
  factor: number;

  @ApiPropertyOptional({
    description: "Indica si es la unidad base",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isBase?: boolean;

  @ApiPropertyOptional({
    description: "Símbolo opcional",
    example: "°C",
  })
  @IsOptional()
  @IsString()
  symbol?: string;
}

/**
 * DTO for creating a new UnitType
 */
export class CreateUnitTypeDto {
  @ApiProperty({
    description: "Nombre del tipo de unidad",
    example: "Peso",
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: "Categoría de medida",
    enum: UnitCategory,
    example: UnitCategory.WEIGHT,
  })
  @IsEnum(UnitCategory)
  category: UnitCategory;

  @ApiPropertyOptional({
    description: "Descripción del tipo de unidad",
    example: "Unidades de medida de peso",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: "Unidad base del tipo",
    example: { name: "kilogramo", abbreviation: "kg" },
  })
  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  baseUnit: {
    name: string;
    abbreviation: string;
  };

  @ApiProperty({
    description: "Lista de conversiones de unidades",
    type: [UnitConversionRuleDto],
    example: [
      { unit: "kilogramo", abbreviation: "kg", factor: 1.0, isBase: true },
      { unit: "gramo", abbreviation: "g", factor: 0.001, isBase: false },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UnitConversionRuleDto)
  conversions: UnitConversionRuleDto[];

  @ApiPropertyOptional({
    description: "Es un tipo predefinido del sistema",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isSystemDefined?: boolean;

  @ApiPropertyOptional({
    description: "Metadata adicional",
    example: { source: "custom", version: "1.0" },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO for updating a UnitType
 */
export class UpdateUnitTypeDto extends PartialType(CreateUnitTypeDto) {
  @ApiPropertyOptional({
    description: "Estado activo del tipo de unidad",
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * DTO for querying UnitTypes
 */
export class UnitTypeQueryDto {
  @ApiPropertyOptional({
    description: "Categoría de medida",
    enum: UnitCategory,
  })
  @IsOptional()
  @IsEnum(UnitCategory)
  category?: UnitCategory;

  @ApiPropertyOptional({
    description: "Solo tipos activos",
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: "Solo tipos del sistema",
  })
  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  isSystemDefined?: boolean;

  @ApiPropertyOptional({
    description: "Incluir tipos personalizados del tenant",
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  includeCustom?: boolean;

  @ApiPropertyOptional({
    description: "Texto de búsqueda",
  })
  @IsOptional()
  @IsString()
  search?: string;
}

/**
 * DTO for unit conversion request
 */
export class ConvertUnitsDto {
  @ApiProperty({
    description: "ID del tipo de unidad",
    example: "507f1f77bcf86cd799439011",
  })
  @IsString()
  @IsNotEmpty()
  unitTypeId: string;

  @ApiProperty({
    description: "Abreviación de la unidad origen",
    example: "kg",
  })
  @IsString()
  @IsNotEmpty()
  fromUnit: string;

  @ApiProperty({
    description: "Abreviación de la unidad destino",
    example: "g",
  })
  @IsString()
  @IsNotEmpty()
  toUnit: string;

  @ApiProperty({
    description: "Cantidad a convertir",
    example: 5.5,
  })
  @IsNumber()
  @Min(0)
  quantity: number;
}

/**
 * Response DTO for unit conversion
 */
export class ConvertUnitsResponseDto {
  @ApiProperty({
    description: "Cantidad y unidad original",
    example: { quantity: 5.5, unit: "kg" },
  })
  original: {
    quantity: number;
    unit: string;
  };

  @ApiProperty({
    description: "Cantidad y unidad convertida",
    example: { quantity: 5500, unit: "g" },
  })
  converted: {
    quantity: number;
    unit: string;
  };

  @ApiProperty({
    description: "Factor de conversión aplicado",
    example: 0.001,
  })
  factor: number;

  @ApiProperty({
    description: "Tipo de unidad utilizado",
    example: "Peso",
  })
  unitTypeName: string;
}
