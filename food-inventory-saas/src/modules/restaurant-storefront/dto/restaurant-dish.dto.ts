import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  Min,
  IsMongoId,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class BaseIngredientDto {
  @ApiProperty()
  @IsMongoId()
  ingredientId: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isRemovable?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class AvailableExtraDto {
  @ApiProperty()
  @IsMongoId()
  ingredientId: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxQuantity?: number;
}

export class CreateRestaurantDishDto {
  @ApiPropertyOptional({ description: 'ID de la categoría (opcional)' })
  @IsOptional()
  @IsMongoId()
  categoryId?: string;

  @ApiProperty({ example: 'Hamburguesa Clásica' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 12.5 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  allowsCustomization?: boolean;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({ type: [BaseIngredientDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BaseIngredientDto)
  baseIngredients?: BaseIngredientDto[];

  @ApiPropertyOptional({ type: [AvailableExtraDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailableExtraDto)
  availableExtras?: AvailableExtraDto[];
}

export class UpdateRestaurantDishDto extends PartialType(CreateRestaurantDishDto) {}
