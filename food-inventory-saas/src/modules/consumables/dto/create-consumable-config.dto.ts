import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsNotEmpty,
  IsMongoId,
  IsArray,
  ValidateNested,
  IsEnum,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

/**
 * DTO for custom conversion rules
 */
export class CustomConversionRuleDto {
  @ApiProperty({
    description: "Nombre de la unidad",
    example: "caja",
  })
  @IsNotEmpty()
  @IsString()
  unit: string;

  @ApiProperty({
    description: "Abreviación de la unidad",
    example: "cj",
  })
  @IsNotEmpty()
  @IsString()
  abbreviation: string;

  @ApiProperty({
    description: "Factor de conversión específico",
    example: 2000,
  })
  @IsNumber()
  @Min(0.0000001)
  factor: number;

  @ApiProperty({
    description: "Contexto de uso",
    enum: ["purchase", "stock", "consumption"],
    example: "purchase",
  })
  @IsEnum(["purchase", "stock", "consumption"])
  context: string;
}

export class CreateConsumableConfigDto {
  @ApiProperty({
    description: "ID del producto a configurar como consumible",
    example: "507f1f77bcf86cd799439011",
  })
  @IsNotEmpty()
  @IsMongoId()
  productId: string;

  @ApiProperty({
    description: "Tipo de consumible",
    example: "container",
    enum: [
      "container",
      "packaging",
      "utensil",
      "wrapper",
      "bag",
      "box",
      "cup",
      "lid",
      "napkin",
      "straw",
      "other",
    ],
  })
  @IsNotEmpty()
  @IsString()
  consumableType: string;

  @ApiProperty({
    description: "Si el consumible es reutilizable",
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isReusable?: boolean;

  @ApiProperty({
    description: "Si se deduce automáticamente al vender",
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isAutoDeducted?: boolean;

  @ApiProperty({
    description: "Cantidad por defecto por uso",
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultQuantityPerUse?: number;

  // ===== UNIT TYPE INTEGRATION =====

  @ApiPropertyOptional({
    description: "ID del tipo de unidad global",
    example: "507f1f77bcf86cd799439011",
  })
  @IsOptional()
  @IsMongoId()
  unitTypeId?: string;

  @ApiPropertyOptional({
    description: "Unidad base del producto",
    example: "unidad",
  })
  @IsOptional()
  @IsString()
  defaultUnit?: string;

  @ApiPropertyOptional({
    description: "Unidad de compra",
    example: "caja",
  })
  @IsOptional()
  @IsString()
  purchaseUnit?: string;

  @ApiPropertyOptional({
    description: "Unidad de almacenamiento",
    example: "paquete",
  })
  @IsOptional()
  @IsString()
  stockUnit?: string;

  @ApiPropertyOptional({
    description: "Unidad de consumo",
    example: "unidad",
  })
  @IsOptional()
  @IsString()
  consumptionUnit?: string;

  @ApiPropertyOptional({
    description: "Conversiones personalizadas específicas del producto",
    type: [CustomConversionRuleDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomConversionRuleDto)
  customConversions?: CustomConversionRuleDto[];

  // ===== LEGACY FIELD =====

  @ApiPropertyOptional({
    description: "Unidad de medida (DEPRECATED: usar defaultUnit)",
    example: "unidad",
    deprecated: true,
  })
  @IsOptional()
  @IsString()
  unitOfMeasure?: string;

  // ===== OTHER FIELDS =====

  @ApiPropertyOptional({
    description: "Notas adicionales",
    example: "Usar para bebidas frías únicamente",
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
