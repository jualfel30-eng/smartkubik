import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsEnum,
  IsOptional,
  IsDate,
  IsNumber,
  IsObject,
  IsMongoId,
  IsArray,
} from "class-validator";
import { Type } from "class-transformer";
import { ReminderType, ReminderChannel } from "../schemas/reminder.schema";

export class CreateReminderDto {
  @ApiProperty({ enum: ReminderType })
  @IsEnum(ReminderType)
  type: ReminderType;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  message?: string;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  scheduledFor: Date;

  @ApiProperty({ type: [String], enum: ReminderChannel })
  @IsArray()
  @IsEnum(ReminderChannel, { each: true })
  channels: ReminderChannel[];

  @ApiPropertyOptional()
  @IsMongoId()
  @IsOptional()
  opportunityId?: string;

  @ApiPropertyOptional()
  @IsMongoId()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional()
  @IsMongoId()
  @IsOptional()
  activityId?: string;

  @ApiPropertyOptional()
  @IsMongoId()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  advanceMinutes?: number;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateReminderDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  message?: string;

  @ApiPropertyOptional()
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  scheduledFor?: Date;

  @ApiPropertyOptional({ type: [String], enum: ReminderChannel })
  @IsArray()
  @IsEnum(ReminderChannel, { each: true })
  @IsOptional()
  channels?: ReminderChannel[];

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  advanceMinutes?: number;
}

export class QueryRemindersDto {
  @ApiPropertyOptional({ enum: ReminderType })
  @IsEnum(ReminderType)
  @IsOptional()
  type?: ReminderType;

  @ApiPropertyOptional()
  @IsMongoId()
  @IsOptional()
  opportunityId?: string;

  @ApiPropertyOptional()
  @IsMongoId()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({ enum: ["pending", "sent", "failed", "cancelled"] })
  @IsString()
  @IsOptional()
  status?: string;
}
