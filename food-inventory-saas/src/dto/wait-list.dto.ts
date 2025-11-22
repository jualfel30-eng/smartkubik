import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsMongoId,
  IsEmail,
  Min,
} from "class-validator";

// DTO para crear una entrada en la lista de espera
export class CreateWaitListEntryDto {
  @IsString()
  customerName: string;

  @IsString()
  phoneNumber: string; // Formato internacional recomendado

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsNumber()
  @Min(1)
  partySize: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

// DTO para actualizar una entrada
export class UpdateWaitListEntryDto {
  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  partySize?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedWaitTime?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

// DTO para notificar a un cliente
export class NotifyCustomerDto {
  @IsMongoId()
  entryId: string;

  @IsEnum(["sms", "whatsapp", "email"])
  method: string;

  @IsOptional()
  @IsString()
  customMessage?: string;
}

// DTO para sentar a un cliente desde la wait list
export class SeatFromWaitListDto {
  @IsMongoId()
  entryId: string;

  @IsMongoId()
  tableId: string;
}

// DTO para actualizar el estado
export class UpdateWaitListStatusDto {
  @IsEnum(["waiting", "notified", "seated", "cancelled", "no-show"])
  status: string;

  @IsOptional()
  @IsMongoId()
  tableId?: string;
}

// DTO para query de lista de espera
export class WaitListQueryDto {
  @IsOptional()
  @IsEnum(["waiting", "notified", "seated", "cancelled", "no-show"])
  status?: string;

  @IsOptional()
  @IsString()
  date?: string; // Formato: YYYY-MM-DD

  @IsOptional()
  @IsBoolean()
  activeOnly?: boolean; // Solo mostrar entradas activas (waiting, notified)
}

// Response con estadísticas
export interface WaitListStatsResponse {
  totalWaiting: number;
  totalNotified: number;
  averageWaitTime: number; // En minutos
  currentQueue: Array<{
    position: number;
    customerName: string;
    partySize: number;
    arrivalTime: Date;
    estimatedWaitTime: number;
    status: string;
  }>;
}

// Response para estimación de tiempo de espera
export interface WaitTimeEstimationResponse {
  estimatedWaitTime: number; // En minutos
  position: number;
  partiesAhead: number;
  averageTableTurnover: number; // Promedio de rotación de mesas en minutos
  confidence: "low" | "medium" | "high";
}
