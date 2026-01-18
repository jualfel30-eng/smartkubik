import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  IsDateString,
  IsInt,
  Max,
} from "class-validator";
import { Type } from "class-transformer";

export enum MovementType {
  IN = "IN",
  OUT = "OUT",
  ADJUSTMENT = "ADJUSTMENT",
  TRANSFER = "TRANSFER",
}

export class CreateInventoryMovementDto {
  @IsMongoId()
  @IsNotEmpty()
  inventoryId: string;

  @IsEnum(MovementType)
  movementType: MovementType;

  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @IsNumber()
  @Min(0)
  unitCost: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsMongoId()
  warehouseId?: string;

  @IsOptional()
  @IsMongoId()
  binLocationId?: string;
}

export class InventoryMovementFilterDto {
  @IsOptional()
  @IsEnum(MovementType)
  movementType?: MovementType;

  @IsOptional()
  @IsMongoId()
  productId?: string;

  @IsOptional()
  @IsMongoId()
  warehouseId?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;
}

export class CreateTransferDto {
  @IsMongoId()
  @IsNotEmpty()
  productId: string;

  @IsMongoId()
  @IsNotEmpty()
  sourceWarehouseId: string;

  @IsMongoId()
  @IsNotEmpty()
  destinationWarehouseId: string;

  @IsOptional()
  @IsMongoId()
  sourceBinLocationId?: string;

  @IsOptional()
  @IsMongoId()
  destinationBinLocationId?: string;

  @IsNumber()
  @Min(0.0001)
  quantity: number;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  reference?: string;
}
