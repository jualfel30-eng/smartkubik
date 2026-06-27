import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsMongoId,
  MaxLength,
} from "class-validator";

/**
 * Lead capturado desde un storefront público (form de contacto).
 * No requiere auth: el tenant se identifica por tenantId en el body.
 */
export class CreatePublicLeadDto {
  @IsMongoId()
  @IsNotEmpty()
  tenantId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  phone: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  serviceInterest?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}
