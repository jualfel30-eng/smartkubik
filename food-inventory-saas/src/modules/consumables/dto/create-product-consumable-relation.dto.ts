import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsNotEmpty,
  IsMongoId,
  IsIn,
  Min,
} from "class-validator";

export class CreateProductConsumableRelationDto {
  @ApiProperty({
    description: "ID del producto que requiere el consumible",
    example: "507f1f77bcf86cd799439011",
  })
  @IsNotEmpty()
  @IsMongoId()
  productId: string;

  @ApiProperty({
    description: "ID del producto consumible",
    example: "507f1f77bcf86cd799439012",
  })
  @IsNotEmpty()
  @IsMongoId()
  consumableId: string;

  @ApiProperty({
    description: "Cantidad del consumible requerida por unidad del producto",
    example: 1,
    minimum: 0,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  quantityRequired: number;

  @ApiProperty({
    description: "Si el consumible es obligatorio",
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiProperty({
    description: "Si se deduce automáticamente",
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isAutoDeducted?: boolean;

  @ApiProperty({
    description: "Contexto en el que se aplica este consumible",
    example: "always",
    enum: ["always", "takeaway", "dine_in", "delivery"],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(["always", "takeaway", "dine_in", "delivery"])
  applicableContext?: string;

  @ApiProperty({
    description: "Prioridad de uso (0 = más alta)",
    example: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  priority?: number;

  @ApiProperty({
    description: "Notas adicionales",
    example: "Solo para pedidos grandes",
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
