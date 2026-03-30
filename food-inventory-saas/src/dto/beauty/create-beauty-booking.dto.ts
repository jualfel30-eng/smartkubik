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

class ClientDataDto {
  @ApiProperty({ example: 'María González' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiProperty({ example: '+584121234567' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'phone must be in international format (+country_code...)',
  })
  phone: string;

  @ApiPropertyOptional({ example: 'maria@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '+584121234567' })
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/)
  whatsapp?: string;
}

class BookingServiceDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  @IsNotEmpty()
  service: string; // Service ID

  @ApiPropertyOptional({ example: ['addon1', 'addon2'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  addonNames?: string[]; // Nombres de los addons seleccionados
}

export class CreateBeautyBookingDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty({ type: ClientDataDto })
  @ValidateNested()
  @Type(() => ClientDataDto)
  client: ClientDataDto;

  @ApiPropertyOptional({
    example: '507f1f77bcf86cd799439011',
    description: 'Professional ID o null para "sin preferencia"',
  })
  @IsOptional()
  @IsString()
  professionalId?: string | null;

  @ApiProperty({ type: [BookingServiceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingServiceDto)
  services: BookingServiceDto[];

  @ApiProperty({ example: '2026-03-30' })
  @IsDateString()
  date: string; // YYYY-MM-DD

  @ApiProperty({ example: '10:30' })
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in HH:MM format',
  })
  startTime: string;

  @ApiPropertyOptional({ example: 'Prefiero corte corto a los lados' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439011' })
  @IsOptional()
  @IsString()
  locationId?: string;
}
