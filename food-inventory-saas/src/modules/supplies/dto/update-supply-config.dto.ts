import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsObject,
  ValidateNested,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

class SafetyInfoDto {
  @ApiProperty({
    description: "Requiere equipo de protección personal",
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  requiresPPE?: boolean;

  @ApiProperty({
    description: "Es material peligroso",
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isHazardous?: boolean;

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

export class UpdateSupplyConfigDto {
  @ApiProperty({
    description: "Categoría del suministro",
    example: "cleaning",
    required: false,
  })
  @IsOptional()
  @IsString()
  supplyCategory?: string;

  @ApiProperty({
    description: "Subcategoría del suministro",
    example: "detergent",
    required: false,
  })
  @IsOptional()
  @IsString()
  supplySubcategory?: string;

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

  @ApiProperty({
    description: "Unidad de medida",
    example: "litro",
    required: false,
  })
  @IsOptional()
  @IsString()
  unitOfMeasure?: string;

  @ApiProperty({
    description: "Información de seguridad",
    type: SafetyInfoDto,
    required: false,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SafetyInfoDto)
  safetyInfo?: SafetyInfoDto;

  @ApiProperty({
    description: "Notas adicionales",
    example: "Comprar en presentación de 5 litros",
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: "Si la configuración está activa",
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
