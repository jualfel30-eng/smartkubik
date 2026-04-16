import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsNumber,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateResourceBlockDto {
  @ApiProperty({ example: '64f1b2c3d4e5f6789abcdef0' })
  @IsString()
  @IsNotEmpty()
  professionalId: string;

  @ApiProperty({ example: '2026-04-20' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: '13:00' })
  @IsString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ example: '14:00' })
  @IsString()
  @IsNotEmpty()
  endTime: string;

  @ApiProperty({
    example: 'Almuerzo',
    enum: ['Almuerzo', 'Mantenimiento', 'Limpieza', 'Personal', 'Otro'],
  })
  @IsString()
  @IsIn(['Almuerzo', 'Mantenimiento', 'Limpieza', 'Personal', 'Otro'])
  reason: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  isRecurring?: boolean;

  @ApiPropertyOptional({ example: [0, 1], description: '0=Mon...6=Sun' })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  recurringDays?: number[];
}
