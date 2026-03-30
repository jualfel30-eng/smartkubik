import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  MaxLength,
  ValidateNested,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ScheduleSlotDto {
  @ApiProperty({ example: 1, description: '0=domingo, 6=sábado' })
  @IsNumber()
  @Min(0)
  @Max(6)
  day: number;

  @ApiProperty({ example: '09:00' })
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'start must be in HH:MM format',
  })
  start: string;

  @ApiProperty({ example: '18:00' })
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'end must be in HH:MM format',
  })
  end: string;

  @ApiPropertyOptional({ example: '12:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'breakStart must be in HH:MM format',
  })
  breakStart?: string;

  @ApiPropertyOptional({ example: '13:00' })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'breakEnd must be in HH:MM format',
  })
  breakEnd?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isWorking: boolean;
}

export class CreateProfessionalDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'Master Barber' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  role?: string;

  @ApiPropertyOptional({ example: '10 años de experiencia en cortes modernos' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;

  @ApiPropertyOptional({ example: 'data:image/jpeg;base64,...' })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ example: ['Cortes modernos', 'Fade', 'Barba'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialties?: string[];

  @ApiPropertyOptional({ example: '@juan.barber' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  instagram?: string;

  @ApiPropertyOptional({ type: [ScheduleSlotDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleSlotDto)
  schedule?: ScheduleSlotDto[];

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439011' })
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;
}
