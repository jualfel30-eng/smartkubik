import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsEmail,
  IsDateString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class AdminClientDataDto {
  @ApiProperty({ example: 'María González' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: '+584121234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'ID del cliente en el CRM (opcional)' })
  @IsOptional()
  @IsString()
  customerId?: string;
}

class AdminBookingServiceDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  @IsNotEmpty()
  service: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  addonNames?: string[];
}

/**
 * DTO para crear reservas desde el panel admin (sin validación estricta de teléfono).
 * tenantId se inyecta desde el JWT — no se incluye en el body.
 */
export class AdminCreateBeautyBookingDto {
  @ApiProperty({ type: AdminClientDataDto })
  @ValidateNested()
  @Type(() => AdminClientDataDto)
  client: AdminClientDataDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  professionalId?: string | null;

  @ApiProperty({ type: [AdminBookingServiceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdminBookingServiceDto)
  services: AdminBookingServiceDto[];

  @ApiProperty({ example: '2026-04-15' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: '10:30' })
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in HH:MM format',
  })
  startTime: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  locationId?: string;
}
