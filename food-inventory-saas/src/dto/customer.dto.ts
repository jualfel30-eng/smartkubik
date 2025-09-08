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

  @ApiProperty({ description: 'Tipo de cliente', enum: ['individual', 'business'] })
  @IsEnum(['individual', 'business'])
  customerType: string;

  @ApiPropertyOptional({ description: 'Información fiscal' })
  @IsOptional()
  @IsObject()
  taxInfo?: {
    taxId?: string;
    taxType?: string;
    taxName?: string;
    isRetentionAgent?: boolean;
    retentionPercentage?: number;
  };

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

  @ApiPropertyOptional({ description: 'Tipo de cliente' })
  @IsOptional()
  @IsEnum(['individual', 'business'])
  customerType?: string;

  @ApiPropertyOptional({ description: 'Estado del cliente' })
  @IsOptional()
  @IsEnum(['active', 'inactive', 'suspended', 'blocked'])
  status?: string;

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

export class CustomerInteractionDto {
  @ApiProperty({ description: 'Tipo de interacción', enum: ['call', 'email', 'whatsapp', 'visit', 'complaint', 'compliment'] })
  @IsEnum(['call', 'email', 'whatsapp', 'visit', 'complaint', 'compliment'])
  type: string;

  @ApiProperty({ description: 'Canal de comunicación', enum: ['phone', 'email', 'whatsapp', 'in_person', 'web'] })
  @IsEnum(['phone', 'email', 'whatsapp', 'in_person', 'web'])
  channel: string;

  @ApiProperty({ description: 'Asunto de la interacción' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiPropertyOptional({ description: 'Descripción detallada' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Estado de la interacción', enum: ['pending', 'in_progress', 'completed', 'cancelled'], default: 'completed' })
  @IsOptional()
  @IsEnum(['pending', 'in_progress', 'completed', 'cancelled'])
  status?: string = 'completed';

  @ApiPropertyOptional({ description: 'Fecha de seguimiento' })
  @IsOptional()
  @Type(() => Date)
  followUpDate?: Date;
}

export class CustomerQueryDto {
  @ApiPropertyOptional({ description: 'Página', default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Límite por página', default: 20 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Término de búsqueda' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Tipo de cliente' })
  @IsOptional()
  @IsEnum(['individual', 'business'])
  customerType?: string;

  @ApiPropertyOptional({ description: 'Estado del cliente' })
  @IsOptional()
  @IsEnum(['active', 'inactive', 'suspended', 'blocked'])
  status?: string;

  @ApiPropertyOptional({ description: 'Vendedor asignado' })
  @IsOptional()
  @IsMongoId()
  assignedTo?: string;

  @ApiPropertyOptional({ description: 'Segmento del cliente' })
  @IsOptional()
  @IsString()
  segment?: string;

  @ApiPropertyOptional({ description: 'Fuente de registro' })
  @IsOptional()
  @IsEnum(['manual', 'web', 'whatsapp', 'referral', 'import'])
  source?: string;

  @ApiPropertyOptional({ description: 'Ordenar por', enum: ['name', 'createdAt', 'lastOrderDate', 'totalSpent'] })
  @IsOptional()
  @IsEnum(['name', 'createdAt', 'lastOrderDate', 'totalSpent'])
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Orden', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: string = 'desc';
}

