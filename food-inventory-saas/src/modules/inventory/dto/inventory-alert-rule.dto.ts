import {
  IsBoolean,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateInventoryAlertRuleDto {
  @IsMongoId()
  @IsNotEmpty()
  productId: string;

  @IsOptional()
  @IsMongoId()
  warehouseId?: string;

  @IsNumber()
  @IsPositive()
  minQuantity: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString({ each: true })
  channels?: string[];
}

export class UpdateInventoryAlertRuleDto {
  @IsOptional()
  @IsMongoId()
  productId?: string;

  @IsOptional()
  @IsMongoId()
  warehouseId?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  minQuantity?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString({ each: true })
  channels?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}
