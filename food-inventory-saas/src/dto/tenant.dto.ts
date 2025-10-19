import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsEmail,
  IsPhoneNumber,
  ValidateNested,
  IsObject,
  IsNotEmptyObject,
  IsNumber,
  Min,
  IsBoolean,
} from "class-validator";
import { Type } from "class-transformer";
import { SanitizeString } from "../decorators/sanitize.decorator";

class AddressDto {
  @ApiProperty({ example: "Calle Principal 123" })
  @IsString()
  @IsOptional()
  @SanitizeString()
  street: string;

  @ApiProperty({ example: "Caracas" })
  @IsString()
  @IsOptional()
  @SanitizeString()
  city: string;

  @ApiProperty({ example: "Distrito Capital" })
  @IsString()
  @IsOptional()
  @SanitizeString()
  state: string;

  @ApiProperty({ example: "1010" })
  @IsString()
  @IsOptional()
  @SanitizeString()
  zipCode?: string;

  @ApiProperty({ example: "Venezuela" })
  @IsString()
  @IsOptional()
  @SanitizeString()
  country: string;
}

class ContactInfoDto {
  @ApiProperty({ example: "contacto@juantacos.com" })
  @IsEmail()
  @IsOptional()
  email: string;

  @ApiProperty({ example: "+584121234567" })
  @IsString()
  @IsOptional()
  @SanitizeString()
  phone: string;

  @ApiProperty()
  @ValidateNested()
  @Type(() => AddressDto)
  @IsOptional()
  address: AddressDto;
}

class TaxInfoDto {
  @ApiProperty({ example: "J-12345678-9" })
  @IsString()
  @IsOptional()
  @SanitizeString()
  rif: string;

  @ApiProperty({ example: "Juan Tacos C.A." })
  @IsString()
  @IsOptional()
  @SanitizeString()
  businessName: string;
}

class CurrencySettingsDto {
  @ApiProperty({ example: "VES" })
  @IsString()
  @IsOptional()
  primary?: string;
}

class InventorySettingsDto {
    @ApiProperty({ example: 10 })
    @IsNumber()
    @IsOptional()
    @Min(0)
    lowStockAlertThreshold?: number;

    @ApiProperty({ example: true })
    @IsOptional()
    @IsBoolean()
    fefoEnabled?: boolean;
}

class InvoiceSettingsDto {
  @ApiProperty({ example: "#000000" })
  @IsString()
  @IsOptional()
  @SanitizeString()
  primaryColor?: string;

  @ApiProperty({ example: "#FFFFFF" })
  @IsString()
  @IsOptional()
  @SanitizeString()
  accentColor?: string;

  @ApiProperty({ example: "Gracias por su compra" })
  @IsString()
  @IsOptional()
  @SanitizeString()
  footerText?: string;
}

class QuoteSettingsDto {
  @ApiProperty({ example: "#000000" })
  @IsString()
  @IsOptional()
  @SanitizeString()
  primaryColor?: string;

  @ApiProperty({ example: "#FFFFFF" })
  @IsString()
  @IsOptional()
  @SanitizeString()
  accentColor?: string;

  @ApiProperty({ example: "Presupuesto válido por 15 días." })
  @IsString()
  @IsOptional()
  @SanitizeString()
  footerText?: string;
}

class DocumentTemplatesSettingsDto {
  @ApiProperty({ type: InvoiceSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => InvoiceSettingsDto)
  invoice?: InvoiceSettingsDto;

  @ApiProperty({ type: QuoteSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => QuoteSettingsDto)
  quote?: QuoteSettingsDto;
}

class AiAssistantCapabilitiesSettingsDto {
  @ApiProperty({ example: true })
  @IsOptional()
  @IsBoolean()
  knowledgeBaseEnabled?: boolean;

  @ApiProperty({ example: true })
  @IsOptional()
  @IsBoolean()
  inventoryLookup?: boolean;

  @ApiProperty({ example: false })
  @IsOptional()
  @IsBoolean()
  schedulingLookup?: boolean;

  @ApiProperty({ example: false })
  @IsOptional()
  @IsBoolean()
  orderLookup?: boolean;
}

class AiAssistantSettingsDto {
  @ApiProperty({ example: false })
  @IsOptional()
  @IsBoolean()
  autoReplyEnabled?: boolean;

  @ApiProperty({ example: "smartkubik_docs" })
  @IsString()
  @IsOptional()
  @SanitizeString()
  knowledgeBaseTenantId?: string;

  @ApiProperty({ example: "gpt-4o-mini" })
  @IsString()
  @IsOptional()
  @SanitizeString()
  model?: string;

  @ApiProperty({
    type: () => AiAssistantCapabilitiesSettingsDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AiAssistantCapabilitiesSettingsDto)
  capabilities?: AiAssistantCapabilitiesSettingsDto;
}

class OperationalSettingsDto {
  @ApiProperty({ type: CurrencySettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CurrencySettingsDto)
  currency?: CurrencySettingsDto;

  @ApiProperty({ type: InventorySettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => InventorySettingsDto)
  inventory?: InventorySettingsDto;

  @ApiProperty({ type: DocumentTemplatesSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DocumentTemplatesSettingsDto)
  documentTemplates?: DocumentTemplatesSettingsDto;
}

export class UpdateTenantSettingsDto {
  @ApiProperty({ example: "Juan Tacos" })
  @IsString()
  @IsOptional()
  @SanitizeString()
  name?: string;

  @ApiProperty({ type: ContactInfoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ContactInfoDto)
  @IsObject()
  @IsNotEmptyObject()
  contactInfo?: ContactInfoDto;

  @ApiProperty({ type: TaxInfoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TaxInfoDto)
  @IsObject()
  @IsNotEmptyObject()
  taxInfo?: TaxInfoDto;

  @ApiProperty({ example: "https://example.com/logo.png" })
  @IsString()
  @IsOptional()
  @SanitizeString()
  logo?: string;

  @ApiProperty({ example: "https://juantacos.com" })
  @IsString()
  @IsOptional()
  @SanitizeString()
  website?: string;

  @ApiProperty({ example: "America/Caracas" })
  @IsString()
  @IsOptional()
  @SanitizeString()
  timezone?: string;

  @ApiProperty({ type: OperationalSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => OperationalSettingsDto)
  settings?: OperationalSettingsDto;

  @ApiProperty({ type: AiAssistantSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AiAssistantSettingsDto)
  aiAssistant?: AiAssistantSettingsDto;
}

export class InviteUserDto {
  @ApiProperty({ example: "john.doe@example.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "John" })
  @IsString()
  @SanitizeString()
  firstName: string;

  @ApiProperty({ example: "Doe" })
  @IsString()
  @SanitizeString()
  lastName: string;

  @ApiProperty({ example: "manager" })
  @IsString()
  role: string;
}

export class UpdateUserDto {
  @ApiProperty({ example: "staff" })
  @IsString()
  @IsOptional()
  role?: string;

  // Podríamos añadir más campos para actualizar en el futuro, como 'isActive'
}
