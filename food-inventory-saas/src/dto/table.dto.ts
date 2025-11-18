import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  Min,
  IsBoolean,
  IsMongoId,
  IsArray,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

class PositionDto {
  @IsNumber()
  x: number;

  @IsNumber()
  y: number;
}

export class CreateTableDto {
  @IsString()
  tableNumber: string;

  @IsString()
  section: string;

  @IsOptional()
  @IsString()
  floor?: string;

  @ValidateNested()
  @Type(() => PositionDto)
  position: PositionDto;

  @IsEnum(["square", "round", "rectangle", "booth"])
  shape: string;

  @IsNumber()
  @Min(1)
  minCapacity: number;

  @IsNumber()
  @Min(1)
  maxCapacity: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateTableDto {
  @IsOptional()
  @IsString()
  tableNumber?: string;

  @IsOptional()
  @IsString()
  section?: string;

  @IsOptional()
  @IsString()
  floor?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PositionDto)
  position?: PositionDto;

  @IsOptional()
  @IsEnum(["square", "round", "rectangle", "booth"])
  shape?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  minCapacity?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxCapacity?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class SeatGuestsDto {
  @IsMongoId()
  tableId: string;

  @IsNumber()
  @Min(1)
  guestCount: number;

  @IsOptional()
  @IsMongoId()
  serverId?: string;

  @IsOptional()
  @IsMongoId()
  reservationId?: string;
}

export class TransferTableDto {
  @IsMongoId()
  fromTableId: string;

  @IsMongoId()
  toTableId: string;
}

export class CombineTablesDto {
  @IsArray()
  @IsMongoId({ each: true })
  tableIds: string[];

  @IsMongoId()
  parentTableId: string; // Mesa principal
}
