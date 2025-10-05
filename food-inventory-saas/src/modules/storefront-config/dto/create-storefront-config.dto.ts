import { IsString, IsBoolean, IsOptional, IsEnum, ValidateNested, IsArray, Matches } from 'class-validator';
import { Type } from 'class-transformer';

class ThemeConfigDto {
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'primaryColor debe ser un color hex válido (#RRGGBB)' })
  primaryColor: string;

  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'secondaryColor debe ser un color hex válido (#RRGGBB)' })
  secondaryColor: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  favicon?: string;
}

class SeoConfigDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];
}

class SocialMediaConfigDto {
  @IsOptional()
  @IsString()
  facebook?: string;

  @IsOptional()
  @IsString()
  instagram?: string;

  @IsOptional()
  @IsString()
  whatsapp?: string;
}

class ContactInfoConfigDto {
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;
}

export class CreateStorefrontConfigDto {
  @IsString()
  domain: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ValidateNested()
  @Type(() => ThemeConfigDto)
  theme: ThemeConfigDto;

  @IsEnum(['ecommerce', 'services'])
  templateType: 'ecommerce' | 'services';

  @IsOptional()
  @IsString()
  customCSS?: string;

  @ValidateNested()
  @Type(() => SeoConfigDto)
  seo: SeoConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SocialMediaConfigDto)
  socialMedia?: SocialMediaConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ContactInfoConfigDto)
  contactInfo?: ContactInfoConfigDto;
}

export class UpdateStorefrontConfigDto {
  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => ThemeConfigDto)
  theme?: ThemeConfigDto;

  @IsOptional()
  @IsEnum(['ecommerce', 'services'])
  templateType?: 'ecommerce' | 'services';

  @IsOptional()
  @IsString()
  customCSS?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SeoConfigDto)
  seo?: SeoConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SocialMediaConfigDto)
  socialMedia?: SocialMediaConfigDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ContactInfoConfigDto)
  contactInfo?: ContactInfoConfigDto;
}

export class UpdateThemeDto {
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  primaryColor?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  secondaryColor?: string;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  favicon?: string;
}
