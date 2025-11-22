import {
  IsOptional,
  IsDateString,
  IsString,
  IsEnum,
  IsArray,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export enum TimeGranularity {
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
}

export enum MetricType {
  SENT = "sent",
  OPENED = "opened",
  CLICKED = "clicked",
  CONVERTED = "converted",
  REVENUE = "revenue",
}

export class CampaignAnalyticsFilterDto {
  @ApiProperty({ example: "2025-01-01", required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ example: "2025-01-31", required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ example: "email", required: false })
  @IsOptional()
  @IsString()
  channel?: string;

  @ApiProperty({ example: "manual", required: false })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ example: ["507f1f77bcf86cd799439011"], required: false })
  @IsOptional()
  @IsArray()
  campaignIds?: string[];

  @ApiProperty({
    enum: TimeGranularity,
    example: TimeGranularity.DAILY,
    required: false,
  })
  @IsOptional()
  @IsEnum(TimeGranularity)
  granularity?: TimeGranularity;
}

export class CohortAnalysisDto {
  @ApiProperty({ example: "2025-01-01", required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ example: "2025-01-31", required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ example: "tier", required: false })
  @IsOptional()
  @IsString()
  segmentBy?: string; // 'tier', 'channel', 'campaign'

  @ApiProperty({ example: "conversion_rate", required: false })
  @IsOptional()
  @IsString()
  metric?: string; // 'conversion_rate', 'revenue', 'engagement'
}

export class FunnelAnalysisDto {
  @ApiProperty({ example: "507f1f77bcf86cd799439011", required: false })
  @IsOptional()
  @IsString()
  campaignId?: string;

  @ApiProperty({ example: "2025-01-01", required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ example: "2025-01-31", required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class AttributionReportDto {
  @ApiProperty({ example: "2025-01-01" })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: "2025-01-31" })
  @IsDateString()
  endDate: string;

  @ApiProperty({ example: "first_touch", required: false })
  @IsOptional()
  @IsString()
  attributionModel?: string; // 'first_touch', 'last_touch', 'linear'
}

export class ExportReportDto {
  @ApiProperty({ example: "507f1f77bcf86cd799439011", required: false })
  @IsOptional()
  @IsString()
  campaignId?: string;

  @ApiProperty({ example: "2025-01-01" })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: "2025-01-31" })
  @IsDateString()
  endDate: string;

  @ApiProperty({ enum: ["csv", "pdf"], example: "csv" })
  @IsString()
  format: "csv" | "pdf";

  @ApiProperty({ enum: MetricType, isArray: true, required: false })
  @IsOptional()
  @IsArray()
  metrics?: MetricType[];
}
