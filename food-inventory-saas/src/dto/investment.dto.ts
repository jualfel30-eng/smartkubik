import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDateString,
  Min,
} from "class-validator";

const INVESTMENT_CATEGORIES = [
  "marketing",
  "equipment",
  "technology",
  "expansion",
  "inventory",
  "training",
  "other",
] as const;

const INVESTMENT_STATUSES = ["active", "completed", "cancelled"] as const;

export class CreateInvestmentDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(INVESTMENT_CATEGORIES)
  category: string;

  @IsNumber()
  @Min(0)
  investedAmount: number;

  @IsDateString()
  investmentDate: string;

  @IsOptional()
  @IsDateString()
  expectedReturnDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedReturn?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateInvestmentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(INVESTMENT_CATEGORIES)
  category?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  investedAmount?: number;

  @IsOptional()
  @IsDateString()
  investmentDate?: string;

  @IsOptional()
  @IsDateString()
  expectedReturnDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedReturn?: number;

  @IsOptional()
  @IsNumber()
  actualReturn?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(INVESTMENT_STATUSES)
  status?: string;
}
