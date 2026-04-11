import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  IsMongoId,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RestaurantOrderStatus } from '../../../schemas/restaurant-order.schema';

export class OrderItemExtraDto {
  @IsMongoId()
  ingredientId: string;

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @Min(0)
  extraPrice: number;
}

export class OrderItemCustomizationDto {
  @ApiPropertyOptional({ type: [String], description: 'IDs de ingredientes base a remover' })
  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  removedIngredients?: string[];

  @ApiPropertyOptional({ type: [OrderItemExtraDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemExtraDto)
  addedExtras?: OrderItemExtraDto[];
}

export class CreateOrderItemDto {
  @ApiProperty()
  @IsMongoId()
  dishId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  dishName: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  dishPrice: number;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  subtotal: number;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => OrderItemCustomizationDto)
  customization?: OrderItemCustomizationDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateRestaurantOrderDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @ApiProperty({ example: '+58 414-1234567' })
  @IsString()
  @IsNotEmpty()
  customerPhone: string;

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiProperty()
  @IsNumber()
  @Min(0)
  subtotal: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  total: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'] })
  @IsEnum(['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'])
  status: RestaurantOrderStatus;
}
