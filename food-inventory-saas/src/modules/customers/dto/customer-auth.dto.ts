import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsBoolean,
} from "class-validator";
import { SanitizeString } from "../../../decorators/sanitize.decorator";

export class RegisterCustomerDto {
  @IsString()
  @SanitizeString()
  name: string;

  @IsEmail()
  @SanitizeString()
  email: string;

  @IsString()
  @MinLength(6, { message: "La contraseña debe tener al menos 6 caracteres" })
  password: string;

  @IsOptional()
  @IsString()
  @SanitizeString()
  phone?: string;

  @IsOptional()
  @IsString()
  @SanitizeString()
  whatsappNumber?: string;

  @IsOptional()
  @IsBoolean()
  marketingOptIn?: boolean;

  tenantId: string; // Set by middleware
}

export class LoginCustomerDto {
  @IsEmail()
  @SanitizeString()
  email: string;

  @IsString()
  password: string;

  tenantId: string; // Set by middleware
}

export class UpdateCustomerProfileDto {
  @IsOptional()
  @IsString()
  @SanitizeString()
  name?: string;

  @IsOptional()
  @IsString()
  @SanitizeString()
  phone?: string;

  @IsOptional()
  @IsString()
  @SanitizeString()
  whatsappNumber?: string;

  @IsOptional()
  @IsBoolean()
  marketingOptIn?: boolean;
}

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(6, { message: "La contraseña debe tener al menos 6 caracteres" })
  newPassword: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  @SanitizeString()
  email: string;

  tenantId: string; // Set by middleware
}

export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(6, { message: "La contraseña debe tener al menos 6 caracteres" })
  newPassword: string;
}
