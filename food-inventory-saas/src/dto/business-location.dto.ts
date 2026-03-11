import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export enum BusinessLocationTypeDto {
  WAREHOUSE = "warehouse",
  POINT_OF_SALE = "point_of_sale",
  MIXED = "mixed",
}

class CoordinatesDto {
  @IsOptional()
  lat?: number;

  @IsOptional()
  lng?: number;
}

class AddressDto {
  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  zipCode?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CoordinatesDto)
  coordinates?: CoordinatesDto;
}

export class CreateBusinessLocationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  code: string;

  @IsEnum(BusinessLocationTypeDto)
  @IsNotEmpty()
  type: BusinessLocationTypeDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsMongoId()
  manager?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateBusinessLocationDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEnum(BusinessLocationTypeDto)
  type?: BusinessLocationTypeDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsMongoId()
  manager?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class BusinessLocationFilterDto {
  @IsOptional()
  @IsEnum(BusinessLocationTypeDto)
  type?: BusinessLocationTypeDto;

  @IsOptional()
  @IsString()
  isActive?: string;
}
