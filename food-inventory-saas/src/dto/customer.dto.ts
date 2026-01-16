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
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SanitizeString, SanitizeText } from "../decorators/sanitize.decorator";

// --- Custom Validator for Supplier Contacts ---
@ValidatorConstraint({ name: "isContactMandatoryForSupplier", async: false })
export class IsContactMandatoryForSupplier
  implements ValidatorConstraintInterface {
  validate(contacts: any[], args: ValidationArguments) {
    const object = args.object as CreateCustomerDto;
    if (object.customerType === "supplier") {
      // For suppliers, contacts array must exist and have at least one valid entry.
      return (
        Array.isArray(contacts) &&
        contacts.length > 0 &&
        contacts.some((c) => c.value && c.value.trim() !== "")
      );
    }
    return true; // For other customer types, this validation is not enforced.
  }

  defaultMessage(_args: ValidationArguments) {
    return "Debe proporcionar al menos un método de contacto (teléfono o email) para los proveedores.";
  }
}

// --- DTOs de Sub-documentos ---
export class CustomerTaxInfoDto {
  @ApiProperty({
    description: "Número de Identificación Fiscal (Cédula o RIF)",
  })
  @IsString()
  @IsNotEmpty()
  @SanitizeString()
  taxId: string;

  @ApiProperty({
    description: "Tipo de Identificación",
    enum: ["V", "E", "J", "G"],
  })
  @IsEnum(["V", "E", "J", "G"])
  taxType: string;

  @ApiPropertyOptional({ description: "Nombre fiscal o razón social" })
  @IsOptional()
  @IsString()
  @SanitizeString()
  taxName?: string;
}

export class CustomerAddressDto {
  @ApiProperty({
    description: "Tipo de dirección",
    enum: ["billing", "shipping", "both"],
  })
  @IsEnum(["billing", "shipping", "both"])
  type: string;

  @ApiPropertyOptional({ description: "Calle" })
  @IsOptional()
  @IsString()
  @SanitizeString()
  street?: string;

  @ApiPropertyOptional({ description: "Ciudad" })
  @IsOptional()
  @IsString()
  @SanitizeString()
  city?: string;

  @ApiPropertyOptional({ description: "Municipio" })
  @IsOptional()
  @IsString()
  @SanitizeString()
  municipality?: string;

  @ApiPropertyOptional({ description: "Estado" })
  @IsOptional()
  @IsString()
  @SanitizeString()
  state?: string;

  @ApiPropertyOptional({
    description: "Es dirección por defecto",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class CustomerContactDto {
  @ApiProperty({
    description: "Tipo de contacto",
    enum: ["phone", "email", "whatsapp"],
  })
  @IsEnum(["phone", "email", "whatsapp"])
  type: string;

  @ApiProperty({ description: "Valor del contacto" })
  @IsString()
  @IsNotEmpty()
  @SanitizeString()
  value: string;

  @ApiPropertyOptional({ description: "Es contacto principal", default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class CustomerCreditInfoDto {
  @ApiPropertyOptional({ description: "Límite de crédito", default: 0 })
  @IsOptional()
  @IsNumber()
  creditLimit?: number;

  @ApiPropertyOptional({ description: "Crédito disponible", default: 0 })
  @IsOptional()
  @IsNumber()
  availableCredit?: number;

  @ApiPropertyOptional({
    description: "Condiciones de pago (días)",
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  paymentTerms?: number;

  @ApiPropertyOptional({
    description: "Acepta crédito",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  acceptsCredit?: boolean;
}

// --- DTOs Principales ---

export class CreateCustomerDto {
  @ApiProperty({ description: "Nombre del cliente o contacto" })
  @IsString()
  @IsNotEmpty()
  @SanitizeString()
  name: string;

  @ApiPropertyOptional({ description: "Nombre de la empresa (si aplica)" })
  @IsOptional()
  @IsString()
  @SanitizeString()
  companyName?: string;

  @ApiProperty({
    description: "Tipo de cliente",
    enum: [
      "individual",
      "business",
      "supplier",
      "employee",
      "admin",
      "manager",
      "Repartidor",
      "Cajero",
      "Mesonero",
    ],
  })
  @IsEnum([
    "individual",
    "business",
    "supplier",
    "employee",
    "admin",
    "manager",
    "Repartidor",
    "Cajero",
    "Mesonero",
  ])
  customerType: string;

  @ApiPropertyOptional({
    description: "Información fiscal",
    type: CustomerTaxInfoDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CustomerTaxInfoDto)
  taxInfo?: CustomerTaxInfoDto;

  @ApiPropertyOptional({
    description: "Direcciones del cliente",
    type: [CustomerAddressDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomerAddressDto)
  addresses?: CustomerAddressDto[];

  @ApiPropertyOptional({
    description: "Contactos del cliente",
    type: [CustomerContactDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomerContactDto)
  @Validate(IsContactMandatoryForSupplier)
  contacts?: CustomerContactDto[];

  @ApiPropertyOptional({
    description: "Información de crédito",
    type: CustomerCreditInfoDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CustomerCreditInfoDto)
  creditInfo?: CustomerCreditInfoDto;

  @ApiPropertyOptional({ description: "Notas del cliente" })
  @IsOptional()
  @IsString()
  @SanitizeText()
  notes?: string;
}

export class UpdateCustomerDto {
  @ApiPropertyOptional({ description: "Nombre del cliente" })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: "Nombre de la empresa" })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({
    description: "Tipo de cliente",
    enum: [
      "individual",
      "business",
      "supplier",
      "employee",
      "admin",
      "manager",
      "Repartidor",
      "Cajero",
      "Mesonero",
      "all",
    ],
  })
  @IsOptional()
  @IsEnum([
    "individual",
    "business",
    "supplier",
    "employee",
    "admin",
    "manager",
    "Repartidor",
    "Cajero",
    "Mesonero",
    "all",
  ])
  customerType?: string;

  @ApiPropertyOptional({ description: "Estado del cliente" })
  @IsOptional()
  @IsEnum(["active", "inactive", "suspended", "blocked"])
  status?: string;

  @ApiPropertyOptional({ description: "Nivel del cliente (tier)" })
  @IsOptional()
  @IsString()
  tier?: string;

  @ApiPropertyOptional({
    description: "Direcciones del cliente",
    type: [CustomerAddressDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomerAddressDto)
  addresses?: CustomerAddressDto[];

  @ApiPropertyOptional({
    description: "Contactos del cliente",
    type: [CustomerContactDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomerContactDto)
  contacts?: CustomerContactDto[];

  @ApiPropertyOptional({ description: "Notas del cliente" })
  @IsOptional()
  @IsString()
  @SanitizeText()
  notes?: string;

  @ApiPropertyOptional({
    description: "Información fiscal",
    type: CustomerTaxInfoDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CustomerTaxInfoDto)
  taxInfo?: CustomerTaxInfoDto;
}

export class CustomerQueryDto {
  @ApiPropertyOptional({ description: "Página", default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: "Límite por página", default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: "Término de búsqueda" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: "Tipo de cliente",
    enum: [
      "individual",
      "business",
      "supplier",
      "employee",
      "admin",
      "manager",
      "Repartidor",
      "Cajero",
      "Mesonero",
    ],
  })
  @IsOptional()
  @IsEnum([
    "individual",
    "business",
    "supplier",
    "employee",
    "admin",
    "manager",
    "Repartidor",
    "Cajero",
    "Mesonero",
  ])
  customerType?: string;

  @ApiPropertyOptional({ description: "Estado del cliente" })
  @IsOptional()
  @IsEnum(["active", "inactive", "suspended", "blocked"])
  status?: string;

  @ApiPropertyOptional({ description: "ID de usuario asignado" })
  @IsOptional()
  @IsMongoId()
  assignedTo?: string;

  @ApiPropertyOptional({
    description: "Ordenar por",
    enum: ["name", "createdAt", "lastOrderDate", "totalSpent"],
  })
  @IsOptional()
  @IsEnum(["name", "createdAt", "lastOrderDate", "totalSpent"])
  sortBy?: string = "createdAt";

  @ApiPropertyOptional({ description: "Orden", enum: ["asc", "desc"] })
  @IsOptional()
  @IsEnum(["asc", "desc"])
  sortOrder?: string = "desc";
}
