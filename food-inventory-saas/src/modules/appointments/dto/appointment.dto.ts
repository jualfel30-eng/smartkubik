import { ApiProperty } from "@nestjs/swagger";
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
} from "class-validator";

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
    description: "ID del recurso (opcional)",
    example: "507f1f77bcf86cd799439013",
    required: false,
  })
  @IsMongoId()
  @IsOptional()
  resourceId?: string;

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

  @ApiProperty({ description: "Metadata adicional", required: false })
  @IsOptional()
  metadata?: Record<string, any>;
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

  @ApiProperty({ description: "ID del recurso", required: false })
  @IsMongoId()
  @IsOptional()
  resourceId?: string;

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

  @ApiProperty({ description: "Metadata adicional", required: false })
  @IsOptional()
  metadata?: Record<string, any>;
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
    description: "Búsqueda de texto",
    example: "Juan Pérez",
    required: false,
  })
  @IsString()
  @IsOptional()
  search?: string;
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

  @ApiProperty({ description: "Fecha a verificar", example: "2025-01-15" })
  @IsDateString()
  date: string;
}
