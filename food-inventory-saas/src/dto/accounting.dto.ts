import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsDateString,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsNumber,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

// Los tipos de cuenta deben coincidir con los del frontend
const ACCOUNT_TYPES = ["Ingreso", "Gasto", "Activo", "Pasivo", "Patrimonio"];

export class CreateChartOfAccountDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(ACCOUNT_TYPES)
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsOptional()
  description?: string;
}

// DTO for each line in the journal entry
export class CreateJournalLineDto {
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @IsNumber()
  @Min(0)
  debit: number;

  @IsNumber()
  @Min(0)
  credit: number;

  @IsString()
  @IsOptional()
  description?: string;
}

// DTO for creating a new journal entry
export class CreateJournalEntryDto {
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(2)
  @Type(() => CreateJournalLineDto)
  lines: CreateJournalLineDto[];

  @IsOptional()
  isAutomatic?: boolean;
}

// ==================== PHASE 2: Advanced Accounting Reports ====================

// DTO for Trial Balance query parameters
export class TrialBalanceQueryDto {
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  accountType?: string; // Filter by account type

  @IsOptional()
  includeZeroBalances?: boolean; // Include accounts with zero balance
}

// DTO for General Ledger query parameters
export class GeneralLedgerQueryDto {
  @IsString()
  @IsNotEmpty()
  accountCode: string; // Specific account to show ledger for

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}

// DTO for creating accounting periods
export class CreateAccountingPeriodDto {
  @IsString()
  @IsNotEmpty()
  name: string; // e.g., "Enero 2024"

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsNumber()
  @IsNotEmpty()
  fiscalYear: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

// DTO for closing a period
export class ClosePeriodDto {
  @IsString()
  @IsNotEmpty()
  periodId: string;

  @IsString()
  @IsOptional()
  closingNotes?: string;
}

// DTO for creating recurring journal entries
export class CreateRecurringEntryDto {
  @IsString()
  @IsNotEmpty()
  name: string; // e.g., "Depreciación Mensual"

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(2)
  @Type(() => CreateJournalLineDto)
  lines: CreateJournalLineDto[];

  @IsEnum(["monthly", "quarterly", "yearly", "weekly"])
  @IsNotEmpty()
  frequency: string;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsOptional()
  endDate?: string; // Optional end date

  @IsNumber()
  @IsOptional()
  dayOfMonth?: number; // For monthly (1-31)

  @IsNumber()
  @IsOptional()
  dayOfWeek?: number; // For weekly (0-6)

  @IsOptional()
  isActive?: boolean;
}

// DTO for updating recurring entry
export class UpdateRecurringEntryDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(2)
  @Type(() => CreateJournalLineDto)
  @IsOptional()
  lines?: CreateJournalLineDto[];

  @IsEnum(["monthly", "quarterly", "yearly", "weekly"])
  @IsOptional()
  frequency?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsNumber()
  @IsOptional()
  dayOfMonth?: number;

  @IsNumber()
  @IsOptional()
  dayOfWeek?: number;

  @IsOptional()
  isActive?: boolean;
}

// DTO for executing recurring entries manually
export class ExecuteRecurringEntriesDto {
  @IsDateString()
  @IsNotEmpty()
  executionDate: string;

  @IsString()
  @IsOptional()
  recurringEntryId?: string; // If provided, execute only this one
}
