import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439011' })
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiProperty({ example: 'María González' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  clientName: string;

  @ApiProperty({ example: '+584121234567' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'phone must be in international format',
  })
  clientPhone: string;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439011' })
  @IsOptional()
  @IsString()
  professionalId?: string;

  @ApiProperty({ example: 5, description: 'Rating de 1 a 5 estrellas' })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ example: 'Excelente servicio, muy profesional' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
