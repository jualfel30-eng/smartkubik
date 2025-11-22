import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsBoolean,
  IsNumber,
  IsArray,
  IsObject,
} from "class-validator";

export class CreateMarketingCampaignDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(["email", "sms", "whatsapp", "push"])
  channel: string;

  @IsEnum(["manual", "automated"])
  type: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  htmlContent?: string;

  @IsOptional()
  @IsString()
  emailTemplateId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  media?: string[];

  @IsOptional()
  @IsArray()
  attachments?: Array<{
    url: string;
    name: string;
    size: number;
    type: string;
  }>;

  @IsOptional()
  @IsObject()
  targetSegment?: Record<string, any>;

  @IsOptional()
  @IsString()
  targetAudience?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recipients?: string[];

  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsString()
  recurringPattern?: string;

  @IsOptional()
  @IsString()
  trigger?: string;

  @IsOptional()
  @IsObject()
  triggerConfig?: Record<string, any>;

  @IsOptional()
  @IsNumber()
  budget?: number;

  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @IsOptional()
  @IsObject()
  emailConfig?: {
    provider?: string;
    fromEmail?: string;
    fromName?: string;
    replyTo?: string;
    trackOpens?: boolean;
    trackClicks?: boolean;
    testMode?: boolean;
  };

  @IsOptional()
  @IsObject()
  smsConfig?: {
    provider?: string;
    fromNumber?: string;
    testMode?: boolean;
  };

  @IsOptional()
  @IsObject()
  whatsappConfig?: {
    provider?: string;
    fromNumber?: string;
    testMode?: boolean;
  };

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateMarketingCampaignDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  htmlContent?: string;

  @IsOptional()
  @IsString()
  emailTemplateId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  media?: string[];

  @IsOptional()
  @IsArray()
  attachments?: Array<{
    url: string;
    name: string;
    size: number;
    type: string;
  }>;

  @IsOptional()
  @IsObject()
  targetSegment?: Record<string, any>;

  @IsOptional()
  @IsString()
  targetAudience?: string;

  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsString()
  recurringPattern?: string;

  @IsOptional()
  @IsEnum(["draft", "scheduled", "running", "completed", "cancelled", "paused"])
  status?: string;

  @IsOptional()
  @IsNumber()
  budget?: number;

  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @IsOptional()
  @IsObject()
  emailConfig?: {
    provider?: string;
    fromEmail?: string;
    fromName?: string;
    replyTo?: string;
    trackOpens?: boolean;
    trackClicks?: boolean;
    testMode?: boolean;
  };

  @IsOptional()
  @IsObject()
  smsConfig?: {
    provider?: string;
    fromNumber?: string;
    testMode?: boolean;
  };

  @IsOptional()
  @IsObject()
  whatsappConfig?: {
    provider?: string;
    fromNumber?: string;
    testMode?: boolean;
  };

  @IsOptional()
  @IsString()
  notes?: string;
}

export class GetMarketingCampaignsQueryDto {
  @IsOptional()
  @IsEnum(["email", "sms", "whatsapp", "push"])
  channel?: string;

  @IsOptional()
  @IsEnum(["manual", "automated"])
  type?: string;

  @IsOptional()
  @IsEnum(["draft", "scheduled", "running", "completed", "cancelled", "paused"])
  status?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  search?: string;
}

// Response Interfaces
export interface MarketingCampaignAnalyticsResponse {
  overview: {
    totalCampaigns: number;
    activeCampaigns: number;
    totalSent: number;
    averageOpenRate: number;
    averageClickRate: number;
    averageConversionRate: number;
    totalRevenue: number;
    averageROI: number;
  };
  byChannel: Array<{
    channel: string;
    campaigns: number;
    sent: number;
    openRate: number;
    clickRate: number;
    conversionRate: number;
  }>;
  topPerforming: any[];
  recentCampaigns: any[];
}
