import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsArray,
  IsBoolean,
  IsEnum,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class PackagePriceDto {
  @ApiProperty({ example: 20.00 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: 'USD', enum: ['USD', 'VES', 'COP', 'EUR'] })
  @IsEnum(['USD', 'VES', 'COP', 'EUR'])
  currency: string;
}

export class CreateServicePackageDto {
  @ApiProperty({ example: 'Combo Ejecutivo' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'Corte + Barba + Lavado' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
    description: 'IDs de los BeautyService incluidos en el paquete',
  })
  @IsArray()
  @IsString({ each: true })
  services: string[];

  @ApiProperty({ example: 75, description: 'Duración total en minutos' })
  @IsNumber()
  @Min(5)
  totalDuration: number;

  @ApiProperty({ type: PackagePriceDto })
  @ValidateNested()
  @Type(() => PackagePriceDto)
  price: PackagePriceDto;

  @ApiPropertyOptional({ example: 5.00, description: 'Ahorro vs precios individuales' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  savings?: number;

  @ApiPropertyOptional({ description: 'Imagen Base64 o URL de portada' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
