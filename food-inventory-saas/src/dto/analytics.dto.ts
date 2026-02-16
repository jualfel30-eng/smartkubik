import {
  IsOptional,
  Matches,
  IsBooleanString,
  IsDateString,
  IsArray,
  IsString,
} from "class-validator";

export class CustomMetricsQueryDto {
  // Can be string or array when coming from query params
  @IsOptional()
  metrics?: string | string[];

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}

export class AnalyticsPeriodQueryDto {
  @IsOptional()
  @Matches(/^(7d|14d|30d|60d|90d|180d|365d)$/)
  period?: string;

  @IsOptional()
  @IsBooleanString()
  compare?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}

export class ExpenseIncomeBreakdownQueryDto {
  @IsOptional()
  @Matches(/^(7d|14d|30d|60d|90d|180d|365d)$/)
  period?: string;

  @IsOptional()
  @Matches(/^(month|quarter|year)$/)
  granularity?: string;

  @IsOptional()
  @IsBooleanString()
  compare?: string;

  @IsOptional()
  @Matches(/^(type|account)$/)
  groupBy?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}

export class KpiCompareQueryDto {
  @IsDateString()
  fromA: string;

  @IsDateString()
  toA: string;

  @IsDateString()
  fromB: string;

  @IsDateString()
  toB: string;
}

export class CreateSavedViewDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  metricIds: string[];

  @IsOptional()
  periodConfig?: {
    years: number[];
    months: number[];
  };
}

export class UpdateSavedViewDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  metricIds?: string[];

  @IsOptional()
  periodConfig?: {
    years: number[];
    months: number[];
  };
}
