import {
  IsString,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsEnum,
  IsDateString,
} from "class-validator";
import { Type, Transform } from "class-transformer";

/**
 * DTO para crear un componente de BOM
 */
export class CreateBillOfMaterialsComponentDto {
  @IsMongoId()
  componentProductId: string;

  @IsOptional()
  @IsMongoId()
  componentVariantId?: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsString()
  unit: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  scrapPercentage?: number;

  @IsOptional()
  @IsBoolean()
  isOptional?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO para crear un subproducto
 */
export class CreateBillOfMaterialsByproductDto {
  @IsMongoId()
  byproductProductId: string;

  @IsNumber()
  @Min(0)
  quantity: number;

  @IsString()
  unit: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO para crear un BOM
 */
export class CreateBillOfMaterialsDto {
  @IsMongoId()
  productId: string;

  @IsOptional()
  @IsMongoId()
  productVariantId?: string;

  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsNumber()
  @Min(0.001)
  productionQuantity: number;

  @IsString()
  productionUnit: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBillOfMaterialsComponentDto)
  components: CreateBillOfMaterialsComponentDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBillOfMaterialsByproductDto)
  byproducts?: CreateBillOfMaterialsByproductDto[];

  @IsOptional()
  @IsEnum(["production", "kit", "subcontract"])
  bomType?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validTo?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO para actualizar un BOM
 */
export class UpdateBillOfMaterialsDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.001)
  productionQuantity?: number;

  @IsOptional()
  @IsString()
  productionUnit?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBillOfMaterialsComponentDto)
  components?: CreateBillOfMaterialsComponentDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBillOfMaterialsByproductDto)
  byproducts?: CreateBillOfMaterialsByproductDto[];

  @IsOptional()
  @IsEnum(["production", "kit", "subcontract"])
  bomType?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validTo?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO para query de BOMs
 */
export class BillOfMaterialsQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  limit?: number = 20;

  @IsOptional()
  @IsMongoId()
  productId?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  isActive?: boolean;
}
