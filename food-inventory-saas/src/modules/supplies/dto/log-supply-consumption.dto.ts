import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsOptional,
  IsNotEmpty,
  IsMongoId,
  IsIn,
  IsObject,
  ValidateNested,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

class CostInfoDto {
  @ApiProperty({
    description: "Costo por unidad",
    example: 5.5,
  })
  @IsNumber()
  @Min(0)
  unitCost: number;

  @ApiProperty({
    description: "Costo total",
    example: 55,
  })
  @IsNumber()
  @Min(0)
  totalCost: number;

  @ApiProperty({
    description: "Moneda",
    example: "USD",
  })
  @IsString()
  currency: string;
}

export class LogSupplyConsumptionDto {
  @ApiProperty({
    description: "ID del producto suministro",
    example: "507f1f77bcf86cd799439011",
  })
  @IsNotEmpty()
  @IsMongoId()
  supplyId: string;

  @ApiProperty({
    description: "Cantidad consumida",
    example: 10,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  quantityConsumed: number;

  @ApiProperty({
    description: "Unidad de medida",
    example: "litro",
  })
  @IsNotEmpty()
  @IsString()
  unitOfMeasure: string;

  @ApiProperty({
    description: "Tipo de consumo",
    example: "manual",
    enum: ["manual", "automatic", "scheduled"],
  })
  @IsNotEmpty()
  @IsString()
  @IsIn(["manual", "automatic", "scheduled"])
  consumptionType: string;

  @ApiProperty({
    description: "Departamento que consumió el suministro",
    example: "kitchen",
    required: false,
  })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({
    description: "ID del usuario que consumió",
    example: "507f1f77bcf86cd799439012",
    required: false,
  })
  @IsOptional()
  @IsMongoId()
  consumedBy?: string;

  @ApiProperty({
    description: "ID de la orden relacionada",
    example: "507f1f77bcf86cd799439013",
    required: false,
  })
  @IsOptional()
  @IsMongoId()
  relatedOrderId?: string;

  @ApiProperty({
    description: "Razón del consumo",
    example: "Limpieza de cocina",
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({
    description: "Notas adicionales",
    example: "Consumo mayor al esperado",
    required: false,
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: "Información de costos",
    type: CostInfoDto,
    required: false,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CostInfoDto)
  costInfo?: CostInfoDto;
}
