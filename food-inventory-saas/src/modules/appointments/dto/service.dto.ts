import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsString,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsArray,
  Min,
  MaxLength,
  ValidateNested,
} from "class-validator";

class ServiceAddonDto {
  @ApiProperty({ description: "Nombre del addon", example: "Champagne" })
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiProperty({
    description: "Descripción del addon",
    required: false,
    example: "Botella de bienvenida",
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: "Precio del addon", example: 45 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({
    description: "Duración adicional en minutos",
    required: false,
    example: 30,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  duration?: number;
}

export class CreateServiceDto {
  @ApiProperty({
    description: "Nombre del servicio",
    example: "Consulta General",
  })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({
    description: "Descripción del servicio",
    example: "Consulta médica general",
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ description: "Categoría del servicio", example: "Consultas" })
  @IsString()
  @MaxLength(100)
  category: string;

  @ApiProperty({ description: "Duración en minutos", example: 30 })
  @IsNumber()
  @Min(1)
  duration: number;

  @ApiProperty({
    description: "Tipo de servicio",
    enum: ["room", "spa", "experience", "concierge", "general"],
    default: "general",
  })
  @IsEnum(["room", "spa", "experience", "concierge", "general"])
  @IsOptional()
  serviceType?: string;

  @ApiProperty({ description: "Precio del servicio", example: 25.0 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({
    description: "Costo del servicio",
    example: 10.0,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  cost?: number;

  @ApiProperty({
    description: "Horas mínimas de antelación para reservar",
    required: false,
    example: 4,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  minAdvanceBooking?: number;

  @ApiProperty({
    description: "Horas máximas de antelación para reservar",
    required: false,
    example: 720,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  maxAdvanceBooking?: number;

  @ApiProperty({
    description: "Estado del servicio",
    enum: ["active", "inactive"],
    default: "active",
  })
  @IsEnum(["active", "inactive"])
  @IsOptional()
  status?: string;

  @ApiProperty({
    description: "Color en formato hex",
    example: "#3B82F6",
    required: false,
  })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({ description: "Requiere asignación de recurso", default: true })
  @IsBoolean()
  @IsOptional()
  requiresResource?: boolean;

  @ApiProperty({
    description: "Tipos de recursos permitidos",
    example: ["doctor", "sala"],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedResourceTypes?: string[];

  @ApiProperty({
    description: "Tiempo de preparación antes (minutos)",
    example: 5,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  bufferTimeBefore?: number;

  @ApiProperty({
    description: "Tiempo de limpieza después (minutos)",
    example: 10,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  bufferTimeAfter?: number;

  @ApiProperty({
    description: "Máximo de servicios simultáneos",
    example: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  maxSimultaneous?: number;

  @ApiProperty({
    description: "Addons opcionales para el servicio",
    required: false,
    type: [ServiceAddonDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceAddonDto)
  @IsOptional()
  addons?: ServiceAddonDto[];

  @ApiProperty({
    description: "Requiere depósito para confirmar",
    required: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  requiresDeposit?: boolean;

  @ApiProperty({
    description: "Tipo de depósito",
    enum: ["fixed", "percentage"],
    required: false,
    default: "fixed",
  })
  @IsEnum(["fixed", "percentage"])
  @IsOptional()
  depositType?: string;

  @ApiProperty({
    description: "Monto del depósito (valor o porcentaje)",
    required: false,
    example: 50,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  depositAmount?: number;

  @ApiProperty({ description: "Metadata adicional", required: false })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateServiceDto {
  @ApiProperty({ description: "Nombre del servicio", required: false })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  name?: string;

  @ApiProperty({ description: "Descripción del servicio", required: false })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ description: "Categoría del servicio", required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string;

  @ApiProperty({ description: "Duración en minutos", required: false })
  @IsNumber()
  @IsOptional()
  @Min(1)
  duration?: number;

  @ApiProperty({
    description: "Tipo de servicio",
    enum: ["room", "spa", "experience", "concierge", "general"],
    required: false,
  })
  @IsEnum(["room", "spa", "experience", "concierge", "general"])
  @IsOptional()
  serviceType?: string;

  @ApiProperty({ description: "Precio del servicio", required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  price?: number;

  @ApiProperty({ description: "Costo del servicio", required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  cost?: number;

  @ApiProperty({
    description: "Horas mínimas de antelación para reservar",
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  minAdvanceBooking?: number;

  @ApiProperty({
    description: "Horas máximas de antelación para reservar",
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  maxAdvanceBooking?: number;

  @ApiProperty({
    description: "Estado del servicio",
    enum: ["active", "inactive"],
    required: false,
  })
  @IsEnum(["active", "inactive"])
  @IsOptional()
  status?: string;

  @ApiProperty({ description: "Color en formato hex", required: false })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({
    description: "Requiere asignación de recurso",
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  requiresResource?: boolean;

  @ApiProperty({ description: "Tipos de recursos permitidos", required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedResourceTypes?: string[];

  @ApiProperty({
    description: "Tiempo de preparación antes (minutos)",
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  bufferTimeBefore?: number;

  @ApiProperty({
    description: "Tiempo de limpieza después (minutos)",
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  bufferTimeAfter?: number;

  @ApiProperty({
    description: "Máximo de servicios simultáneos",
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  maxSimultaneous?: number;

  @ApiProperty({
    description: "Addons opcionales para el servicio",
    required: false,
    type: [ServiceAddonDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceAddonDto)
  @IsOptional()
  addons?: ServiceAddonDto[];

  @ApiProperty({
    description: "Requiere depósito para confirmar",
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  requiresDeposit?: boolean;

  @ApiProperty({
    description: "Tipo de depósito",
    enum: ["fixed", "percentage"],
    required: false,
  })
  @IsEnum(["fixed", "percentage"])
  @IsOptional()
  depositType?: string;

  @ApiProperty({
    description: "Monto del depósito (valor o porcentaje)",
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  depositAmount?: number;

  @ApiProperty({ description: "Metadata adicional", required: false })
  @IsOptional()
  metadata?: Record<string, any>;
}
