import { IsArray, IsOptional, IsString } from "class-validator";

export class RemapPayrollAccountsDto {
  @IsArray()
  @IsOptional()
  earningsCodes?: string[];

  @IsArray()
  @IsOptional()
  bonusCodes?: string[];

  @IsArray()
  @IsOptional()
  severanceCodes?: string[];

  @IsString()
  @IsOptional()
  earningsDebit?: string;

  @IsString()
  @IsOptional()
  earningsCredit?: string;

  @IsString()
  @IsOptional()
  bonusDebit?: string;

  @IsString()
  @IsOptional()
  bonusCredit?: string;

  @IsString()
  @IsOptional()
  severanceDebit?: string;

  @IsString()
  @IsOptional()
  severanceCredit?: string;

  @IsString()
  @IsOptional()
  deductionsDebit?: string;

  @IsString()
  @IsOptional()
  deductionsCredit?: string;

  @IsString()
  @IsOptional()
  employerDebit?: string;

  @IsString()
  @IsOptional()
  employerCredit?: string;
}
