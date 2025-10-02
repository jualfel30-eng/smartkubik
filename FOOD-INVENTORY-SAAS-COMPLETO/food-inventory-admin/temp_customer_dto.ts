import { 
  IsString, 
  IsNumber, 
  IsBoolean, 
  IsOptional, 
  IsArray, 
  ValidateNested, 
  IsNotEmpty,
  Min,
  Max,
  IsEnum,
  IsMongoId,
  IsObject,
  IsEmail,
  IsPhoneNumber
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CustomerTaxInfoDto {
  @ApiProperty({ description: 'Número de Identificación Fiscal (Cédula o RIF)' })
  @IsString()
  @IsNotEmpty()
  taxId: string;

  @ApiProperty({ description: 'Tipo de Identificación', enum: ['V', 'E', 'J', 'G'] })
  @IsEnum(['V', 'E', 'J', 'G'])
  taxType: string;

  @ApiPropertyOptional({ description: 'Nombre fiscal o razón social' })
  @IsOptional()
  @IsString()
  taxName?: string;

  @ApiPropertyOptional({ description: 'Es agente de retención', default: false })
  @IsOptional()
  @IsBoolean()
  isRetentionAgent?: boolean;
}

export class CustomerAddressDto {
  @ApiProperty({ description: 'Tipo de dirección', enum: ['billing', 'shipping', 'both'] })
  @IsEnum(['billing', 'shipping', 'both'])
  type: string;

  @ApiProperty({ description: 'Calle' })
  @IsString()
  @IsNotEmpty()
  street: string;

  @ApiProperty({ description: 'Ciudad' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ description: 'Estado' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiPropertyOptional({ description: 'Código postal' })
  @IsOptional()
  @IsString()
  zipCode?: string;

  @ApiPropertyOptional({ description: 'País', default: 'Venezuela' })
  @IsOptional()
  @IsString()
  country?: string = 'Venezuela';

  @ApiPropertyOptional({ description: 'Coordenadas GPS' })
  @IsOptional()
  @IsObject()
  coordinates?: {
    lat: number;
    lng: number;
  };

  @ApiPropertyOptional({ description: 'Es dirección por defecto', default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: 'Notas adicionales' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CustomerContactDto {
  @ApiProperty({ description: 'Tipo de contacto', enum: ['phone', 'email', 'whatsapp'] })
  @IsEnum(['phone', 'email', 'whatsapp'])
  type: string;

  @ApiProperty({ description: 'Valor del contacto' })
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiPropertyOptional({ description: 'Es contacto principal', default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional({ description: 'Notas del contacto' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CustomerPaymentMethodDto {
  @ApiProperty({ description: 'Tipo de método de pago', enum: ['cash', 'card', 'transfer', 'usd_cash', 'usd_transfer'] })
  @IsEnum(['cash', 'card', 'transfer', 'usd_cash', 'usd_transfer'])
  type: string;

  @ApiPropertyOptional({ description: 'Banco' })
  @IsOptional()
  @IsString()
  bank?: string;

  @ApiPropertyOptional({ description: 'Últimos 4 dígitos de cuenta/tarjeta' })
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiPropertyOptional({ description: 'Tipo de tarjeta' })
  @IsOptional()
  @IsString()
  cardType?: string;

  @ApiPropertyOptional({ description: 'Es método preferido', default: false })
  @IsOptional()
  @IsBoolean()
  isPreferred?: boolean;
}

export class CreateCustomerDto {
  @ApiProperty({ description: 'Nombre del cliente' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Apellido del cliente' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ description: 'Nombre de la empresa' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiProperty({ description: 'Tipo de cliente', enum: ['individual', 'business', 'supplier', 'employee', 'admin', 'manager'] })
  @IsEnum(['individual', 'business', 'supplier', 'employee', 'admin', 'manager'])
  customerType: string;

  @ApiPropertyOptional({ description: 'Información fiscal', type: CustomerTaxInfoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => CustomerTaxInfoDto)
  taxInfo?: CustomerTaxInfoDto;

  @ApiPropertyOptional({ description: 'Direcciones del cliente', type: [CustomerAddressDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomerAddressDto)
  addresses?: CustomerAddressDto[];

  @ApiPropertyOptional({ description: 'Contactos del cliente', type: [CustomerContactDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomerContactDto)
  contacts?: CustomerContactDto[];

  @ApiPropertyOptional({ description: 'Métodos de pago del cliente', type: [CustomerPaymentMethodDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomerPaymentMethodDto)
  paymentMethods?: CustomerPaymentMethodDto[];

  @ApiPropertyOptional({ description: 'Preferencias del cliente' })
  @IsOptional()
  @IsObject()
  preferences?: {
    preferredCurrency: string;
    preferredPaymentMethod: string;
    preferredDeliveryMethod: string;
    communicationChannel: string;
    marketingOptIn: boolean;
    invoiceRequired: boolean;
    specialInstructions?: string;
  };

  @ApiPropertyOptional({ description: 'Información de crédito' })
  @IsOptional()
  @IsObject()
  creditInfo?: {
    creditLimit: number;
    paymentTerms: number;
    creditRating: string;
  };

  @ApiPropertyOptional({ description: 'Fuente de registro', enum: ['manual', 'web', 'whatsapp', 'referral', 'import'], default: 'manual' })
  @IsOptional()
  @IsEnum(['manual', 'web', 'whatsapp', 'referral', 'import'])
  source?: string = 'manual';

  @ApiPropertyOptional({ description: 'Cliente que lo refirió' })
  @IsOptional()
  @IsMongoId()
  referredBy?: string;

  @ApiPropertyOptional({ description: 'Vendedor asignado' })
  @IsOptional()
  @IsMongoId()
  assignedTo?: string;

  @ApiPropertyOptional({ description: 'Notas del cliente' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Notas internas' })
  @IsOptional()
  @IsString()
  internalNotes?: string;
}

export class UpdateCustomerDto {
  @ApiPropertyOptional({ description: 'Nombre del cliente' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ description: 'Apellido del cliente' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ description: 'Nombre de la empresa' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({ description: 'Tipo de cliente', enum: ['individual', 'business', 'supplier', 'employee', 'admin', 'manager'] })
  @IsOptional()
  @IsEnum(['individual', 'business', 'supplier', 'employee', 'admin', 'manager'])
  customerType?: string;

  @ApiPropertyOptional({ description: 'Estado del cliente' })
  @IsOptional()
  @IsEnum(['active', 'inactive', 'suspended', 'blocked'])
  status?: string;

  @ApiPropertyOptional({ description: 'Direcciones del cliente', type: [CustomerAddressDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomerAddressDto)
  addresses?: CustomerAddressDto[];

  @ApiPropertyOptional({ description: 'Contactos del cliente', type: [CustomerContactDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomerContactDto)
  contacts?: CustomerContactDto[];

  @ApiPropertyOptional({ description: 'Razón de inactividad' })
  @IsOptional()
  @IsString()
  inactiveReason?: string;

  @ApiPropertyOptional({ description: 'Vendedor asignado' })
  @IsOptional()
  @IsMongoId()
  assignedTo?: string;

  @ApiPropertyOptional({ description: 'Notas del cliente' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Notas internas' })
  @IsOptional()
  @IsString()
  internalNotes?: string;
}

// ... (resto de las clases DTO sin cambios)