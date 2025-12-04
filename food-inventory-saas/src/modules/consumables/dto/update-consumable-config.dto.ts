import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsMongoId,
  IsArray,
  ValidateNested,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { CustomConversionRuleDto } from "./create-consumable-config.dto";

export class UpdateConsumableConfigDto {
  @ApiPropertyOptional({
    description: "Tipo de consumible",
    example: "container",
  })
  @IsOptional()
  @IsString()
  consumableType?: string;

  @ApiPropertyOptional({
    description: "Si el consumible es reutilizable",
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  isReusable?: boolean;

  @ApiPropertyOptional({
    description: "Si se deduce automáticamente al vender",
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isAutoDeducted?: boolean;

  @ApiPropertyOptional({
    description: "Cantidad por defecto por uso",
    example: 1,
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

  @ApiPropertyOptional({
    description: "Si la configuración está activa",
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
