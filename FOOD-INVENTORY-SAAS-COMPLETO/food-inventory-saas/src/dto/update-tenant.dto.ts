
import { IsString, IsOptional, IsEnum, IsDateString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ContactInfoDto } from './contact-info.dto';
import { TaxInfoDto } from './tax-info.dto';

export class UpdateTenantDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  @IsEnum(['active', 'suspended', 'pending'])
  status?: string;

  @IsString()
  @IsOptional()
  subscriptionPlan?: string;

  @IsDateString()
  @IsOptional()
  subscriptionExpiresAt?: Date;

  @IsString()
  @IsOptional()
  businessType?: string;

  @ValidateNested()
  @Type(() => ContactInfoDto)
  @IsOptional()
  contactInfo?: ContactInfoDto;

  @ValidateNested()
  @Type(() => TaxInfoDto)
  @IsOptional()
  taxInfo?: TaxInfoDto;
}
