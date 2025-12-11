import {
  IsString,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsArray,
  IsDateString,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';

export class CreateTaxSettingsDto {
  @IsEnum(['IVA', 'ISLR', 'IGTF', 'CUSTOMS', 'OTHER'])
  @IsNotEmpty()
  taxType: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  rate: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  accountCode: string;

  @IsString()
  @IsOptional()
  accountName?: string;

  @IsEnum(['all', 'products', 'services', 'payroll', 'custom'])
  @IsOptional()
  applicableTo?: string;

  @IsArray()
  @IsOptional()
  applicableCategories?: string[];

  @IsBoolean()
  @IsOptional()
  isWithholding?: boolean;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  withholdingRate?: number;

  @IsString()
  @IsOptional()
  withholdingAccountCode?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsBoolean()
  @IsOptional()
  exemptFromIGTF?: boolean;

  @IsDateString()
  @IsOptional()
  effectiveDate?: string;

  @IsDateString()
  @IsOptional()
  expiryDate?: string;
}

export class UpdateTaxSettingsDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  rate?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  accountCode?: string;

  @IsString()
  @IsOptional()
  accountName?: string;

  @IsEnum(['all', 'products', 'services', 'payroll', 'custom'])
  @IsOptional()
  applicableTo?: string;

  @IsArray()
  @IsOptional()
  applicableCategories?: string[];

  @IsBoolean()
  @IsOptional()
  isWithholding?: boolean;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  withholdingRate?: number;

  @IsString()
  @IsOptional()
  withholdingAccountCode?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsBoolean()
  @IsOptional()
  exemptFromIGTF?: boolean;

  @IsEnum(['active', 'inactive', 'archived'])
  @IsOptional()
  status?: string;

  @IsDateString()
  @IsOptional()
  effectiveDate?: string;

  @IsDateString()
  @IsOptional()
  expiryDate?: string;
}
