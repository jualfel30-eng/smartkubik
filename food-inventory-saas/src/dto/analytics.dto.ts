import {
  IsOptional,
  Matches,
  IsBooleanString,
  IsDateString,
} from "class-validator";

export class AnalyticsPeriodQueryDto {
  @IsOptional()
  @Matches(/^(7d|14d|30d|60d|90d|180d|365d)$/)
  period?: string;

  @IsOptional()
  @IsBooleanString()
  compare?: string;
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
