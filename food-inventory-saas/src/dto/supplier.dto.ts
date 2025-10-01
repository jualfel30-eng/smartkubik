import { IsString, IsOptional, IsEmail } from "class-validator";
import { SanitizeString } from "../decorators/sanitize.decorator";

export class CreateSupplierDto {
  @IsString()
  @SanitizeString()
  name: string; // "Nombre de la Empresa"

  @IsString()
  @SanitizeString()
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
}
