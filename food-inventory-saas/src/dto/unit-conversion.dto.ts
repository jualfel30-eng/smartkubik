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
  IsMongoId,
} from "class-validator";
import { Type, Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * DTO para crear/actualizar una regla de conversión individual
 */
export class CreateConversionRuleDto {
  @ApiProperty({
    description: "Nombre de la unidad",
    example: "caja",
  })
  @IsString()
  @IsNotEmpty()
  unit: string;

  @ApiProperty({
    description: "Abreviación de la unidad",
    example: "cj",
  })
  @IsString()
  @IsNotEmpty()
  abbreviation: string;

  @ApiProperty({
    description: "Factor de conversión a la unidad base",
    example: 2000,
  })
  @IsNumber()
  @Min(0.001)
  factor: number;

  @ApiProperty({
    description: "Tipo de unidad",
    enum: ["purchase", "stock", "consumption"],
    example: "purchase",
  })
  @IsEnum(["purchase", "stock", "consumption"])
  unitType: string;

  @ApiPropertyOptional({
    description: "Está activa",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: "Es unidad por defecto para su tipo",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

/**
 * DTO para crear una configuración de conversión de unidades
 */
export class CreateUnitConversionDto {
  @ApiProperty({
    description: "SKU del producto",
    example: "SERV-001",
  })
  @IsString()
  @IsNotEmpty()
  productSku: string;

  @ApiProperty({
    description: "ID del producto",
    example: "507f1f77bcf86cd799439011",
  })
  @IsMongoId()
  productId: string;

  @ApiProperty({
    description: "Unidad base (la más pequeña)",
    example: "unidad",
  })
  @IsString()
  @IsNotEmpty()
  baseUnit: string;

  @ApiProperty({
    description: "Abreviación de la unidad base",
    example: "und",
  })
  @IsString()
  @IsNotEmpty()
  baseUnitAbbr: string;

  @ApiPropertyOptional({
    description: "Reglas de conversión",
    type: [CreateConversionRuleDto],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateConversionRuleDto)
  conversions?: CreateConversionRuleDto[];

  @ApiPropertyOptional({
    description: "Unidad de compra por defecto",
    example: "caja",
  })
  @IsOptional()
  @IsString()
  defaultPurchaseUnit?: string;

  @ApiPropertyOptional({
    description: "Unidad de almacenamiento por defecto",
    example: "paquete",
  })
  @IsOptional()
  @IsString()
  defaultStockUnit?: string;

  @ApiPropertyOptional({
    description: "Unidad de consumo por defecto",
    example: "unidad",
  })
  @IsOptional()
  @IsString()
  defaultConsumptionUnit?: string;
}

/**
 * DTO para actualizar una configuración de conversión de unidades
 * Todos los campos son opcionales
 */
export class UpdateUnitConversionDto {
  @ApiPropertyOptional({
    description: "Unidad base",
  })
  @IsOptional()
  @IsString()
  baseUnit?: string;

  @ApiPropertyOptional({
    description: "Abreviación unidad base",
  })
  @IsOptional()
  @IsString()
  baseUnitAbbr?: string;

  @ApiPropertyOptional({
    description: "Reglas de conversión",
    type: [CreateConversionRuleDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateConversionRuleDto)
  conversions?: CreateConversionRuleDto[];

  @ApiPropertyOptional({
    description: "Unidad de compra por defecto",
  })
  @IsOptional()
  @IsString()
  defaultPurchaseUnit?: string;

  @ApiPropertyOptional({
    description: "Unidad de almacenamiento por defecto",
  })
  @IsOptional()
  @IsString()
  defaultStockUnit?: string;

  @ApiPropertyOptional({
    description: "Unidad de consumo por defecto",
  })
  @IsOptional()
  @IsString()
  defaultConsumptionUnit?: string;

  @ApiPropertyOptional({
    description: "Está activo",
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * DTO para consultas/filtros de configuraciones de unidades
 */
export class UnitConversionQueryDto {
  @ApiPropertyOptional({
    description: "ID del producto",
  })
  @IsOptional()
  @IsMongoId()
  productId?: string;

  @ApiPropertyOptional({
    description: "SKU del producto",
  })
  @IsOptional()
  @IsString()
  productSku?: string;

  @ApiPropertyOptional({
    description: "Solo activos",
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: "Página",
    default: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Límite por página",
    default: 20,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}
