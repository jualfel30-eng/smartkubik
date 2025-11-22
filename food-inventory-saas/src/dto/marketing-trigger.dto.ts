import { IsString, IsEnum, IsOptional, IsObject } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import {
  TriggerEventType,
  TriggerStatus,
} from "../schemas/marketing-trigger.schema";

export class CreateMarketingTriggerDto {
  @ApiProperty({ example: "Win-back Automation" })
  @IsString()
  name: string;

  @ApiProperty({
    example: "Automatically send win-back campaign to inactive customers",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: TriggerEventType, example: TriggerEventType.INACTIVITY })
  @IsEnum(TriggerEventType)
  eventType: TriggerEventType;

  @ApiProperty({ example: "507f1f77bcf86cd799439011" })
  @IsString()
  campaignId: string;

  @ApiProperty({
    example: {
      inactiveDays: 30,
      customerSegment: { tiers: ["oro", "plata"] },
    },
  })
  @IsOptional()
  @IsObject()
  conditions?: {
    abandonmentMinutes?: number;
    inactiveDays?: number;
    milestoneCount?: number;
    milestoneAmount?: number;
    productIds?: string[];
    targetTiers?: string[];
    customerSegment?: {
      tiers?: string[];
      minSpent?: number;
      maxSpent?: number;
    };
  };

  @ApiProperty({
    example: {
      maxExecutionsPerCustomer: 3,
      cooldownDays: 30,
      preferredChannel: "email",
      sendImmediately: false,
      optimalTimeSend: true,
    },
  })
  @IsOptional()
  @IsObject()
  executionSettings?: {
    maxExecutionsPerCustomer?: number;
    cooldownDays?: number;
    preferredChannel?: string;
    sendImmediately?: boolean;
    optimalTimeSend?: boolean;
  };

  @ApiProperty({ enum: TriggerStatus, example: TriggerStatus.ACTIVE })
  @IsOptional()
  @IsEnum(TriggerStatus)
  status?: TriggerStatus;
}

export class UpdateMarketingTriggerDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TriggerEventType)
  eventType?: TriggerEventType;

  @IsOptional()
  @IsString()
  campaignId?: string;

  @IsOptional()
  @IsObject()
  conditions?: any;

  @IsOptional()
  @IsObject()
  executionSettings?: any;

  @IsOptional()
  @IsEnum(TriggerStatus)
  status?: TriggerStatus;
}

export class TriggerFilterDto {
  @IsOptional()
  @IsEnum(TriggerEventType)
  eventType?: TriggerEventType;

  @IsOptional()
  @IsEnum(TriggerStatus)
  status?: TriggerStatus;

  @IsOptional()
  @IsString()
  campaignId?: string;
}
