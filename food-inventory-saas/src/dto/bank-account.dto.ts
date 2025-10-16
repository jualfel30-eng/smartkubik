import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean, IsEnum, IsDateString, Min } from 'class-validator';

export class CreateBankAccountDto {
  @IsString()
  @IsNotEmpty()
  bankName: string;

  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @IsEnum(['corriente', 'ahorro', 'nomina', 'otra'])
  @IsNotEmpty()
  accountType: 'corriente' | 'ahorro' | 'nomina' | 'otra';

  @IsString()
  @IsOptional()
  currency?: string = 'VES';

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  initialBalance: number;

  @IsString()
  @IsOptional()
  accountHolderName?: string;

  @IsString()
  @IsOptional()
  branchName?: string;

  @IsString()
  @IsOptional()
  swiftCode?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;

  @IsBoolean()
  @IsOptional()
  alertEnabled?: boolean = false;

  @IsNumber()
  @IsOptional()
  @Min(0)
  minimumBalance?: number | null;
}

export class UpdateBankAccountDto {
  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  accountNumber?: string;

  @IsEnum(['corriente', 'ahorro', 'nomina', 'otra'])
  @IsOptional()
  accountType?: 'corriente' | 'ahorro' | 'nomina' | 'otra';

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  accountHolderName?: string;

  @IsString()
  @IsOptional()
  branchName?: string;

  @IsString()
  @IsOptional()
  swiftCode?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsDateString()
  @IsOptional()
  lastReconciliationDate?: string;

  @IsBoolean()
  @IsOptional()
  alertEnabled?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(0)
  minimumBalance?: number | null;
}

export class AdjustBalanceDto {
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsEnum(['increase', 'decrease'])
  @IsNotEmpty()
  type: 'increase' | 'decrease';

  @IsString()
  @IsOptional()
  reference?: string;
}
