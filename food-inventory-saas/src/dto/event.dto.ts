import { IsString, IsDateString, IsBoolean, IsOptional, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEventDto {
  @ApiProperty({ description: 'Título del evento', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @ApiPropertyOptional({ description: 'Descripción detallada del evento', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: 'Fecha y hora de inicio del evento (formato ISO 8601)' })
  @IsDateString()
  start: string;

  @ApiPropertyOptional({ description: 'Fecha y hora de fin del evento (formato ISO 8601)' })
  @IsOptional()
  @IsDateString()
  end?: string;

  @ApiPropertyOptional({ description: 'Indica si el evento dura todo el día', default: false })
  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @ApiPropertyOptional({ description: 'Color para mostrar el evento en el calendario' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;
}

export class UpdateEventDto {
  @ApiPropertyOptional({ description: 'Nuevo título del evento', maxLength: 100 })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional({ description: 'Nueva descripción del evento', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Nueva fecha de inicio (formato ISO 8601)' })
  @IsOptional()
  @IsDateString()
  start?: string;

  @ApiPropertyOptional({ description: 'Nueva fecha de fin (formato ISO 8601)' })
  @IsOptional()
  @IsDateString()
  end?: string;

  @ApiPropertyOptional({ description: 'Indica si el evento dura todo el día' })
  @IsOptional()
  @IsBoolean()
  allDay?: boolean;

  @ApiPropertyOptional({ description: 'Nuevo color para el evento' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  color?: string;
}
