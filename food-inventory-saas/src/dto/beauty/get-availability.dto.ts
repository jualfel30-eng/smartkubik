import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetAvailabilityDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty({ example: '2026-03-30' })
  @IsDateString()
  date: string; // YYYY-MM-DD

  @ApiPropertyOptional({
    example: '507f1f77bcf86cd799439011',
    description: 'Professional ID o omitir para cualquier profesional',
  })
  @IsOptional()
  @IsString()
  professionalId?: string;

  @ApiProperty({
    example: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
    description: 'IDs de servicios seleccionados',
  })
  @IsArray()
  @IsString({ each: true })
  serviceIds: string[];

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439011' })
  @IsOptional()
  @IsString()
  locationId?: string;
}
