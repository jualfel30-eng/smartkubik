import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsArray,
  IsNumber,
  IsObject,
  ValidateNested,
  IsEmail,
  MaxLength,
  Min,
  ArrayMinSize,
  IsMongoId,
  IsDateString,
  IsIn,
} from "class-validator";
import { Type } from "class-transformer";

class ScheduleDayDto {
  @ApiProperty({ description: "Disponible", example: true })
  @IsBoolean()
  available: boolean;

  @ApiProperty({ description: "Hora de inicio", example: "09:00" })
  @IsString()
  start: string;

  @ApiProperty({ description: "Hora de fin", example: "18:00" })
  @IsString()
  end: string;
}

class ScheduleDto {
  @ApiProperty({ type: ScheduleDayDto })
  @ValidateNested()
  @Type(() => ScheduleDayDto)
  monday: ScheduleDayDto;

  @ApiProperty({ type: ScheduleDayDto })
  @ValidateNested()
  @Type(() => ScheduleDayDto)
  tuesday: ScheduleDayDto;

  @ApiProperty({ type: ScheduleDayDto })
  @ValidateNested()
  @Type(() => ScheduleDayDto)
  wednesday: ScheduleDayDto;

  @ApiProperty({ type: ScheduleDayDto })
  @ValidateNested()
  @Type(() => ScheduleDayDto)
  thursday: ScheduleDayDto;

  @ApiProperty({ type: ScheduleDayDto })
  @ValidateNested()
  @Type(() => ScheduleDayDto)
  friday: ScheduleDayDto;

  @ApiProperty({ type: ScheduleDayDto })
  @ValidateNested()
  @Type(() => ScheduleDayDto)
  saturday: ScheduleDayDto;

  @ApiProperty({ type: ScheduleDayDto })
  @ValidateNested()
  @Type(() => ScheduleDayDto)
  sunday: ScheduleDayDto;
}

class UnavailableDateDto {
  @ApiProperty({ description: "Fecha de inicio", example: "2025-01-15" })
  @IsString()
  startDate: string;

  @ApiProperty({ description: "Fecha de fin", example: "2025-01-20" })
  @IsString()
  endDate: string;

  @ApiProperty({ description: "Razón", example: "Vacaciones", required: false })
  @IsString()
  @IsOptional()
  reason?: string;
}

const WEEKDAY_VALUES = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

class ResourceBaseRateDto {
  @ApiProperty({ description: "Monto base", example: 120 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: "Moneda", example: "USD" })
  @IsString()
  @MaxLength(10)
  currency: string;

  @ApiProperty({ description: "Descripción", required: false })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  description?: string;
}

class ResourcePricingTierDto {
  @ApiProperty({ description: "Etiqueta de la tarifa", example: "Temporada alta" })
  @IsString()
  @MaxLength(120)
  label: string;

  @ApiProperty({ description: "Monto", example: 180 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: "Moneda", example: "USD", required: false })
  @IsString()
  @IsOptional()
  @MaxLength(10)
  currency?: string;

  @ApiProperty({ description: "Fecha de inicio", example: "2025-07-01", required: false })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ description: "Fecha de fin", example: "2025-09-01", required: false })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({
    description: "Días de la semana",
    enum: WEEKDAY_VALUES,
    isArray: true,
    required: false,
  })
  @IsArray()
  @IsIn(WEEKDAY_VALUES, { each: true })
  @IsOptional()
  daysOfWeek?: string[];

  @ApiProperty({ description: "Estadía mínima", example: 2, required: false })
  @IsNumber()
  @IsOptional()
  @Min(1)
  minNights?: number;

  @ApiProperty({ description: "Estadía máxima", example: 7, required: false })
  @IsNumber()
  @IsOptional()
  @Min(1)
  maxNights?: number;

  @ApiProperty({ description: "Tarifa por defecto", required: false })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiProperty({ description: "Canal de venta", example: "Website", required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  channel?: string;
}

class ResourcePromotionDto {
  @ApiProperty({ description: "Nombre de la promoción", example: "Promo verano" })
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiProperty({
    description: "Tipo de promoción",
    enum: ["percentage", "fixed"],
    default: "percentage",
  })
  @IsEnum(["percentage", "fixed"])
  type: "percentage" | "fixed";

  @ApiProperty({ description: "Valor de la promoción", example: 15 })
  @IsNumber()
  @Min(0)
  value: number;

  @ApiProperty({ description: "Descripción", required: false })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  description?: string;

  @ApiProperty({ description: "Fecha de inicio", required: false })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ description: "Fecha de fin", required: false })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ description: "Estadía mínima", required: false })
  @IsNumber()
  @IsOptional()
  @Min(1)
  minNights?: number;

  @ApiProperty({ description: "Estadía máxima", required: false })
  @IsNumber()
  @IsOptional()
  @Min(1)
  maxNights?: number;

  @ApiProperty({ description: "Inicio ventana de reserva", required: false })
  @IsDateString()
  @IsOptional()
  bookingWindowStart?: string;

  @ApiProperty({ description: "Fin ventana de reserva", required: false })
  @IsDateString()
  @IsOptional()
  bookingWindowEnd?: string;

  @ApiProperty({ description: "¿Es acumulable?", required: false })
  @IsBoolean()
  @IsOptional()
  stackable?: boolean;

  @ApiProperty({ description: "Código promocional", required: false })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  code?: string;
}

export class CreateResourceDto {
  @ApiProperty({ description: "Nombre del recurso", example: "Dr. Juan Pérez" })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({
    description: "Tipo de recurso",
    enum: ["person", "room", "equipment", "vehicle", "other"],
    example: "person",
  })
  @IsEnum(["person", "room", "equipment", "vehicle", "other"])
  type: string;

  @ApiProperty({
    description: "Descripción",
    example: "Médico general con 10 años de experiencia",
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    description: "Email",
    example: "juan.perez@clinica.com",
    required: false,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: "Teléfono",
    example: "+58 412-1234567",
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({
    description: "Estado",
    enum: ["active", "inactive", "on_vacation"],
    default: "active",
  })
  @IsEnum(["active", "inactive", "on_vacation"])
  @IsOptional()
  status?: string;

  @ApiProperty({
    description: "Color en formato hex",
    example: "#10B981",
    required: false,
  })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({
    description: "Horario de disponibilidad",
    type: ScheduleDto,
    required: false,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => ScheduleDto)
  @IsOptional()
  schedule?: ScheduleDto;

  @ApiProperty({
    description: "Fechas no disponibles",
    type: [UnavailableDateDto],
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UnavailableDateDto)
  @IsOptional()
  unavailableDates?: UnavailableDateDto[];

  @ApiProperty({
    description: "IDs de servicios permitidos",
    example: ["507f1f77bcf86cd799439011"],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedServiceIds?: string[];

  @ApiProperty({
    description: "Especializaciones",
    example: ["cardiología", "medicina general"],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  specializations?: string[];

  @ApiProperty({ description: "Capacidad", example: 1, default: 1 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  capacity?: number;

  @ApiProperty({ description: "Metadata adicional", required: false })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiProperty({
    description: "Piso o nivel donde se ubica el recurso",
    example: "Piso 3",
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  floor?: string;

  @ApiProperty({
    description: "Zona, ala o sub-área del piso",
    example: "Ala Norte",
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  zone?: string;

  @ApiProperty({
    description: "Orden relativo dentro del piso",
    example: 5,
    required: false,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(0)
  sortIndex?: number;

  @ApiProperty({
    description: "Etiquetas geográficas o de categoría",
    example: ["vista-mar", "accesible"],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  locationTags?: string[];

  @ApiProperty({ description: "Tarifa base", required: false, type: ResourceBaseRateDto })
  @ValidateNested()
  @Type(() => ResourceBaseRateDto)
  @IsOptional()
  baseRate?: ResourceBaseRateDto;

  @ApiProperty({
    description: "Tarifas estacionales o personalizadas",
    required: false,
    type: [ResourcePricingTierDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResourcePricingTierDto)
  @IsOptional()
  pricing?: ResourcePricingTierDto[];

  @ApiProperty({
    description: "Promociones aplicables al recurso",
    required: false,
    type: [ResourcePromotionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResourcePromotionDto)
  @IsOptional()
  promotions?: ResourcePromotionDto[];
}

export class UpdateResourceDto {
  @ApiProperty({ description: "Nombre del recurso", required: false })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  name?: string;

  @ApiProperty({
    description: "Tipo de recurso",
    enum: ["person", "room", "equipment", "vehicle", "other"],
    required: false,
  })
  @IsEnum(["person", "room", "equipment", "vehicle", "other"])
  @IsOptional()
  type?: string;

  @ApiProperty({ description: "Descripción", required: false })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ description: "Email", required: false })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ description: "Teléfono", required: false })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({
    description: "Estado",
    enum: ["active", "inactive", "on_vacation"],
    required: false,
  })
  @IsEnum(["active", "inactive", "on_vacation"])
  @IsOptional()
  status?: string;

  @ApiProperty({ description: "Color en formato hex", required: false })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({
    description: "Horario de disponibilidad",
    type: ScheduleDto,
    required: false,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => ScheduleDto)
  @IsOptional()
  schedule?: ScheduleDto;

  @ApiProperty({
    description: "Fechas no disponibles",
    type: [UnavailableDateDto],
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UnavailableDateDto)
  @IsOptional()
  unavailableDates?: UnavailableDateDto[];

  @ApiProperty({ description: "IDs de servicios permitidos", required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedServiceIds?: string[];

  @ApiProperty({ description: "Especializaciones", required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  specializations?: string[];

  @ApiProperty({ description: "Capacidad", required: false })
  @IsNumber()
  @IsOptional()
  @Min(1)
  capacity?: number;

  @ApiProperty({ description: "Metadata adicional", required: false })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiProperty({
    description: "Piso o nivel donde se ubica el recurso",
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  floor?: string;

  @ApiProperty({
    description: "Zona o ala dentro del piso",
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  zone?: string;

  @ApiProperty({
    description: "Orden relativo dentro del piso",
    required: false,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(0)
  sortIndex?: number;

  @ApiProperty({
    description: "Etiquetas auxiliares para filtros de ubicación",
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  locationTags?: string[];

  @ApiProperty({ description: "Tarifa base", required: false, type: ResourceBaseRateDto })
  @ValidateNested()
  @Type(() => ResourceBaseRateDto)
  @IsOptional()
  baseRate?: ResourceBaseRateDto;

  @ApiProperty({
    description: "Tarifas estacionales o personalizadas",
    required: false,
    type: [ResourcePricingTierDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResourcePricingTierDto)
  @IsOptional()
  pricing?: ResourcePricingTierDto[];

  @ApiProperty({
    description: "Promociones aplicables al recurso",
    required: false,
    type: [ResourcePromotionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResourcePromotionDto)
  @IsOptional()
  promotions?: ResourcePromotionDto[];
}

export class ResourceLayoutItemDto {
  @ApiProperty({
    description: "ID del recurso a reubicar",
    example: "64f1c0e1ff2e5a0012a45678",
  })
  @IsMongoId()
  id: string;

  @ApiProperty({
    description: "Piso o nivel",
    example: "Piso 2",
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  floor?: string;

  @ApiProperty({
    description: "Zona o ala dentro del piso",
    example: "Ala Este",
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  zone?: string;

  @ApiProperty({
    description: "Orden relativo dentro del piso",
    example: 3,
    required: false,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(0)
  sortIndex?: number;

  @ApiProperty({
    description: "Etiquetas para filtros de ubicación",
    example: ["vista-mar", "doble"],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  locationTags?: string[];
}

export class UpdateResourceLayoutDto {
  @ApiProperty({
    type: [ResourceLayoutItemDto],
    description: "Listado de habitaciones con sus nuevos atributos de layout",
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ResourceLayoutItemDto)
  items: ResourceLayoutItemDto[];
}
