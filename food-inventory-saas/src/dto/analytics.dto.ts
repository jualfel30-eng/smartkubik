import { IsOptional, Matches } from 'class-validator';

export class AnalyticsPeriodQueryDto {
  @IsOptional()
  @Matches(/^(7d|14d|30d|60d|90d|180d|365d)$/)
  period?: string;
}
