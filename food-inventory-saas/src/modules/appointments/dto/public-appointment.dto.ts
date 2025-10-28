import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

class PublicCustomerDto {
  @ApiProperty({ description: "Nombre del huésped", example: "María" })
  @IsString()
  @MaxLength(200)
  firstName: string;

  @ApiProperty({
    description: "Apellido del huésped",
    example: "González",
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  lastName?: string;

  @ApiProperty({
    description: "Correo electrónico del huésped",
    example: "maria@example.com",
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: "Teléfono de contacto",
    example: "+58 412-555-1234",
  })
  @IsString()
  @MaxLength(30)
  phone: string;

  @ApiProperty({
    description: "Idioma preferido",
    example: "es",
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(5)
  preferredLanguage?: string;
}

class PublicGuestDto {
  @ApiProperty({ description: "Nombre del acompañante", example: "Pedro" })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({
    description: "Correo del acompañante",
    required: false,
    example: "pedro@example.com",
  })
  @IsEmail()
  @IsOptional()
  guestEmail?: string;

  @ApiProperty({
    description: "Teléfono del acompañante",
    required: false,
    example: "+58 424-555-9876",
  })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  guestPhone?: string;

  @ApiProperty({
    description: "Rol o relación",
    required: false,
    example: "huésped adicional",
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  role?: string;
}

class PublicAddonDto {
  @ApiProperty({ description: "Nombre del addon", example: "Champagne" })
  @IsString()
  @MaxLength(150)
  name: string;

  @ApiProperty({ description: "Precio del addon", example: 45 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({
    description: "Cantidad del addon",
    example: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  quantity?: number;
}

export class PublicAvailabilityDto {
  @ApiProperty({
    description: "ID del tenant",
    example: "64f27c6f2f1e8a0012345678",
  })
  @IsMongoId()
  tenantId: string;

  @ApiProperty({
    description: "ID del servicio a reservar",
    example: "64f27c6f2f1e8a0098765432",
  })
  @IsMongoId()
  serviceId: string;

  @ApiProperty({
    description: "Fecha objetivo (se ignoran horas)",
    example: "2025-02-18",
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    description: "ID del recurso principal",
    required: false,
    example: "64f27c6f2f1e8a0022334455",
  })
  @IsMongoId()
  @IsOptional()
  resourceId?: string;

  @ApiProperty({
    description: "Recursos adicionales requeridos",
    required: false,
    example: ["64f27c6f2f1e8a0066554433"],
  })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  additionalResourceIds?: string[];

  @ApiProperty({
    description: "Capacidad requerida (número de huéspedes)",
    required: false,
    example: 2,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  capacity?: number;
}

export class PublicCreateAppointmentDto {
  @ApiProperty({
    description: "ID del tenant",
    example: "64f27c6f2f1e8a0012345678",
  })
  @IsMongoId()
  tenantId: string;

  @ApiProperty({
    description: "ID del servicio",
    example: "64f27c6f2f1e8a0098765432",
  })
  @IsMongoId()
  serviceId: string;

  @ApiProperty({
    description: "ID de la sede o ubicación",
    required: false,
    example: "main-hotel",
  })
  @IsString()
  @IsOptional()
  locationId?: string;

  @ApiProperty({
    description: "ID del recurso principal",
    required: false,
    example: "64f27c6f2f1e8a0022334455",
  })
  @IsMongoId()
  @IsOptional()
  resourceId?: string;

  @ApiProperty({
    description: "Recursos adicionales requeridos",
    required: false,
    example: ["64f27c6f2f1e8a0066554433"],
  })
  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  additionalResourceIds?: string[];

  @ApiProperty({
    description: "Hora de inicio seleccionada en formato ISO",
    example: "2025-02-18T14:00:00.000Z",
  })
  @IsDateString()
  startTime: string;

  @ApiProperty({
    description: "Notas adicionales del huésped",
    required: false,
    example: "Se celebra aniversario, preparar decoración especial",
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  notes?: string;

  @ApiProperty({
    description: "Número de huéspedes simultáneos",
    required: false,
    example: 2,
  })
  @IsNumber()
  @IsOptional()
  @Min(1)
  partySize?: number;

  @ApiProperty({
    description: "Detalle del huésped principal",
    type: PublicCustomerDto,
  })
  @ValidateNested()
  @Type(() => PublicCustomerDto)
  customer: PublicCustomerDto;

  @ApiProperty({
    description: "Participantes adicionales",
    type: [PublicGuestDto],
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PublicGuestDto)
  @IsOptional()
  guests?: PublicGuestDto[];

  @ApiProperty({
    description: "Addons seleccionados",
    type: [PublicAddonDto],
    required: false,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PublicAddonDto)
  @IsOptional()
  addons?: PublicAddonDto[];

  @ApiProperty({
    description: "Metadata adicional",
    required: false,
    example: { sourceCampaign: "new-year" },
  })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiProperty({
    description: "Aceptación de términos y políticas",
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  acceptPolicies?: boolean;
}

export class PublicCancelAppointmentDto {
  @ApiProperty({
    description: "ID del tenant dueño de la cita",
    example: "64f27c6f2f1e8a0012345678",
  })
  @IsMongoId()
  tenantId: string;

  @ApiProperty({
    description: "Código de cancelación entregado en la reserva",
    example: "CNL-AB12CD",
  })
  @IsString()
  @MaxLength(100)
  cancellationCode: string;

  @ApiProperty({
    description: "Motivo de la cancelación",
    required: false,
    example: "Viaje reprogramado",
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}

export class PublicAppointmentLookupDto {
  @ApiProperty({
    description: "ID del tenant",
    example: "64f27c6f2f1e8a0012345678",
  })
  @IsMongoId()
  tenantId: string;

  @ApiProperty({
    description: "Correo electrónico del huésped",
    example: "maria@example.com",
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: "Teléfono del huésped",
    example: "+58 412-555-1234",
    required: false,
  })
  @IsString()
  @IsOptional()
  @MaxLength(30)
  phone?: string;

  @ApiProperty({
    description: "Código de cancelación para filtrar una reserva específica",
    required: false,
    example: "CNL-AB12CD",
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  cancellationCode?: string;

  @ApiProperty({
    description: "Incluir reservas pasadas",
    required: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  includePast?: boolean;
}

export class PublicRescheduleAppointmentDto {
  @ApiProperty({
    description: "ID del tenant",
    example: "64f27c6f2f1e8a0012345678",
  })
  @IsMongoId()
  tenantId: string;

  @ApiProperty({
    description: "Nuevo horario de inicio",
    example: "2025-02-18T16:00:00.000Z",
  })
  @IsDateString()
  newStartTime: string;

  @ApiProperty({
    description: "Código de cancelación para validar la acción",
    example: "CNL-AB12CD",
  })
  @IsString()
  @MaxLength(100)
  cancellationCode: string;

  @ApiProperty({
    description: "Notas adicionales",
    required: false,
    example: "Reprogramado por motivos personales",
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}
