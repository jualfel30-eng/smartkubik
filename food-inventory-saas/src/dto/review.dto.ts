import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsDateString,
  Min,
  Max,
  IsObject,
  IsArray,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateReviewDto {
  @IsEnum(["google", "tripadvisor", "yelp", "facebook", "internal", "manual"])
  source: string;

  @IsOptional()
  @IsString()
  externalId?: string;

  @IsOptional()
  @IsString()
  sourceUrl?: string;

  @IsString()
  customerName: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  customerAvatar?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  comment: string;

  @IsDateString()
  reviewDate: string;

  @IsOptional()
  @IsObject()
  categoryRatings?: Record<string, number>;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsString()
  reservationId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateReviewDto {
  @IsOptional()
  @IsEnum(["google", "tripadvisor", "yelp", "facebook", "internal", "manual"])
  source?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsDateString()
  reviewDate?: string;

  @IsOptional()
  @IsObject()
  categoryRatings?: Record<string, number>;

  @IsOptional()
  @IsEnum(["pending", "reviewed", "flagged", "archived"])
  status?: string;

  @IsOptional()
  @IsBoolean()
  isFlagged?: boolean;

  @IsOptional()
  @IsString()
  flagReason?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RespondToReviewDto {
  @IsString()
  response: string;
}

export class AnalyzeSentimentDto {
  @IsString()
  reviewId: string;
}

export class GetReviewsQueryDto {
  @IsOptional()
  @IsEnum(["google", "tripadvisor", "yelp", "facebook", "internal", "manual"])
  source?: string;

  @IsOptional()
  @IsEnum(["pending", "reviewed", "flagged", "archived"])
  status?: string;

  @IsOptional()
  @IsEnum(["positive", "neutral", "negative"])
  sentiment?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(5)
  minRating?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(5)
  maxRating?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isResponded?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isFlagged?: boolean;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;
}

// Response Interfaces
export interface ReviewAnalyticsResponse {
  overview: {
    totalReviews: number;
    averageRating: number;
    ratingDistribution: {
      1: number;
      2: number;
      3: number;
      4: number;
      5: number;
    };
    sentimentDistribution: {
      positive: number;
      neutral: number;
      negative: number;
    };
    responseRate: number;
    averageResponseTime: number; // in hours
  };
  bySource: Array<{
    source: string;
    count: number;
    averageRating: number;
  }>;
  trends: Array<{
    period: string;
    count: number;
    averageRating: number;
    sentiment: { positive: number; neutral: number; negative: number };
  }>;
  topTopics: Array<{
    topic: string;
    count: number;
    sentiment: string;
  }>;
  recentReviews: any[];
  needsAttention: any[]; // Negative reviews without response
}

export interface ReviewComparisonResponse {
  currentPeriod: {
    totalReviews: number;
    averageRating: number;
    sentiment: { positive: number; neutral: number; negative: number };
  };
  previousPeriod: {
    totalReviews: number;
    averageRating: number;
    sentiment: { positive: number; neutral: number; negative: number };
  };
  changes: {
    reviewsChange: number;
    reviewsChangePercent: number;
    ratingChange: number;
    ratingChangePercent: number;
  };
}
