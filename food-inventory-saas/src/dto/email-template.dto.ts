import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsObject,
  IsNumber,
  Min,
} from "class-validator";

/**
 * PHASE 7: EMAIL/SMS TEMPLATES & DELIVERY SYSTEM
 * DTOs for EmailTemplate management
 */

export class CreateEmailTemplateDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @IsEnum(["promotional", "transactional", "newsletter", "announcement"])
  category?: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  preheader?: string;

  @IsString()
  htmlContent: string;

  @IsString()
  @IsOptional()
  textContent?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  variables?: string[];

  @IsObject()
  @IsOptional()
  design?: {
    layout?: string;
    theme?: string;
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
    backgroundColor?: string;
    headerImage?: string;
    footerText?: string;
    logoUrl?: string;
  };

  @IsObject()
  @IsOptional()
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
  };

  @IsString()
  @IsOptional()
  @IsEnum(["draft", "active", "archived"])
  status?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateEmailTemplateDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  @IsEnum(["promotional", "transactional", "newsletter", "announcement"])
  category?: string;

  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  preheader?: string;

  @IsString()
  @IsOptional()
  htmlContent?: string;

  @IsString()
  @IsOptional()
  textContent?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  variables?: string[];

  @IsObject()
  @IsOptional()
  design?: {
    layout?: string;
    theme?: string;
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
    backgroundColor?: string;
    headerImage?: string;
    footerText?: string;
    logoUrl?: string;
  };

  @IsObject()
  @IsOptional()
  socialLinks?: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
  };

  @IsString()
  @IsOptional()
  @IsEnum(["draft", "active", "archived"])
  status?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  notes?: string;
}

export class RenderTemplateDto {
  @IsString()
  templateId: string;

  @IsObject()
  context: Record<string, any>;
}

export class TestSendTemplateDto {
  @IsString()
  templateId: string;

  @IsString()
  @IsEnum(["email", "sms", "whatsapp"])
  channel: string;

  @IsString()
  recipient: string; // Email, phone, or WhatsApp ID

  @IsObject()
  @IsOptional()
  context?: Record<string, any>;
}

export class DuplicateTemplateDto {
  @IsString()
  templateId: string;

  @IsString()
  newName: string;
}

export class GetTemplatesQueryDto {
  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  search?: string; // Search by name or description

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  limit?: number;
}
