import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsArray,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateServiceDto {
  @ApiProperty({ description: 'Nombre del servicio', example: 'Consulta General' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({ description: 'Descripción del servicio', example: 'Consulta médica general', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ description: 'Categoría del servicio', example: 'Consultas' })
  @IsString()
  @MaxLength(100)
  category: string;

  @ApiProperty({ description: 'Duración en minutos', example: 30 })
  @IsNumber()
  @Min(1)
  duration: number;

  @ApiProperty({ description: 'Precio del servicio', example: 25.00 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ description: 'Costo del servicio', example: 10.00, required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  cost?: number;

  @ApiProperty({ description: 'Estado del servicio', enum: ['active', 'inactive'], default: 'active' })
  @IsEnum(['active', 'inactive'])
  @IsOptional()
  status?: string;

  @ApiProperty({ description: 'Color en formato hex', example: '#3B82F6', required: false })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({ description: 'Requiere asignación de recurso', default: true })
  @IsBoolean()
  @IsOptional()
  requiresResource?: boolean;

  @ApiProperty({
    description: 'Tipos de recursos permitidos',
    example: ['doctor', 'sala'],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedResourceTypes?: string[];

  @ApiProperty({ description: 'Tiempo de preparación antes (minutos)', example: 5, required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  bufferTimeBefore?: number;

  @ApiProperty({ description: 'Tiempo de limpieza después (minutos)', example: 10, required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  bufferTimeAfter?: number;

  @ApiProperty({ description: 'Máximo de servicios simultáneos', example: 1, required: false })
  @IsNumber()
  @IsOptional()
  @Min(1)
  maxSimultaneous?: number;

  @ApiProperty({ description: 'Metadata adicional', required: false })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateServiceDto {
  @ApiProperty({ description: 'Nombre del servicio', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  name?: string;

  @ApiProperty({ description: 'Descripción del servicio', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ description: 'Categoría del servicio', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string;

  @ApiProperty({ description: 'Duración en minutos', required: false })
  @IsNumber()
  @IsOptional()
  @Min(1)
  duration?: number;

  @ApiProperty({ description: 'Precio del servicio', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  price?: number;

  @ApiProperty({ description: 'Costo del servicio', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  cost?: number;

  @ApiProperty({ description: 'Estado del servicio', enum: ['active', 'inactive'], required: false })
  @IsEnum(['active', 'inactive'])
  @IsOptional()
  status?: string;

  @ApiProperty({ description: 'Color en formato hex', required: false })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({ description: 'Requiere asignación de recurso', required: false })
  @IsBoolean()
  @IsOptional()
  requiresResource?: boolean;

  @ApiProperty({ description: 'Tipos de recursos permitidos', required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedResourceTypes?: string[];

  @ApiProperty({ description: 'Tiempo de preparación antes (minutos)', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  bufferTimeBefore?: number;

  @ApiProperty({ description: 'Tiempo de limpieza después (minutos)', required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  bufferTimeAfter?: number;

  @ApiProperty({ description: 'Máximo de servicios simultáneos', required: false })
  @IsNumber()
  @IsOptional()
  @Min(1)
  maxSimultaneous?: number;

  @ApiProperty({ description: 'Metadata adicional', required: false })
  @IsOptional()
  metadata?: Record<string, any>;
}
