import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsArray,
  IsBoolean,
  IsEnum,
  Min,
  Max,
  MaxLength,
  ValidateNested,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class PriceDto {
  @ApiProperty({ example: 25.00 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: 'USD', enum: ['USD', 'VES', 'COP', 'EUR'] })
  @IsEnum(['USD', 'VES', 'COP', 'EUR'])
  currency: string;

  @ApiPropertyOptional({ example: 'Desde $25' })
  @IsOptional()
  @IsString()
  displayText?: string;
}

class PricingStrategyDto {
  @ApiProperty({ example: 'manual', enum: ['manual', 'markup', 'margin'] })
  @IsEnum(['manual', 'markup', 'margin'])
  mode: 'manual' | 'markup' | 'margin';

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  markupPercentage?: number;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  marginPercentage?: number;

  @ApiProperty({ example: false })
  @IsBoolean()
  autoCalculate: boolean;
}

class AddonDto {
  @ApiProperty({ example: 'Barba incluida' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Perfilado y diseño de barba' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 10 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  isActive: boolean;
}

export class CreateBeautyServiceDto {
  @ApiProperty({ example: 'Corte de cabello masculino' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'Corte moderno con acabado profesional' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ example: 'Cortes' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  category: string;

  @ApiProperty({ example: 45, description: 'Duración en minutos' })
  @IsNumber()
  @Min(5)
  @Max(480)
  duration: number;

  @ApiPropertyOptional({ example: 10, description: 'Buffer antes en minutos' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(60)
  bufferBefore?: number;

  @ApiPropertyOptional({ example: 10, description: 'Buffer después en minutos' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(60)
  bufferAfter?: number;

  @ApiProperty({ type: PriceDto })
  @ValidateNested()
  @Type(() => PriceDto)
  price: PriceDto;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @ApiPropertyOptional({ type: PricingStrategyDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PricingStrategyDto)
  pricingStrategy?: PricingStrategyDto;

  @ApiPropertyOptional({
    example: ['data:image/jpeg;base64,...'],
    description: 'Máximo 3 imágenes en Base64',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(3)
  images?: string[];

  @ApiPropertyOptional({
    example: ['507f1f77bcf86cd799439011'],
    description: 'IDs de profesionales que ofrecen este servicio',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  professionals?: string[];

  @ApiPropertyOptional({ example: 2, description: 'Horas mínimas de anticipación' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minAdvanceBooking?: number;

  @ApiPropertyOptional({ example: 720, description: 'Horas máximas hacia adelante' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxAdvanceBooking?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxSimultaneous?: number;

  @ApiPropertyOptional({ type: [AddonDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddonDto)
  addons?: AddonDto[];

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  requiresDeposit?: boolean;

  @ApiPropertyOptional({ example: 'fixed', enum: ['fixed', 'percentage'] })
  @IsOptional()
  @IsEnum(['fixed', 'percentage'])
  depositType?: 'fixed' | 'percentage';

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  depositAmount?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ example: '#FF5733' })
  @IsOptional()
  @IsString()
  @MaxLength(7)
  color?: string;

  @ApiPropertyOptional({ example: ['moderno', 'fade'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
