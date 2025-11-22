import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

class BonusAfterYearsDto {
  @IsOptional()
  @IsNumber()
  thresholdYears?: number;

  @IsOptional()
  @IsNumber()
  daysPerYear?: number;
}

class ContributionRateDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  employer?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  employee?: number;
}

export class CreateLiquidationRuleSetDto {
  @IsString()
  country: string;

  @IsOptional()
  @IsNumber()
  version?: number;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  daysPerYear?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minDaysPerYear?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => BonusAfterYearsDto)
  bonusDaysAfterYears?: BonusAfterYearsDto;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  utilitiesDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  vacationDays?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  integralSalaryFactor?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => ContributionRateDto)
  severanceFund?: ContributionRateDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ContributionRateDto)
  socialSecurity?: ContributionRateDto;

  @IsOptional()
  accounts?: {
    severanceDebit?: string;
    severanceCredit?: string;
    vacationDebit?: string;
    vacationCredit?: string;
    utilitiesDebit?: string;
    utilitiesCredit?: string;
  };

  @IsOptional()
  @IsString()
  notes?: string;
}
