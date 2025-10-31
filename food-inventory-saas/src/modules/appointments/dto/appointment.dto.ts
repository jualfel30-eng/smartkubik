import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsNumber,
  IsDateString,
  IsMongoId,
  MaxLength,
  Min,
  IsArray,
  ValidateNested,
  IsObject,
} from "class-validator";

class AppointmentParticipantDto {
  @ApiProperty({ description: "Nombre del participante", example: "María" })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({
    description: "Correo del participante",
    example: "maria@example.com",
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  email?: string;

  @ApiProperty({
    description: "Teléfono del participante",
    example: "+58 412-5555555",
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  phone?: string;

  @ApiProperty({
    description: "Rol del participante",
    example: "huésped",
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  role?: string;
}

class AppointmentAddonDto {
  @ApiProperty({ description: "Nombre del addon", example: "Champagne" })
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiProperty({ description: "Precio del addon", example: 45 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({
    description: "Cantidad solicitada",
    example: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  quantity?: number;
}

export class CreateAppointmentDto {
  @ApiProperty({
    description: "ID del cliente",
    example: "507f1f77bcf86cd799439011",
  })
  @IsMongoId()
  customerId: string;

  @ApiProperty({
    description: "ID del servicio",
    example: "507f1f77bcf86cd799439012",
  })
  @IsMongoId()
  serviceId: string;

  @ApiProperty({
    description: "ID de la ubicación/sede (opcional)",
    example: "507f1f77bcf86cd799439099",
    required: false,
  })
  @IsString()
  @IsOptional()
  locationId?: string;

  @ApiProperty({
    description: "ID del recurso (opcional)",
    example: "507f1f77bcf86cd799439013",
    required: false,
  })
  @IsMongoId()
  @IsOptional()
  resourceId?: string;

  @ApiProperty({
    description: "IDs de recursos adicionales",
    example: ["507f1f77bcf86cd799439099"],
    required: false,
  })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  additionalResourceIds?: string[];

  @ApiProperty({
    description: "Fecha y hora de inicio",
    example: "2025-01-15T10:00:00Z",
  })
  @IsDateString()
  startTime: string;

  @ApiProperty({
    description: "Fecha y hora de fin",
    example: "2025-01-15T10:30:00Z",
  })
  @IsDateString()
  endTime: string;

  @ApiProperty({
    description: "Notas adicionales",
    example: "Cliente prefiere la sala 2",
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;

  @ApiProperty({
    description: "Estado de la cita",
    enum: ["pending", "confirmed"],
    default: "pending",
  })
  @IsEnum(["pending", "confirmed"])
  @IsOptional()
  status?: string;

  @ApiProperty({
    description: "Color personalizado",
    example: "#EF4444",
    required: false,
  })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({
    description: "Capacidad consumida por la cita (para reservas grupales)",
    example: 2,
    required: false,
    default: 1,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(0)
  capacityUsed?: number;

  @ApiProperty({
    description: "Capacidad máxima ocupada",
    required: false,
    default: 1,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  capacity?: number;

  @ApiProperty({
    description: "ID de la serie (si pertenece a una recurrencia)",
    required: false,
    example: "b3e2c673-ff94-4ca3-8b80-5fb4e6ed9f1d",
  })
  @IsString()
  @IsOptional()
  seriesId?: string;

  @ApiProperty({
    description: "Bandera para marcar la cita maestra de la serie",
    required: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isSeriesMaster?: boolean;

  @ApiProperty({
    description: "Orden dentro de la serie (0-based)",
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  seriesOrder?: number;

  @ApiProperty({
    description: "Participantes adicionales",
    type: [AppointmentParticipantDto],
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AppointmentParticipantDto)
  @IsOptional()
  participants?: AppointmentParticipantDto[];

  @ApiProperty({
    description: "Addons sumados al servicio",
    type: [AppointmentAddonDto],
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AppointmentAddonDto)
  @IsOptional()
  addons?: AppointmentAddonDto[];

  @ApiProperty({
    description: "Origen de la reserva",
    enum: ["backoffice", "storefront", "concierge", "integration"],
    required: false,
  })
  @IsEnum(["backoffice", "storefront", "concierge", "integration"])
  @IsOptional()
  source?: string;

  @ApiProperty({ description: "Metadata adicional", required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiProperty({ description: "Identificador externo", required: false })
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiProperty({ description: "Origen externo de la reserva", required: false })
  @IsOptional()
  @IsString()
  externalSource?: string;
}

export class UpdateAppointmentDto {
  @ApiProperty({ description: "ID del cliente", required: false })
  @IsMongoId()
  @IsOptional()
  customerId?: string;

  @ApiProperty({ description: "ID del servicio", required: false })
  @IsMongoId()
  @IsOptional()
  serviceId?: string;

  @ApiProperty({ description: "ID de la ubicación/sede", required: false })
  @IsString()
  @IsOptional()
  locationId?: string;

  @ApiProperty({ description: "ID del recurso", required: false })
  @IsMongoId()
  @IsOptional()
  resourceId?: string;

  @ApiProperty({
    description: "IDs de recursos adicionales",
    required: false,
  })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  additionalResourceIds?: string[];

  @ApiProperty({ description: "Fecha y hora de inicio", required: false })
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @ApiProperty({ description: "Fecha y hora de fin", required: false })
  @IsDateString()
  @IsOptional()
  endTime?: string;

  @ApiProperty({ description: "Notas adicionales", required: false })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;

  @ApiProperty({
    description: "Estado de la cita",
    enum: [
      "pending",
      "confirmed",
      "in_progress",
      "completed",
      "cancelled",
      "no_show",
    ],
    required: false,
  })
  @IsEnum([
    "pending",
    "confirmed",
    "in_progress",
    "completed",
    "cancelled",
    "no_show",
  ])
  @IsOptional()
  status?: string;

  @ApiProperty({ description: "Razón de cancelación", required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  cancellationReason?: string;

  @ApiProperty({ description: "Color personalizado", required: false })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({ description: "Monto pagado", required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  paidAmount?: number;

  @ApiProperty({
    description: "Estado de pago",
    enum: ["pending", "paid", "partial", "refunded"],
    required: false,
  })
  @IsEnum(["pending", "paid", "partial", "refunded"])
  @IsOptional()
  paymentStatus?: string;

  @ApiProperty({
    description: "Capacidad consumida por la cita",
    required: false,
    minimum: 0,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(0)
  capacityUsed?: number;

  @ApiProperty({
    description: "Capacidad máxima ocupada",
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  capacity?: number;

  @ApiProperty({
    description: "ID de la serie (si pertenece a una recurrencia)",
    required: false,
  })
  @IsString()
  @IsOptional()
  seriesId?: string;

  @ApiProperty({
    description: "Bandera para marcar la cita maestra de la serie",
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isSeriesMaster?: boolean;

  @ApiProperty({
    description: "Orden dentro de la serie (0-based)",
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  seriesOrder?: number;

  @ApiProperty({
    description: "Participantes adicionales",
    required: false,
    type: [AppointmentParticipantDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AppointmentParticipantDto)
  @IsOptional()
  participants?: AppointmentParticipantDto[];

  @ApiProperty({
    description: "Addons sumados al servicio",
    required: false,
    type: [AppointmentAddonDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AppointmentAddonDto)
  @IsOptional()
  addons?: AppointmentAddonDto[];

  @ApiProperty({
    description: "Origen de la reserva",
    enum: ["backoffice", "storefront", "concierge", "integration"],
    required: false,
  })
  @IsEnum(["backoffice", "storefront", "concierge", "integration"])
  @IsOptional()
  source?: string;

  @ApiProperty({ description: "Metadata adicional", required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiProperty({ description: "Identificador externo", required: false })
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiProperty({ description: "Origen externo", required: false })
  @IsOptional()
  @IsString()
  externalSource?: string;
}

export class AppointmentFilterDto {
  @ApiProperty({
    description: "Fecha de inicio del rango",
    example: "2025-01-01",
    required: false,
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({
    description: "Fecha de fin del rango",
    example: "2025-01-31",
    required: false,
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ description: "ID del cliente", required: false })
  @IsMongoId()
  @IsOptional()
  customerId?: string;

  @ApiProperty({ description: "ID del servicio", required: false })
  @IsMongoId()
  @IsOptional()
  serviceId?: string;

  @ApiProperty({ description: "ID de la ubicación/sede", required: false })
  @IsString()
  @IsOptional()
  locationId?: string;

  @ApiProperty({ description: "ID del recurso", required: false })
  @IsMongoId()
  @IsOptional()
  resourceId?: string;

  @ApiProperty({
    description: "Estado de la cita",
    enum: [
      "pending",
      "confirmed",
      "in_progress",
      "completed",
      "cancelled",
      "no_show",
    ],
    required: false,
  })
  @IsEnum([
    "pending",
    "confirmed",
    "in_progress",
    "completed",
    "cancelled",
    "no_show",
  ])
  @IsOptional()
  status?: string;

  @ApiProperty({
    description: "Filtrar por capacidad consumida",
    example: 2,
    required: false,
  })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  @Min(0)
  capacityUsed?: number;

  @ApiProperty({
    description: "Búsqueda de texto",
    example: "Juan Pérez",
    required: false,
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({
    description: "Origen de la reserva",
    enum: ["backoffice", "storefront", "concierge", "integration"],
    required: false,
  })
  @IsEnum(["backoffice", "storefront", "concierge", "integration"])
  @IsOptional()
  source?: string;
}

export class CheckAvailabilityDto {
  @ApiProperty({
    description: "ID del servicio",
    example: "507f1f77bcf86cd799439012",
  })
  @IsMongoId()
  serviceId: string;

  @ApiProperty({
    description: "ID del recurso (opcional)",
    example: "507f1f77bcf86cd799439013",
    required: false,
  })
  @IsMongoId()
  @IsOptional()
  resourceId?: string;

  @ApiProperty({
    description: "IDs de recursos adicionales para chequear disponibilidad conjunta",
    required: false,
    example: ["507f1f77bcf86cd799439014"],
  })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  additionalResourceIds?: string[];

  @ApiProperty({ description: "Fecha a verificar", example: "2025-01-15" })
  @IsDateString()
  date: string;

  @ApiProperty({
    description: "Capacidad requerida para la reserva",
    required: false,
    example: 2,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  capacity?: number;
}

export class CreateAppointmentSeriesDto {
  @ApiProperty({ type: CreateAppointmentDto })
  @ValidateNested()
  @Type(() => CreateAppointmentDto)
  baseAppointment: CreateAppointmentDto;

  @ApiProperty({
    description: "Frecuencia de repetición",
    enum: ["daily", "weekly"],
    default: "weekly",
  })
  @IsEnum(["daily", "weekly"])
  frequency: string;

  @ApiProperty({
    description: "Intervalo de repetición",
    example: 1,
    default: 1,
  })
  @IsNumber()
  @Min(1)
  interval: number;

  @ApiProperty({
    description: "Número de ocurrencias",
    required: false,
    example: 6,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  count?: number;

  @ApiProperty({
    description: "Fecha límite de la serie",
    required: false,
    example: "2025-03-31T23:59:59Z",
  })
  @IsDateString()
  @IsOptional()
  until?: string;

  @ApiProperty({
    description:
      "Días de la semana (0=domingo ... 6=sábado) usados en frecuencia semanal",
    required: false,
    type: [Number],
    example: [1, 3, 5],
  })
  @IsArray()
  @IsOptional()
  daysOfWeek?: number[];

  @ApiProperty({
    description: "Marca la primera cita como maestra de la serie",
    default: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  markSeriesMaster?: boolean;
}

class GroupAttendeeDto {
  @ApiProperty({ description: "ID del cliente", example: "507f1f77bcf86cd799439022" })
  @IsMongoId()
  customerId: string;

  @ApiProperty({
    description: "Notas específicas para este participante",
    required: false,
    example: "Traer identificación para tour",
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;

  @ApiProperty({
    description: "Capacidad consumida por este participante",
    required: false,
    example: 1,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  capacityUsed?: number;

  @ApiProperty({
    description: "Participantes adicionales asociados a este cliente",
    type: [AppointmentParticipantDto],
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AppointmentParticipantDto)
  @IsOptional()
  participants?: AppointmentParticipantDto[];

  @ApiProperty({
    description: "Addons personalizados para este participante",
    type: [AppointmentAddonDto],
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AppointmentAddonDto)
  @IsOptional()
  addons?: AppointmentAddonDto[];
}

export class CreateAppointmentGroupDto {
  @ApiProperty({ type: CreateAppointmentDto })
  @ValidateNested()
  @Type(() => CreateAppointmentDto)
  baseAppointment: CreateAppointmentDto;

  @ApiProperty({
    type: [GroupAttendeeDto],
    description:
      "Participantes adicionales del bloque grupal. El cliente primario debe ir en baseAppointment.customerId.",
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GroupAttendeeDto)
  attendees: GroupAttendeeDto[];

  @ApiProperty({
    description: "Metadatos adicionales para el bloque",
    required: false,
    example: { groupName: "Tour Gourmet 10am" },
  })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class CreateManualDepositDto {
  @ApiProperty({ description: "Monto depositado", example: 50 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    description: "Moneda del depósito",
    example: "VES",
    default: "VES",
  })
  @IsString()
  @MaxLength(10)
  @IsOptional()
  currency?: string;

  @ApiProperty({
    description: "Referencia del depósito o número de comprobante",
    example: "REF-123456",
    required: false,
  })
  @IsString()
  @MaxLength(100)
  @IsOptional()
  reference?: string;

  @ApiProperty({
    description: "URL del comprobante (si aplica)",
    required: false,
    example: "https://drive.google.com/receipt.jpg",
  })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  proofUrl?: string;

  @ApiProperty({
    description: "Notas adicionales",
    required: false,
    example: "Pagado por transferencia Banco Mercantil",
  })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  notes?: string;

  @ApiProperty({
    description: "ID de la cuenta bancaria donde se registrará el depósito",
    required: false,
    example: "672f0dba091cb1bcfea30f12",
  })
  @IsOptional()
  @IsMongoId()
  bankAccountId?: string;

  @ApiProperty({
    description:
      "Método reportado por el huésped (transferencia, pago móvil, efectivo, zelle, etc.)",
    required: false,
    example: "transferencia",
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  method?: string;

  @ApiProperty({
    description: "Monto equivalente en USD (opcional)",
    required: false,
    example: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amountUsd?: number;

  @ApiProperty({
    description: "Monto equivalente en VES (opcional)",
    required: false,
    example: 1800,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amountVes?: number;

  @ApiProperty({
    description: "Tasa de cambio usada como referencia",
    required: false,
    example: 36,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  exchangeRate?: number;

  @ApiProperty({
    description: "Nombre del archivo de comprobante o captura",
    required: false,
    example: "captura-mercantil.jpg",
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  proofFileName?: string;

  @ApiProperty({
    description: "Tipo MIME del comprobante",
    required: false,
    example: "image/jpeg",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  proofMimeType?: string;

  @ApiProperty({
    description:
      "Contenido del comprobante en Base64 (máximo 5MB). Se almacena como respaldo interno.",
    required: false,
  })
  @IsOptional()
  @IsString()
  proofBase64?: string;
}

export class UpdateManualDepositDto {
  @ApiProperty({
    description: "Estado final del depósito",
    enum: ["confirmed", "rejected"],
  })
  @IsEnum(["confirmed", "rejected"])
  status: "confirmed" | "rejected";

  @ApiProperty({
    description: "Notas adicionales",
    required: false,
    example: "Depósito verificado en extracto bancario",
  })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  notes?: string;

  @ApiProperty({
    description: "URL de soporte o imagen final",
    required: false,
    example: "https://drive.google.com/receipt_confirmed.jpg",
  })
  @IsString()
  @MaxLength(500)
  @IsOptional()
  proofUrl?: string;

  @ApiProperty({
    description: "ID de la cuenta bancaria donde se registrará el abono",
    required: false,
    example: "672f0dba091cb1bcfea30f12",
  })
  @IsOptional()
  @IsMongoId()
  bankAccountId?: string;

  @ApiProperty({
    description: "Monto confirmado (si difiere del reportado)",
    required: false,
    example: 45.5,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  confirmedAmount?: number;

  @ApiProperty({
    description: "Método final confirmado",
    required: false,
    example: "transferencia",
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  method?: string;

  @ApiProperty({
    description: "Referencia final confirmada",
    required: false,
    example: "TRF-554433",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;

  @ApiProperty({
    description: "Fecha del depósito confirmado",
    required: false,
    example: "2025-02-07T18:30:00.000Z",
  })
  @IsOptional()
  @IsDateString()
  transactionDate?: string;

  @ApiProperty({
    description: "Notas internas de la decisión",
    required: false,
    example: "Validado contra estado bancario del 06/02",
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  decisionNotes?: string;

  @ApiProperty({
    description: "Nombre del comprobante actualizado",
    required: false,
    example: "captura-validada.png",
  })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  proofFileName?: string;

  @ApiProperty({
    description: "Tipo MIME del comprobante actualizado",
    required: false,
    example: "image/png",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  proofMimeType?: string;

  @ApiProperty({
    description:
      "Contenido en Base64 del comprobante actualizado (máximo 5MB). Reemplaza al existente.",
    required: false,
  })
  @IsOptional()
  @IsString()
  proofBase64?: string;

  @ApiProperty({
    description: "Monto equivalente en USD (opcional)",
    required: false,
    example: 50,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amountUsd?: number;

  @ApiProperty({
    description: "Monto equivalente en VES (opcional)",
    required: false,
    example: 1800,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amountVes?: number;

  @ApiProperty({
    description: "Tasa de cambio asociada",
    required: false,
    example: 36,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  exchangeRate?: number;
}

export class CreateRoomBlockDto {
  @ApiProperty({
    description: "ID del recurso a bloquear",
    example: "507f1f77bcf86cd799439055",
  })
  @IsMongoId()
  resourceId: string;

  @ApiProperty({
    description: "ID de la ubicación asociada",
    required: false,
    example: "tower-a",
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  locationId?: string;

  @ApiProperty({
    description: "Fecha y hora de inicio del bloqueo",
    example: "2025-02-18T15:00:00.000Z",
  })
  @IsDateString()
  startTime: string;

  @ApiProperty({
    description: "Fecha y hora de fin del bloqueo",
    example: "2025-02-19T11:00:00.000Z",
  })
  @IsDateString()
  endTime: string;

  @ApiProperty({
    description: "Motivo del bloqueo",
    example: "Mantenimiento preventivo",
  })
  @IsString()
  @MaxLength(500)
  reason: string;

  @ApiProperty({
    description: "Metadatos adicionales",
    required: false,
    example: { technician: "Juan", taskId: "HK-123" },
  })
  @IsOptional()
  metadata?: Record<string, any>;
}
