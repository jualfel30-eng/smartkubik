import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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
}
