import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsMongoId,
  IsDateString,
  IsEmail,
  Min,
  Max,
  Matches,
  ValidateNested,
  IsArray,
} from "class-validator";
import { Type } from "class-transformer";
import { SanitizeString, SanitizeText } from "../decorators/sanitize.decorator";

// Check availability
export class CheckAvailabilityDto {
  @IsDateString()
  date: string;

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: "Time must be in HH:MM format",
  })
  time: string;

  @IsNumber()
  @Min(1)
  partySize: number;
}

// Create reservation
export class CreateReservationDto {
  @IsOptional()
  @IsMongoId()
  customerId?: string;

  @IsString()
  @SanitizeString()
  guestName: string;

  @IsString()
  @SanitizeString()
  guestPhone: string;

  @IsOptional()
  @IsEmail()
  guestEmail?: string;

  @IsDateString()
  date: string;

  @IsString()
  @SanitizeString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  time: string;

  @IsNumber()
  @Min(1)
  partySize: number;

  @IsOptional()
  @IsNumber()
  duration?: number;

  @IsOptional()
  @IsMongoId()
  tableId?: string;

  @IsOptional()
  @IsString()
  @SanitizeText()
  specialRequests?: string;

  @IsOptional()
  @IsEnum(["birthday", "anniversary", "business", "casual", "other"])
  occasion?: string;

  @IsOptional()
  @IsEnum(["email", "sms", "phone", "whatsapp"])
  confirmationMethod?: string;

  @IsOptional()
  @IsEnum(["website", "phone", "walk-in", "app"])
  source?: string;

  @IsOptional()
  @IsString()
  @SanitizeText()
  notes?: string;
}

// Update reservation
export class UpdateReservationDto {
  @IsOptional()
  @IsString()
  @SanitizeString()
  guestName?: string;

  @IsOptional()
  @IsString()
  @SanitizeString()
  guestPhone?: string;

  @IsOptional()
  @IsEmail()
  guestEmail?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  @SanitizeString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  time?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  partySize?: number;

  @IsOptional()
  @IsMongoId()
  tableId?: string;

  @IsOptional()
  @IsString()
  @SanitizeText()
  specialRequests?: string;

  @IsOptional()
  @IsString()
  @SanitizeText()
  notes?: string;
}

// Seat guests
export class SeatReservationDto {
  @IsMongoId()
  tableId: string;
}

// Cancel reservation
export class CancelReservationDto {
  @IsString()
  reason: string;
}

// Query reservations
export class ReservationQueryDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsDateString()
  start?: string;

  @IsOptional()
  @IsDateString()
  end?: string;

  @IsOptional()
  @IsEnum([
    "pending",
    "confirmed",
    "cancelled",
    "seated",
    "completed",
    "no-show",
  ])
  status?: string;

  @IsOptional()
  @IsString()
  guestName?: string;

  @IsOptional()
  @IsString()
  guestPhone?: string;
}

// Reservation settings DTOs
class ServiceShiftDto {
  @IsString()
  name: string;

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  start: string;

  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
  end: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class ServiceHoursDto {
  @IsNumber()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceShiftDto)
  shifts: ServiceShiftDto[];
}

export class UpdateReservationSettingsDto {
  @IsOptional()
  @IsBoolean()
  acceptReservations?: boolean;

  @IsOptional()
  @IsNumber()
  advanceBookingDays?: number;

  @IsOptional()
  @IsNumber()
  minPartySize?: number;

  @IsOptional()
  @IsNumber()
  maxPartySize?: number;

  @IsOptional()
  @IsNumber()
  slotDuration?: number;

  @IsOptional()
  @IsNumber()
  bufferTime?: number;

  @IsOptional()
  @IsNumber()
  maxReservationsPerSlot?: number;

  @IsOptional()
  @IsNumber()
  maxReservationsPerDay?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceHoursDto)
  serviceHours?: ServiceHoursDto[];

  @IsOptional()
  @IsBoolean()
  sendConfirmationEmail?: boolean;

  @IsOptional()
  @IsBoolean()
  sendConfirmationSMS?: boolean;

  @IsOptional()
  @IsBoolean()
  sendReminder?: boolean;

  @IsOptional()
  @IsNumber()
  reminderHoursBefore?: number;

  @IsOptional()
  @IsString()
  cancellationPolicy?: string;

  @IsOptional()
  @IsBoolean()
  allowGuestCancellation?: boolean;

  @IsOptional()
  @IsNumber()
  cancellationHoursBefore?: number;

  @IsOptional()
  @IsBoolean()
  requireDeposit?: boolean;

  @IsOptional()
  @IsNumber()
  depositAmount?: number;

  @IsOptional()
  @IsNumber()
  depositPercentage?: number;

  @IsOptional()
  @IsBoolean()
  autoConfirm?: boolean;

  @IsOptional()
  @IsNumber()
  noShowGracePeriodMinutes?: number;
}
