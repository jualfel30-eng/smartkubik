
import { IsOptional, IsDateString } from 'class-validator';

export class AccountsReceivableReportQueryDto {
  @IsOptional()
  @IsDateString()
  asOfDate?: string;
}
