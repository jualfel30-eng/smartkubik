
import { IsString, IsOptional, IsEnum, IsDateString, ValidateNested, IsObject } from 'class-validator';
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

  @IsEnum(['FOOD_SERVICE', 'RETAIL', 'SERVICES', 'LOGISTICS', 'HYBRID'])
  @IsOptional()
  vertical?: string;

  @IsObject()
  @IsOptional()
  enabledModules?: {
    inventory?: boolean;
    orders?: boolean;
    customers?: boolean;
    suppliers?: boolean;
    reports?: boolean;
    accounting?: boolean;
    tables?: boolean;
    recipes?: boolean;
    kitchenDisplay?: boolean;
    menuEngineering?: boolean;
    pos?: boolean;
    variants?: boolean;
    ecommerce?: boolean;
    loyaltyProgram?: boolean;
    appointments?: boolean;
    resources?: boolean;
    booking?: boolean;
    servicePackages?: boolean;
    shipments?: boolean;
    tracking?: boolean;
    routes?: boolean;
    fleet?: boolean;
    warehousing?: boolean;
    dispatch?: boolean;
  };

  @ValidateNested()
  @Type(() => ContactInfoDto)
  @IsOptional()
  contactInfo?: ContactInfoDto;

  @ValidateNested()
  @Type(() => TaxInfoDto)
  @IsOptional()
  taxInfo?: TaxInfoDto;
}
