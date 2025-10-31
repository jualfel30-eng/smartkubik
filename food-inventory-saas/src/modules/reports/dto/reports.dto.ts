import {
  IsOptional,
  IsDateString,
  IsIn,
  IsString,
  IsBoolean,
} from "class-validator";

export class HospitalityAppointmentsReportQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsBoolean()
  includeHousekeeping?: boolean;

  @IsOptional()
  @IsIn(["csv", "pdf"])
  format?: "csv" | "pdf";
}

export class AccountsReceivableReportQueryDto {
  @IsOptional()
  @IsDateString()
  asOfDate?: string;
}
