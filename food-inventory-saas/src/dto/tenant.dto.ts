import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsEmail,
  ValidateNested,
  IsObject,
  IsNotEmptyObject,
  IsNumber,
  Min,
  Max,
  IsBoolean,
  IsIn,
  IsNotEmpty,
} from "class-validator";
import { Type } from "class-transformer";
import { SanitizeString } from "../decorators/sanitize.decorator";
import { VerticalKey, verticalProfileKeys } from "../config/vertical-profiles";

export class AddressDto {
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

export class ContactInfoDto {
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

export class TaxInfoDto {
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

export class CurrencySettingsDto {
  @ApiProperty({ example: "VES" })
  @IsString()
  @IsOptional()
  primary?: string;
}

export class InventorySettingsDto {
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

export class DocumentTemplatesSettingsDto {
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

export class HospitalityPoliciesSettingsDto {
  @ApiProperty({ example: true })
  @IsOptional()
  @IsBoolean()
  depositRequired?: boolean;

  @ApiProperty({ example: 30 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  depositPercentage?: number;

  @ApiProperty({ example: 24 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cancellationWindowHours?: number;

  @ApiProperty({ example: "percentage", enum: ["percentage", "fixed"] })
  @IsOptional()
  @IsIn(["percentage", "fixed"])
  noShowPenaltyType?: "percentage" | "fixed";

  @ApiProperty({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  noShowPenaltyValue?: number;

  @ApiProperty({
    example:
      "Validar depósitos con el estado de cuenta Mercantil a las 10:00 y 16:00.",
  })
  @IsOptional()
  @IsString()
  @SanitizeString()
  manualNotes?: string;
}

class PayrollThirteenthMonthSettingsDto {
  @ApiProperty({ example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({
    example: "proportional",
    enum: ["full_salary", "proportional"],
  })
  @IsOptional()
  @IsIn(["full_salary", "proportional"])
  calculationMethod?: "full_salary" | "proportional";

  @ApiProperty({ example: 30 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  referenceDays?: number;
}

class PayrollContributionSettingsDto {
  @ApiProperty({ example: 0.12 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  ivssRate?: number;

  @ApiProperty({ example: 0.02 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  paroForzosoRate?: number;

  @ApiProperty({ example: 0.01 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  faovRate?: number;

  @ApiProperty({ example: 0.02 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  housingPolicyRate?: number;
}

class PayrollSettingsDto {
  @ApiProperty({ example: "VES" })
  @IsOptional()
  @IsString()
  @SanitizeString()
  baseCurrency?: string;

  @ApiProperty({
    example: "monthly",
    enum: ["monthly", "biweekly", "weekly"],
  })
  @IsOptional()
  @IsIn(["monthly", "biweekly", "weekly"])
  defaultPaySchedule?: "monthly" | "biweekly" | "weekly";

  @ApiProperty({ example: 15 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(31)
  defaultPayDay?: number;

  @ApiProperty({ example: true })
  @IsOptional()
  @IsBoolean()
  allowCustomFrequencies?: boolean;

  @ApiProperty({ type: PayrollThirteenthMonthSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PayrollThirteenthMonthSettingsDto)
  thirteenthMonthPolicy?: PayrollThirteenthMonthSettingsDto;

  @ApiProperty({ type: PayrollContributionSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PayrollContributionSettingsDto)
  statutoryContributions?: PayrollContributionSettingsDto;
}

class VerticalProfileSettingsDto {
  @ApiProperty({ enum: verticalProfileKeys })
  @IsString()
  @IsIn(verticalProfileKeys)
  key: VerticalKey;

  @ApiProperty({ required: false, type: Object })
  @IsOptional()
  @IsObject()
  overrides?: Record<string, any>;
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

export class AiAssistantSettingsDto {
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

export class BillingPreferencesDto {
  @ApiProperty({
    example: "print",
    enum: ["print", "email", "whatsapp", "none"],
  })
  @IsOptional()
  @IsIn(["print", "email", "whatsapp", "none"])
  defaultDeliveryMethod?: "print" | "email" | "whatsapp" | "none";

  @ApiProperty({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  autoPrintCopies?: number;

  @ApiProperty({ example: ["print", "email"] })
  @IsOptional()
  @IsString({ each: true })
  enabledMethods?: string[];

  @ApiProperty({ required: false, type: Object })
  @IsOptional()
  @IsObject()
  printers?: {
    receiptPrinterIp?: string;
  };
}

export class NotificationSettingsDto {
  @ApiProperty({ example: true })
  @IsOptional()
  @IsBoolean()
  customerOrderUpdates?: boolean; // Enable/Disable all customer notifications

  @ApiProperty({ example: ["email"] })
  @IsOptional()
  @IsString({ each: true })
  enabledChannels?: string[]; // email, whatsapp, sms

  @ApiProperty({ example: true })
  @IsOptional()
  @IsBoolean()
  notifyOnPicking?: boolean;

  @ApiProperty({ example: true })
  @IsOptional()
  @IsBoolean()
  notifyOnShipped?: boolean;

  @ApiProperty({ example: true })
  @IsOptional()
  @IsBoolean()
  notifyOnDelivered?: boolean;
}

export class OrdersSettingsDto {
  @ApiProperty({ example: 'search', enum: ['search', 'grid', 'list'] })
  @IsOptional()
  @IsIn(['search', 'grid', 'list'])
  productViewType?: 'search' | 'grid' | 'list';

  @ApiProperty({ example: 3 })
  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(6)
  gridColumns?: number;

  @ApiProperty({ example: true })
  @IsOptional()
  @IsBoolean()
  showProductImages?: boolean;

  @ApiProperty({ example: false })
  @IsOptional()
  @IsBoolean()
  showProductDescription?: boolean;

  @ApiProperty({ example: true })
  @IsOptional()
  @IsBoolean()
  enableCategoryFilter?: boolean;
}

export class PaymentMethodDetailsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @SanitizeString()
  bank?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @SanitizeString()
  accountNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @SanitizeString()
  accountName?: string; // Titular

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @SanitizeString()
  cid?: string; // Cédula o RIF

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @SanitizeString()
  phoneNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @SanitizeString()
  email?: string;
}

export class PaymentMethodSettingDto {
  @ApiProperty({ example: "zelle_usd" })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ example: "Zelle (USD)" })
  @IsString()
  @IsNotEmpty()
  @SanitizeString()
  name: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  igtfApplicable: boolean;

  @ApiProperty({ example: "Enviar pago al correo: ejemplo@mail.com", required: false })
  @IsOptional()
  @IsString()
  @SanitizeString()
  instructions?: string;

  @ApiProperty({ type: PaymentMethodDetailsDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentMethodDetailsDto)
  details?: PaymentMethodDetailsDto;
}

export class OperationalSettingsDto {
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

  @ApiProperty({ type: OrdersSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrdersSettingsDto)
  orders?: OrdersSettingsDto;

  @ApiProperty({ type: BillingPreferencesDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BillingPreferencesDto)
  billingPreferences?: BillingPreferencesDto;

  @ApiProperty({ type: NotificationSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationSettingsDto)
  notifications?: NotificationSettingsDto;

  @ApiProperty({
    example: "thermal",
    enum: ["standard", "thermal"],
    description: "Formato de impresión para documentos fiscales (A4 vs térmica 80mm)",
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(["standard", "thermal"])
  invoiceFormat?: string;

  @ApiProperty({
    example: "logistics",
    enum: ["immediate", "counter", "logistics", "hybrid"],
    description: "Estrategia de entrega: immediate (supermercado), counter (mostrador), logistics (envío), hybrid (auto)",
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(["immediate", "counter", "logistics", "hybrid"])
  fulfillmentStrategy?: "immediate" | "counter" | "logistics" | "hybrid";

  @ApiProperty({ type: DocumentTemplatesSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DocumentTemplatesSettingsDto)
  documentTemplates?: DocumentTemplatesSettingsDto;

  @ApiProperty({ type: HospitalityPoliciesSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => HospitalityPoliciesSettingsDto)
  hospitalityPolicies?: HospitalityPoliciesSettingsDto;

  @ApiProperty({ type: PayrollSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PayrollSettingsDto)
  payroll?: PayrollSettingsDto;

  @ApiProperty({ type: [PaymentMethodSettingDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PaymentMethodSettingDto)
  paymentMethods?: PaymentMethodSettingDto[];
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

  @ApiProperty({ type: VerticalProfileSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => VerticalProfileSettingsDto)
  verticalProfile?: VerticalProfileSettingsDto;

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
  @ApiPropertyOptional({ example: "staff" })
  @IsString()
  @IsOptional()
  role?: string;

  @ApiPropertyOptional({ example: "nuevo.correo@example.com" })
  @IsEmail()
  @IsOptional()
  email?: string;

  // Podríamos añadir más campos para actualizar en el futuro, como 'isActive'
}
