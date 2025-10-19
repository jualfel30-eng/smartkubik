import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
  IsMongoId,
} from "class-validator";
import { Type } from "class-transformer";

export class ImportBankStatementTransactionDto {
  @IsDateString()
  date: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsEnum(["credit", "debit"])
  type?: "credit" | "debit";

  @IsOptional()
  @IsString()
  reference?: string;
}

export class ImportBankStatementDto {
  @IsOptional()
  @IsMongoId()
  bankAccountId?: string;

  @IsDateString()
  statementDate: string;

  @IsNumber()
  @Type(() => Number)
  startingBalance: number;

  @IsNumber()
  @Type(() => Number)
  endingBalance: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  importSource?: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportBankStatementTransactionDto)
  transactions?: ImportBankStatementTransactionDto[];
}

export class MatchStatementTransactionDto {
  @IsMongoId()
  statementTransactionId: string;

  @IsMongoId()
  bankTransactionId: string;
}

export class UnmatchStatementTransactionDto {
  @IsMongoId()
  statementTransactionId: string;
}

export class ReconciliationSummaryDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ManualReconcileDto {
  @IsMongoId()
  transactionId: string;

  @IsOptional()
  @IsMongoId()
  statementImportId?: string;

  @IsOptional()
  @IsMongoId()
  statementTransactionId?: string;

  @IsNumber()
  @Type(() => Number)
  bankAmount: number;

  @IsDateString()
  bankDate: string;

  @IsOptional()
  @IsString()
  bankReference?: string;
}

export class ReconcileBulkDto {
  @IsMongoId()
  bankAccountId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ManualReconcileDto)
  entries: ManualReconcileDto[];
}
