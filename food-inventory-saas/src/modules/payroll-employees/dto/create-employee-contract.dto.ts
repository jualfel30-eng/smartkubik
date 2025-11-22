import {
  IsArray,
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class WorkScheduleDto {
  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  days?: string[];

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  hoursPerWeek?: number;
}

export class BenefitDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;
}

export class DeductionDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage?: number;

  @IsOptional()
  @IsNumber()
  amount?: number;
}

export class BankAccountDto {
  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  accountType?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  routingNumber?: string;
}

export class TaxationDto {
  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  withholdingPercentage?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  socialSecurityRate?: number;
}

export class CreateEmployeeContractDto {
  @IsEnum(["permanent", "fixed_term", "internship", "contractor"])
  contractType: string;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsEnum(["monthly", "biweekly", "weekly", "custom"])
  payFrequency: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  payDay?: number;

  @IsOptional()
  @IsDateString()
  nextPayDate?: string;

  @IsEnum(["salary", "hourly", "daily"])
  compensationType: string;

  @IsNumber()
  @IsPositive()
  compensationAmount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsMongoId()
  payrollStructureId?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => WorkScheduleDto)
  schedule?: WorkScheduleDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BenefitDto)
  benefits?: BenefitDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeductionDto)
  deductions?: DeductionDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => BankAccountDto)
  bankAccount?: BankAccountDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => TaxationDto)
  taxation?: TaxationDto;

  @IsOptional()
  @IsEnum(["draft", "active", "expired", "terminated"])
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
