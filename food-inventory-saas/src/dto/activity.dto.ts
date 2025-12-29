import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsEnum,
  IsOptional,
  IsDate,
  IsBoolean,
  IsObject,
  IsArray,
  IsMongoId,
} from "class-validator";
import { Type } from "class-transformer";
import { ActivityType, ActivityDirection } from "../schemas/activity.schema";

export class CreateActivityDto {
  @ApiProperty({ enum: ActivityType })
  @IsEnum(ActivityType)
  type: ActivityType;

  @ApiPropertyOptional({ enum: ActivityDirection })
  @IsEnum(ActivityDirection)
  @IsOptional()
  direction?: ActivityDirection;

  @ApiProperty()
  @IsString()
  subject: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  body?: string;

  @ApiPropertyOptional()
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  scheduledAt?: Date;

  @ApiPropertyOptional()
  @IsMongoId()
  @IsOptional()
  opportunityId?: string;

  @ApiProperty()
  @IsMongoId()
  customerId: string;

  @ApiPropertyOptional()
  @IsMongoId()
  @IsOptional()
  ownerId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  messageId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  threadId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  channel?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  externalId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  externalCalendar?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  externalEventId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  participants?: string[];

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateActivityDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  body?: string;

  @ApiPropertyOptional()
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  scheduledAt?: Date;

  @ApiPropertyOptional()
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  completedAt?: Date;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  completed?: boolean;

  @ApiPropertyOptional()
  @IsMongoId()
  @IsOptional()
  ownerId?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  participants?: string[];

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class QueryActivitiesDto {
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
  ownerId?: string;

  @ApiPropertyOptional({ enum: ActivityType })
  @IsEnum(ActivityType)
  @IsOptional()
  type?: ActivityType;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  threadId?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  completed?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  limit?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  offset?: string;
}
