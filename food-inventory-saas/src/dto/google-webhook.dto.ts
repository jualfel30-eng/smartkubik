import { IsString, IsOptional, IsNumber } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * DTO para manejar notificaciones de webhooks de Google Calendar
 * Cuando Google Calendar detecta cambios, envía una notificación push a este endpoint
 */
export class GoogleCalendarWebhookDto {
  @ApiProperty({
    description: "ID del canal de notificación (watch channel)",
  })
  @IsString()
  channelId: string;

  @ApiProperty({
    description: "Token de verificación para validar la autenticidad",
  })
  @IsString()
  channelToken: string;

  @ApiProperty({
    description: "ID del recurso que cambió (calendar ID)",
  })
  @IsString()
  resourceId: string;

  @ApiPropertyOptional({
    description: "URI del recurso",
  })
  @IsOptional()
  @IsString()
  resourceUri?: string;

  @ApiPropertyOptional({
    description: "Estado del recurso (sync, exists, not_exists)",
  })
  @IsOptional()
  @IsString()
  resourceState?: string;

  @ApiPropertyOptional({
    description: "Timestamp de expiración del canal",
  })
  @IsOptional()
  @IsNumber()
  expiration?: number;
}

/**
 * DTO para crear un watch channel en Google Calendar
 */
export class CreateWatchChannelDto {
  @ApiProperty({
    description: "ID del calendario a monitorear",
  })
  @IsString()
  calendarId: string;
}
