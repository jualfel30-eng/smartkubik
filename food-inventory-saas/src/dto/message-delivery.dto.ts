import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsObject,
  IsNumber,
  IsDate,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

/**
 * PHASE 7: EMAIL/SMS TEMPLATES & DELIVERY SYSTEM
 * DTOs for MessageDelivery tracking and management
 */

export class CreateMessageDeliveryDto {
  @IsString()
  @IsOptional()
  campaignId?: string;

  @IsString()
  @IsOptional()
  marketingCampaignId?: string;

  @IsString()
  customerId: string;

  @IsString()
  @IsOptional()
  customerName?: string;

  @IsString()
  @IsOptional()
  templateId?: string;

  @IsString()
  @IsOptional()
  templateName?: string;

  @IsString()
  @IsEnum(["email", "sms", "whatsapp"])
  channel: string;

  @IsString()
  recipient: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  message: string;

  @IsString()
  @IsOptional()
  htmlContent?: string;

  @IsString()
  @IsOptional()
  variantName?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateDeliveryStatusDto {
  @IsString()
  @IsEnum(["queued", "sent", "delivered", "failed", "bounced", "rejected"])
  status: string;

  @IsString()
  @IsOptional()
  providerMessageId?: string;

  @IsString()
  @IsOptional()
  provider?: string;

  @IsObject()
  @IsOptional()
  providerResponse?: Record<string, any>;

  @IsString()
  @IsOptional()
  errorMessage?: string;

  @IsString()
  @IsOptional()
  errorCode?: string;

  @IsNumber()
  @IsOptional()
  cost?: number;
}

export class RetryDeliveryDto {
  @IsArray()
  @IsString({ each: true })
  deliveryIds: string[];

  @IsNumber()
  @IsOptional()
  @Min(0)
  delaySeconds?: number; // Delay before retry
}

export class GetDeliveriesQueryDto {
  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  channel?: string;

  @IsString()
  @IsOptional()
  campaignId?: string;

  @IsString()
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsOptional()
  templateId?: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;

  @IsBoolean()
  @IsOptional()
  failedOnly?: boolean;

  @IsBoolean()
  @IsOptional()
  canRetry?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  limit?: number;
}

export class DeliveryStatsDto {
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;

  @IsString()
  @IsOptional()
  campaignId?: string;

  @IsString()
  @IsOptional()
  channel?: string;
}

export class BulkSendDto {
  @IsString()
  @IsOptional()
  templateId?: string;

  @IsArray()
  recipients: Array<{
    customerId: string;
    recipient: string;
    context?: Record<string, any>;
  }>;

  @IsString()
  @IsEnum(["email", "sms", "whatsapp"])
  channel: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  message?: string; // If not using template

  @IsString()
  @IsOptional()
  campaignId?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  rateLimit?: number; // Messages per second
}
