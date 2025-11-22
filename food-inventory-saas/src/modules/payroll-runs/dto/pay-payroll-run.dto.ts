import {
  IsDateString,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
} from "class-validator";

export class PayPayrollRunDto {
  @IsMongoId()
  @IsOptional()
  bankAccountId?: string;

  @IsString()
  @IsNotEmpty()
  method: string;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsDateString()
  @IsOptional()
  paymentDate?: string;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsOptional()
  exchangeRate?: number;

  @IsBoolean()
  @IsOptional()
  applyIgtf?: boolean;

  @IsNumber()
  @IsOptional()
  igtfRate?: number;
}
