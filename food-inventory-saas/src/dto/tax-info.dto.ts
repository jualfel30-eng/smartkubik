import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class TaxInfoDto {
  @IsString()
  @IsOptional()
  rif?: string;

  @IsString()
  @IsOptional()
  businessName?: string;

  @IsBoolean()
  @IsOptional()
  isRetentionAgent?: boolean;

  @IsString()
  @IsOptional()
  taxRegime?: string;
}
