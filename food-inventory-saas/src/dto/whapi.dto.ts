import {
  IsString,
  IsOptional,
  IsObject,
  IsNumber,
  IsBoolean,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class WhapiLocationDto {
  @ApiProperty({ description: "Latitude coordinate" })
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: "Longitude coordinate" })
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({ description: "Location name" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: "Location address" })
  @IsOptional()
  @IsString()
  address?: string;
}

export class WhapiTextDto {
  @ApiProperty({ description: "Message text body" })
  @IsString()
  body: string;
}

export class WhapiWebhookDto {
  @ApiProperty({ description: "Event type (e.g., messages.upsert)" })
  @IsString()
  event: string;

  @ApiPropertyOptional({ description: "Sender phone number" })
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional({ description: "Sender public WhatsApp name" })
  @IsOptional()
  @IsString()
  from_name?: string;

  @ApiPropertyOptional({ description: "Chat ID" })
  @IsOptional()
  @IsString()
  chat_id?: string;

  @ApiPropertyOptional({ description: "Recipient phone number" })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ description: "Message type (text, location, etc.)" })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({
    description: "Text message content",
    type: WhapiTextDto,
  })
  @IsOptional()
  @IsObject()
  text?: WhapiTextDto;

  @ApiPropertyOptional({ description: "Location data", type: WhapiLocationDto })
  @IsOptional()
  @IsObject()
  location?: WhapiLocationDto;

  @ApiPropertyOptional({ description: "Message ID" })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional({ description: "Timestamp" })
  @IsOptional()
  @IsNumber()
  timestamp?: number;

  @ApiPropertyOptional({ description: "If message is from the bot itself" })
  @IsOptional()
  @IsBoolean()
  from_me?: boolean;

  @ApiPropertyOptional({ description: "Raw payload data" })
  @IsOptional()
  @IsObject()
  payload?: any;
}
