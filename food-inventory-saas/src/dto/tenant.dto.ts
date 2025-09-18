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
} from "class-validator";
import { Type } from "class-transformer";

class AddressDto {
  @ApiProperty({ example: "Calle Principal 123" })
  @IsString()
  @IsOptional()
  street: string;

  @ApiProperty({ example: "Caracas" })
  @IsString()
  @IsOptional()
  city: string;

  @ApiProperty({ example: "Distrito Capital" })
  @IsString()
  @IsOptional()
  state: string;

  @ApiProperty({ example: "1010" })
  @IsString()
  @IsOptional()
  zipCode?: string;

  @ApiProperty({ example: "Venezuela" })
  @IsString()
  @IsOptional()
  country: string;
}

class ContactInfoDto {
  @ApiProperty({ example: "contacto@juantacos.com" })
  @IsEmail()
  @IsOptional()
  email: string;

  @ApiProperty({ example: "+584121234567" })
  @IsPhoneNumber(undefined)
  @IsOptional()
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
  rif: string;

  @ApiProperty({ example: "Juan Tacos C.A." })
  @IsString()
  @IsOptional()
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
}

export class UpdateTenantSettingsDto {
  @ApiProperty({ example: "Juan Tacos" })
  @IsString()
  @IsOptional()
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
  logo?: string;

  @ApiProperty({ example: "https://juantacos.com" })
  @IsString()
  @IsOptional()
  website?: string;

  @ApiProperty({ example: "America/Caracas" })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiProperty({ type: OperationalSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => OperationalSettingsDto)
  settings?: OperationalSettingsDto;
}

export class InviteUserDto {
  @ApiProperty({ example: "john.doe@example.com" })
  @IsEmail()
  email: string;

  @ApiProperty({ example: "John" })
  @IsString()
  firstName: string;

  @ApiProperty({ example: "Doe" })
  @IsString()
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
