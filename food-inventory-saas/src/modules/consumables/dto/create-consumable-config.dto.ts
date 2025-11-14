import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsNotEmpty,
  IsMongoId,
  Min,
} from "class-validator";

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
}
