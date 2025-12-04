import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  IsDateString,
  IsMongoId,
  IsObject,
  ValidateNested,
  IsIn,
} from "class-validator";
import { Type } from "class-transformer";

export class BankTransactionCounterpartDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  rif?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  bank?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  terminalId?: string;

  @IsOptional()
  @IsString()
  cardType?: string;

  @IsOptional()
  @IsString()
  voucher?: string;
}

export class CreateBankTransactionDto {
  @IsEnum(["credit", "debit"])
  type: "credit" | "debit";

  @IsIn([
    "pago_movil",
    "transferencia",
    "pos",
    "deposito_cajero",
    "fee",
    "interest",
    "ajuste_manual",
    "otros",
  ])
  channel: string;

  @IsOptional()
  @IsString()
  method?: string;

  @IsNumber()
  amount: number;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => BankTransactionCounterpartDto)
  counterpart?: BankTransactionCounterpartDto;

  @IsOptional()
  @IsDateString()
  transactionDate?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class BankTransactionQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsEnum(["credit", "debit"])
  type?: "credit" | "debit";

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(["pending", "matched", "manually_matched", "rejected", "in_review"])
  reconciliationStatus?: string;

  @IsOptional()
  @IsString()
  sortField?: string;

  @IsOptional()
  @IsEnum(["asc", "desc"])
  sortOrder?: "asc" | "desc";

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 25;
}

export class RecordPaymentMovementDto {
  @IsMongoId()
  bankAccountId: string;

  @IsMongoId()
  paymentId: string;

  @IsEnum(["sale", "payable"])
  paymentType: "sale" | "payable";

  @IsNumber()
  amount: number;

  @IsString()
  method: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsEnum(["pending", "matched", "manual", "rejected"])
  reconciliationStatus?: "pending" | "matched" | "manual" | "rejected";

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  balanceAfter?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsDateString()
  transactionDate: string;
}

export class CreateBankTransferDto {
  @IsMongoId()
  destinationAccountId: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  metadataNote?: string;
}
