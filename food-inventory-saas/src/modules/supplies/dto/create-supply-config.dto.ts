import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsNotEmpty,
  IsMongoId,
  IsObject,
  IsArray,
  IsEnum,
  ValidateNested,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

class SafetyInfoDto {
  @ApiProperty({
    description: "Requiere equipo de protección personal",
    example: false,
  })
  @IsBoolean()
  requiresPPE: boolean;

  @ApiProperty({
    description: "Es material peligroso",
    example: false,
  })
  @IsBoolean()
  isHazardous: boolean;

  @ApiProperty({
    description: "Requisitos especiales de almacenamiento",
    example: "Mantener en lugar fresco y seco",
    required: false,
  })
  @IsOptional()
  @IsString()
  storageRequirements?: string;

  @ApiProperty({
    description: "Instrucciones de manejo",
    example: "Usar guantes al manipular",
    required: false,
  })
  @IsOptional()
  @IsString()
  handlingInstructions?: string;
}

/**
 * DTO for custom conversion rules (reused from consumables)
 */
export class CustomConversionRuleDto {
  @ApiProperty({
    description: "Nombre de la unidad",
    example: "garrafa",
  })
  @IsNotEmpty()
  @IsString()
  unit: string;

  @ApiProperty({
    description: "Abreviación de la unidad",
    example: "grrf",
  })
  @IsNotEmpty()
  @IsString()
  abbreviation: string;

  @ApiProperty({
    description: "Factor de conversión específico",
    example: 5.0,
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

export class CreateSupplyConfigDto {
  @ApiProperty({
    description: "ID del producto a configurar como suministro",
    example: "507f1f77bcf86cd799439011",
  })
  @IsNotEmpty()
  @IsMongoId()
  productId: string;

  @ApiProperty({
    description: "Categoría del suministro",
    example: "cleaning",
    enum: ["cleaning", "office", "maintenance", "safety", "kitchen", "other"],
  })
  @IsNotEmpty()
  @IsString()
  supplyCategory: string;

  @ApiProperty({
    description: "Subcategoría del suministro",
    example: "detergent",
  })
  @IsNotEmpty()
  @IsString()
  supplySubcategory: string;

  @ApiProperty({
    description: "Requiere seguimiento de uso/consumo",
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  requiresTracking?: boolean;

  @ApiProperty({
    description: "Requiere autorización para su uso",
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  requiresAuthorization?: boolean;

  @ApiProperty({
    description: "Departamento de uso",
    example: "kitchen",
    required: false,
  })
  @IsOptional()
  @IsString()
  usageDepartment?: string;

  @ApiProperty({
    description: "Consumo mensual estimado",
    example: 10,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedMonthlyConsumption?: number;

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
    example: "litro",
  })
  @IsOptional()
  @IsString()
  defaultUnit?: string;

  @ApiPropertyOptional({
    description: "Unidad de compra",
    example: "garrafa",
  })
  @IsOptional()
  @IsString()
  purchaseUnit?: string;

  @ApiPropertyOptional({
    description: "Unidad de almacenamiento",
    example: "litro",
  })
  @IsOptional()
  @IsString()
  stockUnit?: string;

  @ApiPropertyOptional({
    description: "Unidad de consumo",
    example: "mililitro",
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
    example: "litro",
    deprecated: true,
  })
  @IsOptional()
  @IsString()
  unitOfMeasure?: string;

  // ===== OTHER FIELDS =====

  @ApiPropertyOptional({
    description: "Información de seguridad",
    type: SafetyInfoDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SafetyInfoDto)
  safetyInfo?: SafetyInfoDto;

  @ApiPropertyOptional({
    description: "Notas adicionales",
    example: "Comprar en presentación de 5 litros",
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
