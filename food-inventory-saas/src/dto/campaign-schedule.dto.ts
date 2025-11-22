import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  IsNumber,
  IsArray,
  IsBoolean,
  Min,
  Max,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import {
  ScheduleType,
  RecurrenceFrequency,
  ScheduleStatus,
} from "../schemas/campaign-schedule.schema";

export class ScheduleFiltersDto {
  @IsOptional()
  @IsString()
  segmentId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customerTiers?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxOrderValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lastOrderDaysAgo?: number;
}

export class CreateScheduleDto {
  @IsString()
  campaignId: string;

  @IsString()
  name: string;

  @IsEnum(ScheduleType)
  type: ScheduleType;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsEnum(RecurrenceFrequency)
  recurrenceFrequency?: RecurrenceFrequency;

  @IsOptional()
  @IsNumber()
  @Min(1)
  recurrenceInterval?: number;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  recurrenceDaysOfWeek?: number[]; // 0=Sunday, 6=Saturday

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  recurrenceDayOfMonth?: number;

  @IsOptional()
  @IsDateString()
  recurrenceEndDate?: string;

  @IsOptional()
  @IsString()
  cronExpression?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxExecutions?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => ScheduleFiltersDto)
  filters?: ScheduleFiltersDto;
}

export class UpdateScheduleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(ScheduleStatus)
  status?: ScheduleStatus;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsEnum(RecurrenceFrequency)
  recurrenceFrequency?: RecurrenceFrequency;

  @IsOptional()
  @IsNumber()
  @Min(1)
  recurrenceInterval?: number;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  recurrenceDaysOfWeek?: number[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  recurrenceDayOfMonth?: number;

  @IsOptional()
  @IsDateString()
  recurrenceEndDate?: string;

  @IsOptional()
  @IsString()
  cronExpression?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsNumber()
  maxExecutions?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => ScheduleFiltersDto)
  filters?: ScheduleFiltersDto;
}

export class GetSchedulesQueryDto {
  @IsOptional()
  @IsString()
  campaignId?: string;

  @IsOptional()
  @IsEnum(ScheduleStatus)
  status?: ScheduleStatus;

  @IsOptional()
  @IsEnum(ScheduleType)
  type?: ScheduleType;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
