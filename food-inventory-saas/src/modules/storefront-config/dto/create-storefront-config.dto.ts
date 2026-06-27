import {
  IsString,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsNumber,
  IsObject,
  Min,
  Max,
  ValidateNested,
  IsArray,
  Matches,
} from "class-validator";
import { Type } from "class-transformer";

class ThemeConfigDto {
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: "primaryColor debe ser un color hex válido (#RRGGBB)",
  })
  primaryColor: string;

  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: "secondaryColor debe ser un color hex válido (#RRGGBB)",
  })
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

  @IsEnum(
    ["ecommerce", "services", "beauty", "premium", "restaurant", "health"],
    {
      message:
        "El tipo de plantilla debe ser 'ecommerce', 'services', 'beauty', 'premium', 'restaurant' o 'health'",
    },
  )
  templateType:
    | "ecommerce"
    | "services"
    | "beauty"
    | "premium"
    | "restaurant"
    | "health";

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
  @IsEnum(["ecommerce", "services"])
  templateType?: "ecommerce" | "services";

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

class NoShowPolicyDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  warningThreshold?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  depositThreshold?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  blacklistThreshold?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  resetAfterDays?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  depositPercentage?: number;
}

export class UpdateBeautyConfigDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => NoShowPolicyDto)
  noShowPolicy?: NoShowPolicyDto;

  // Validado como objeto plano + sanitizado en el service. (Con @ValidateNested
  // anidado el campo se descartaba por el whitelist del ValidationPipe.)
  @IsOptional()
  @IsObject()
  cancellationPolicy?: {
    enabled?: boolean;
    mode?: "credit" | "refund";
    refundPercentage?: number;
  };
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
