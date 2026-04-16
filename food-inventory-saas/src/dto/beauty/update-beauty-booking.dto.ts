import {
  IsString,
  IsOptional,
  IsDateString,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO para reagendar una reserva (fecha, hora, profesional, notas).
 * tenantId se inyecta desde JWT — no se incluye en el body.
 */
export class UpdateBeautyBookingDto {
  @ApiPropertyOptional({ example: '2026-04-20', description: 'Nueva fecha de la reserva' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ example: '11:00', description: 'Nueva hora de inicio' })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'startTime must be in HH:MM format',
  })
  startTime?: string;

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439011', description: 'Nuevo profesional (null = sin preferencia)' })
  @IsOptional()
  @IsString()
  professionalId?: string | null;

  @ApiPropertyOptional({ example: 'Nuevo comentario del cliente' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
