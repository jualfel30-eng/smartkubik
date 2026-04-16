import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  MaxLength,
  Max,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BookingAddonDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsString()
  productId?: string;
}

export class UpdateBookingStatusDto {
  @ApiPropertyOptional({
    example: 'confirmed',
    enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'],
  })
  @IsOptional()
  @IsEnum(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'])
  status?: string;

  @ApiPropertyOptional({
    example: 'paid',
    enum: ['unpaid', 'deposit_paid', 'paid'],
  })
  @IsOptional()
  @IsEnum(['unpaid', 'deposit_paid', 'paid'])
  paymentStatus?: string;

  @ApiPropertyOptional({ example: 'Pago Móvil' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentMethod?: string;

  @ApiPropertyOptional({ example: 25.50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amountPaid?: number;

  @ApiPropertyOptional({ example: 'Cliente solicitó cancelación' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  cancellationReason?: string;

  @ApiPropertyOptional({ example: 150, description: 'Puntos de lealtad a redimir (descuento)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  loyaltyPointsRedeemed?: number;

  @ApiPropertyOptional({ example: 1.50, description: 'Monto de descuento por puntos de lealtad' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  loyaltyDiscount?: number;

  @ApiPropertyOptional({ description: 'Productos adicionales vendidos en la cita (upsell)' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingAddonDto)
  addons?: BookingAddonDto[];
}
