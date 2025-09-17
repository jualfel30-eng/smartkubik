import { IsString, IsOptional, IsEmail } from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  name: string; // "Nombre de la Empresa"

  @IsString()
  rif: string;

  @IsString()
  contactName: string; // "Nombre del vendedor"

  @IsString()
  @IsOptional()
  contactPhone?: string; // "Teléfono"

  @IsEmail()
  @IsOptional()
  contactEmail?: string; // "Correo"
}
