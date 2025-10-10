import {
  IsString,
  IsBoolean,
  IsOptional,
  IsEmail,
  IsUrl,
  IsEnum,
  IsArray,
  ValidateNested,
  IsNotEmpty,
  Matches,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ThemeConfigDto {
  @ApiProperty({
    description: "Color primario en formato hexadecimal",
    example: "#3B82F6",
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: "El color primario debe ser un código hexadecimal válido (ej: #3B82F6)",
  })
  primaryColor: string;

  @ApiProperty({
    description: "Color secundario en formato hexadecimal",
    example: "#10B981",
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: "El color secundario debe ser un código hexadecimal válido (ej: #10B981)",
  })
  secondaryColor: string;

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

export class SeoConfigDto {
  @ApiProperty({
    description: "Título SEO de la página",
    example: "Mi Tienda Online - Los mejores productos",
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: "Descripción meta para SEO",
    example: "Encuentra los mejores productos al mejor precio",
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({
    description: "Palabras clave para SEO",
    example: ["tienda", "productos", "online"],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];
}

export class SocialMediaConfigDto {
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
    message: "El número de WhatsApp debe estar en formato internacional (ej: +584121234567)",
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

export class AddressDto {
  @ApiProperty({
    description: "Calle y número",
    example: "Av. Principal, Edificio X",
  })
  @IsString()
  @IsNotEmpty()
  street: string;

  @ApiProperty({
    description: "Ciudad",
    example: "Caracas",
  })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({
    description: "Estado o provincia",
    example: "Distrito Capital",
  })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiPropertyOptional({
    description: "Código postal",
    example: "1010",
  })
  @IsOptional()
  @IsString()
  zipCode?: string;

  @ApiProperty({
    description: "País",
    example: "Venezuela",
  })
  @IsString()
  @IsNotEmpty()
  country: string;
}

export class ContactInfoConfigDto {
  @ApiProperty({
    description: "Email de contacto",
    example: "contacto@mitienda.com",
  })
  @IsEmail({}, { message: "Debe proporcionar un email válido" })
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: "Teléfono de contacto",
    example: "+584121234567",
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: "El teléfono debe estar en formato internacional (ej: +584121234567)",
  })
  phone: string;

  @ApiPropertyOptional({
    description: "Dirección física del negocio",
    type: AddressDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;
}

export class CreateStorefrontConfigDto {
  @ApiProperty({
    description: "Dominio del storefront (slug único)",
    example: "mitienda",
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+([a-z0-9-]*[a-z0-9])?$/, {
    message: "El dominio debe contener solo letras minúsculas, números y guiones (ej: mitienda, mi-tienda-01)",
  })
  domain: string;

  @ApiProperty({
    description: "Configuración del tema visual",
    type: ThemeConfigDto,
  })
  @ValidateNested()
  @Type(() => ThemeConfigDto)
  theme: ThemeConfigDto;

  @ApiProperty({
    description: "Tipo de plantilla del storefront",
    enum: ["ecommerce", "services"],
    example: "ecommerce",
  })
  @IsEnum(["ecommerce", "services"], {
    message: "El tipo de plantilla debe ser 'ecommerce' o 'services'",
  })
  templateType: string;

  @ApiPropertyOptional({
    description: "CSS personalizado para el storefront",
    example: ".custom-header { background: #fff; }",
  })
  @IsOptional()
  @IsString()
  customCSS?: string;

  @ApiProperty({
    description: "Configuración SEO",
    type: SeoConfigDto,
  })
  @ValidateNested()
  @Type(() => SeoConfigDto)
  seo: SeoConfigDto;

  @ApiPropertyOptional({
    description: "Enlaces a redes sociales",
    type: SocialMediaConfigDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SocialMediaConfigDto)
  socialMedia?: SocialMediaConfigDto;

  @ApiProperty({
    description: "Información de contacto",
    type: ContactInfoConfigDto,
  })
  @ValidateNested()
  @Type(() => ContactInfoConfigDto)
  contactInfo: ContactInfoConfigDto;

  @ApiPropertyOptional({
    description: "Estado de activación del storefront",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
