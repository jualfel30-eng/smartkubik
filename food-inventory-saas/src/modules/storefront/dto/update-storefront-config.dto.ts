import {
  IsString,
  IsBoolean,
  IsOptional,
  IsEmail,
  IsUrl,
  IsEnum,
  IsArray,
  ValidateNested,
  Matches,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateThemeConfigDto {
  @ApiPropertyOptional({
    description: "Color primario en formato hexadecimal",
    example: "#3B82F6",
  })
  @IsOptional()
  @IsString()
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message:
      "El color primario debe ser un código hexadecimal válido (ej: #3B82F6)",
  })
  primaryColor?: string;

  @ApiPropertyOptional({
    description: "Color secundario en formato hexadecimal",
    example: "#10B981",
  })
  @IsOptional()
  @IsString()
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message:
      "El color secundario debe ser un código hexadecimal válido (ej: #10B981)",
  })
  secondaryColor?: string;

  @ApiPropertyOptional({
    description: "URL del logo",
    example: "https://cdn.example.com/logo.png",
  })
  @IsOptional()
  @IsUrl({}, { message: "El logo debe ser una URL válida" })
  logo?: string;

  @ApiPropertyOptional({
    description: "URL del favicon",
    example: "https://cdn.example.com/favicon.ico",
  })
  @IsOptional()
  @IsUrl({}, { message: "El favicon debe ser una URL válida" })
  favicon?: string;
}

export class UpdateSeoConfigDto {
  @ApiPropertyOptional({
    description: "Título SEO de la página",
    example: "Mi Tienda Online - Los mejores productos",
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({
    description: "Descripción meta para SEO",
    example: "Encuentra los mejores productos al mejor precio",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: "Palabras clave para SEO",
    example: ["tienda", "productos", "online"],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];
}

export class UpdateSocialMediaConfigDto {
  @ApiPropertyOptional({
    description: "URL de Facebook",
    example: "https://facebook.com/mitienda",
  })
  @IsOptional()
  @IsUrl({}, { message: "La URL de Facebook debe ser válida" })
  facebook?: string;

  @ApiPropertyOptional({
    description: "URL de Instagram",
    example: "https://instagram.com/mitienda",
  })
  @IsOptional()
  @IsUrl({}, { message: "La URL de Instagram debe ser válida" })
  instagram?: string;

  @ApiPropertyOptional({
    description: "Número de WhatsApp con código de país",
    example: "+584121234567",
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message:
      "El número de WhatsApp debe estar en formato internacional (ej: +584121234567)",
  })
  whatsapp?: string;

  @ApiPropertyOptional({
    description: "URL de Twitter",
    example: "https://twitter.com/mitienda",
  })
  @IsOptional()
  @IsUrl({}, { message: "La URL de Twitter debe ser válida" })
  twitter?: string;

  @ApiPropertyOptional({
    description: "URL de LinkedIn",
    example: "https://linkedin.com/company/mitienda",
  })
  @IsOptional()
  @IsUrl({}, { message: "La URL de LinkedIn debe ser válida" })
  linkedin?: string;
}

export class UpdateAddressDto {
  @ApiPropertyOptional({
    description: "Calle y número",
    example: "Av. Principal, Edificio X",
  })
  @IsOptional()
  @IsString()
  street?: string;

  @ApiPropertyOptional({
    description: "Ciudad",
    example: "Caracas",
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: "Estado o provincia",
    example: "Distrito Capital",
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({
    description: "Código postal",
    example: "1010",
  })
  @IsOptional()
  @IsString()
  zipCode?: string;

  @ApiPropertyOptional({
    description: "País",
    example: "Venezuela",
  })
  @IsOptional()
  @IsString()
  country?: string;
}

export class UpdateContactInfoConfigDto {
  @ApiPropertyOptional({
    description: "Email de contacto",
    example: "contacto@mitienda.com",
  })
  @IsOptional()
  @IsEmail({}, { message: "Debe proporcionar un email válido" })
  email?: string;

  @ApiPropertyOptional({
    description: "Teléfono de contacto",
    example: "+584121234567",
  })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message:
      "El teléfono debe estar en formato internacional (ej: +584121234567)",
  })
  phone?: string;

  @ApiPropertyOptional({
    description: "Dirección física del negocio",
    type: UpdateAddressDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateAddressDto)
  address?: UpdateAddressDto;
}

export class UpdateStorefrontConfigDto {
  @ApiPropertyOptional({
    description: "Dominio del storefront (slug único)",
    example: "mitienda",
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+([a-z0-9-]*[a-z0-9])?$/, {
    message:
      "El dominio debe contener solo letras minúsculas, números y guiones (ej: mitienda, mi-tienda-01)",
  })
  domain?: string;

  @ApiPropertyOptional({
    description: "Configuración del tema visual",
    type: UpdateThemeConfigDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateThemeConfigDto)
  theme?: UpdateThemeConfigDto;

  @ApiPropertyOptional({
    description: "Tipo de plantilla del storefront",
    enum: ["ecommerce", "services"],
    example: "ecommerce",
  })
  @IsOptional()
  @IsEnum(["ecommerce", "services"], {
    message: "El tipo de plantilla debe ser 'ecommerce' o 'services'",
  })
  templateType?: string;

  @ApiPropertyOptional({
    description: "CSS personalizado para el storefront",
    example: ".custom-header { background: #fff; }",
  })
  @IsOptional()
  @IsString()
  customCSS?: string;

  @ApiPropertyOptional({
    description: "Configuración SEO",
    type: UpdateSeoConfigDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSeoConfigDto)
  seo?: UpdateSeoConfigDto;

  @ApiPropertyOptional({
    description: "Enlaces a redes sociales",
    type: UpdateSocialMediaConfigDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateSocialMediaConfigDto)
  socialMedia?: UpdateSocialMediaConfigDto;

  @ApiPropertyOptional({
    description: "Información de contacto",
    type: UpdateContactInfoConfigDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateContactInfoConfigDto)
  contactInfo?: UpdateContactInfoConfigDto;

  @ApiPropertyOptional({
    description: "Estado de activación del storefront",
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
