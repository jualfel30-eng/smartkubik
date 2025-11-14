import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsBoolean,
  IsNumber,
  IsOptional,
  Min,
} from "class-validator";

export class UpdateConsumableConfigDto {
  @ApiProperty({
    description: "Tipo de consumible",
    example: "container",
    required: false,
  })
  @IsOptional()
  @IsString()
  consumableType?: string;

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

  @ApiProperty({
    description: "Unidad de medida",
    example: "unidad",
    required: false,
  })
  @IsOptional()
  @IsString()
  unitOfMeasure?: string;

  @ApiProperty({
    description: "Notas adicionales",
    example: "Usar para bebidas frías únicamente",
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
