import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateRestaurantIngredientDto {
  @ApiProperty({ example: 'Queso extra' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Lácteos' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 1.5, description: 'Precio adicional al agregar como extra (0 = gratis)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  extraPrice?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateRestaurantIngredientDto extends PartialType(CreateRestaurantIngredientDto) {}
