import {
  IsString,
  IsEmail,
  IsNotEmpty,
  MinLength,
  MaxLength,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  IsBoolean,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SanitizeString } from "../decorators/sanitize.decorator";

export class LoginDto {
  @ApiProperty({ description: "Email del usuario" })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: "Contraseña del usuario" })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ description: "IP del usuario" })
  @IsOptional()
  @IsString()
  ip?: string;
}

export class SwitchTenantDto {
  @ApiProperty({ description: "ID de la membresía a activar" })
  @IsString()
  @IsNotEmpty()
  membershipId: string;

  @ApiPropertyOptional({
    description: "Recordar esta membresía como predeterminada",
  })
  @IsOptional()
  @IsBoolean()
  rememberAsDefault?: boolean;
}

export class RegisterDto {
  @ApiProperty({ description: "Email del usuario" })
  @IsEmail()
  @IsNotEmpty()
  email: string; // Email no necesita sanitización

  @ApiProperty({ description: "Contraseña del usuario" })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(50)
  password: string; // Password no necesita sanitización (se hashea)

  @ApiProperty({ description: "Nombre del usuario" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @SanitizeString()
  firstName: string;

  @ApiProperty({ description: "Apellido del usuario" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @SanitizeString()
  lastName: string;

  @ApiPropertyOptional({ description: "Teléfono del usuario" })
  @IsOptional()
  @IsString()
  @SanitizeString()
  phone?: string;

  @ApiProperty({
    description: "Rol del usuario",
    enum: ["admin", "manager", "employee", "viewer"],
  })
  @IsEnum(["admin", "manager", "employee", "viewer"])
  role: string;
}

export class CreateUserDto {
  @ApiProperty({ description: "Email del usuario" })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: "Contraseña temporal del usuario" })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @ApiProperty({ description: "Nombre del usuario" })
  @IsString()
  @IsNotEmpty()
  @SanitizeString()
  firstName: string;

  @ApiProperty({ description: "Apellido del usuario" })
  @IsString()
  @IsNotEmpty()
  @SanitizeString()
  lastName: string;

  @ApiPropertyOptional({ description: "Teléfono del usuario" })
  @IsOptional()
  @IsString()
  @SanitizeString()
  phone?: string;

  @ApiProperty({
    description: "Rol del usuario",
    enum: ["admin", "manager", "employee", "viewer"],
  })
  @IsEnum(["admin", "manager", "employee", "viewer"])
  role: string;

  @ApiPropertyOptional({ description: "Permisos específicos del usuario" })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserPermissionDto)
  permissions?: UserPermissionDto[];

  @ApiPropertyOptional({ description: "Usuario activo", default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UserPermissionDto {
  @ApiProperty({
    description: "Módulo del sistema",
    enum: [
      "products",
      "inventory",
      "orders",
      "customers",
      "reports",
      "settings",
    ],
  })
  @IsEnum([
    "products",
    "inventory",
    "orders",
    "customers",
    "reports",
    "settings",
  ])
  module: string;

  @ApiProperty({
    description: "Acciones permitidas",
    enum: ["create", "read", "update", "delete", "export", "import"],
  })
  @IsArray()
  @IsEnum(["create", "read", "update", "delete", "export", "import"], {
    each: true,
  })
  actions: string[];
}

export class UpdateUserDto {
  @ApiPropertyOptional({ description: "Nombre del usuario" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @SanitizeString()
  firstName?: string;

  @ApiPropertyOptional({ description: "Apellido del usuario" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @SanitizeString()
  lastName?: string;

  @ApiPropertyOptional({ description: "Teléfono del usuario" })
  @IsOptional()
  @IsString()
  @SanitizeString()
  phone?: string;

  @ApiPropertyOptional({ description: "Rol del usuario" })
  @IsOptional()
  @IsEnum(["admin", "manager", "employee", "viewer"])
  role?: string;

  @ApiPropertyOptional({ description: "Permisos del usuario" })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserPermissionDto)
  permissions?: UserPermissionDto[];

  @ApiPropertyOptional({ description: "Usuario activo" })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: "Avatar del usuario" })
  @IsOptional()
  @IsString()
  @SanitizeString()
  avatar?: string;
}

export class ChangePasswordDto {
  @ApiProperty({ description: "Contraseña actual" })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ description: "Nueva contraseña" })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(50)
  newPassword: string;

  @ApiProperty({ description: "Confirmación de la nueva contraseña" })
  @IsString()
  @IsNotEmpty()
  confirmPassword: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ description: "Email del usuario" })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: "Token de reseteo" })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ description: "Nueva contraseña" })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(50)
  newPassword: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: "Refresh token" })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class VerifyEmailDto {
  @ApiProperty({ description: "Token de verificación" })
  @IsString()
  @IsNotEmpty()
  token: string;
}
