import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsIn,
  Min,
} from "class-validator";

export class UpdateProductConsumableRelationDto {
  @ApiProperty({
    description: "Cantidad del consumible requerida por unidad del producto",
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantityRequired?: number;

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
    description: "Prioridad de uso (0 = más alta)",
    example: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  priority?: number;

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
    description: "Notas adicionales",
    example: "Solo para pedidos grandes",
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: "Si la relación está activa",
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
