import { IsString, IsOptional, IsMongoId, IsEnum, IsNotEmpty, IsEmail, IsBoolean } from 'class-validator';
import { SanitizeString, SanitizeText } from '../decorators/sanitize.decorator';

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  @SanitizeString()
  name: string;

  @IsString()
  @IsOptional()
  @SanitizeText()
  description?: string;

  @IsString()
  @IsOptional()
  @SanitizeString()
  address?: string;

  @IsString()
  @IsOptional()
  @SanitizeString()
  phone?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsEnum(['new-business', 'new-location'])
  @IsOptional()
  type?: 'new-business' | 'new-location';

  @IsEnum(['FOOD_SERVICE', 'RETAIL', 'SERVICES', 'LOGISTICS', 'HYBRID'])
  @IsOptional()
  vertical?: string;

  @IsString()
  @IsOptional()
  @SanitizeString()
  businessType?: string;

  @IsMongoId()
  @IsOptional()
  parentOrganizationId?: string;

  @IsBoolean()
  @IsOptional()
  cloneData?: boolean;
}

export class UpdateOrganizationDto {
  @IsString()
  @IsOptional()
  @SanitizeString()
  name?: string;

  @IsString()
  @IsOptional()
  @SanitizeText()
  description?: string;
}

export class AddMemberDto {
  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  @IsEnum(['admin', 'member'])
  @IsOptional()
  role?: 'admin' | 'member' = 'member';
}

export class RemoveMemberDto {
  @IsMongoId()
  @IsNotEmpty()
  userId: string;
}
