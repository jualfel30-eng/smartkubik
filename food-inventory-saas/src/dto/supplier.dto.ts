import {
  IsString,
  IsOptional,
  IsEmail,
  IsBoolean,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  Max,
  Matches,
} from "class-validator";
import { Type } from "class-transformer";
import { SanitizeString } from "../decorators/sanitize.decorator";

export class PaymentSettingsDto {
  @IsOptional()
  @IsBoolean()
  acceptsCredit?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultCreditDays?: number; // 0, 30, 60, 90 días

  @IsOptional()
  @IsNumber()
  @Min(0)
  creditLimit?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  acceptedPaymentMethods?: string[]; // ['efectivo', 'transferencia', 'pago_movil', 'zelle', 'binance', etc.]

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @SanitizeString()
  customPaymentMethods?: string[]; // Métodos personalizados

  @IsOptional()
  @IsString()
  preferredPaymentMethod?: string;

  @IsOptional()
  @IsBoolean()
  requiresAdvancePayment?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  advancePaymentPercentage?: number;

  @IsOptional()
  @IsString()
  @SanitizeString()
  paymentNotes?: string;
}

export class CreateSupplierDto {
  @IsString()
  @SanitizeString()
  name: string; // "Nombre de la Empresa"

  @IsString()
  @SanitizeString()
  @Matches(
    /^[VEJGPN]-?\d{7,9}(-\d)?$/,
    { message: 'RIF debe tener formato válido: V/E (cédula o RIF), J (RIF jurídico), G, P, N' }
  )
  rif: string;

  @IsString()
  @SanitizeString()
  contactName: string; // "Nombre del vendedor"

  @IsString()
  @IsOptional()
  @SanitizeString()
  contactPhone?: string; // "Teléfono"

  @IsEmail()
  @IsOptional()
  contactEmail?: string; // "Correo" - Email no necesita sanitización, solo validación

  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentSettingsDto)
  paymentSettings?: PaymentSettingsDto;
}
