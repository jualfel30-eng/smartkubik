import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateNested,
  IsOptional,
  IsObject,
} from "class-validator";
import { Type } from "class-transformer";

export class BulkAdjustItemDto {
  @IsString()
  @IsNotEmpty()
  SKU: string;

  @IsNumber()
  @IsNotEmpty()
  NuevaCantidad: number;

  @IsString()
  @IsOptional()
  variantSku?: string;

  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;
}

export class BulkAdjustInventoryDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkAdjustItemDto)
  items: BulkAdjustItemDto[];

  @IsString()
  @IsNotEmpty()
  reason: string;
}
