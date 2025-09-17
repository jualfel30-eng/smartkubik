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
  IsPhoneNumber,
  IsDateString
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// --- DTOs de Sub-documentos (sin cambios) ---
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

  @ApiPropertyOptional({ description: 'Es dirección por defecto', default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
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
}

// --- DTOs Principales (Corregidos y Restaurados) ---

// CORREGIDO
export class CreateCustomerDto {
  @ApiProperty({ description: 'Nombre del cliente' })
  @IsString()
  @IsNotEmpty()
  name: string;

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

  @ApiPropertyOptional({ description: 'Notas del cliente' })
  @IsOptional()
  @IsString()
  notes?: string;
}

// CORREGIDO
export class UpdateCustomerDto {
  @ApiPropertyOptional({ description: 'Nombre del cliente' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

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

  @ApiPropertyOptional({ description: 'Notas del cliente' })
  @IsOptional()
  @IsString()
  notes?: string;
}

// RESTAURADO
export class CustomerQueryDto {
  @ApiPropertyOptional({ description: 'Página', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Límite por página', default: 20 })
  @IsOptional()
  @Type(() => Number)
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
  @IsEnum(['individual', 'business', 'supplier', 'employee', 'admin', 'manager'])
  customerType?: string;

  @ApiPropertyOptional({ description: 'Estado del cliente' })
  @IsOptional()
  @IsEnum(['active', 'inactive', 'suspended', 'blocked'])
  status?: string;

  @ApiPropertyOptional({ description: 'Ordenar por', enum: ['name', 'createdAt', 'lastOrderDate', 'totalSpent'] })
  @IsOptional()
  @IsEnum(['name', 'createdAt', 'lastOrderDate', 'totalSpent'])
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Orden', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: string = 'desc';
}
