import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumberString,
  IsOptional,
} from "class-validator";

export class PayrollRunFiltersDto {
  @IsOptional()
  @IsEnum(["monthly", "biweekly", "custom"])
  periodType?: "monthly" | "biweekly" | "custom";

  @IsOptional()
  @IsEnum(["draft", "calculating", "calculated", "posted", "paid"])
  status?: "draft" | "calculating" | "calculated" | "posted" | "paid";

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsMongoId()
  calendarId?: string;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}
