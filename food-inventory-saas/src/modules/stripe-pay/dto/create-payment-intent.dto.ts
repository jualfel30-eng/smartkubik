import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from "class-validator";

export class CreatePaymentIntentDto {
  @ApiProperty({ description: "Tenant ID dueño de la orden" })
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty({ description: "ID de la orden a cobrar" })
  @IsMongoId()
  orderId: string;

  @ApiPropertyOptional({ description: "Email del comprador (para recibo Stripe)" })
  @IsOptional()
  @IsEmail()
  customerEmail?: string;

  @ApiPropertyOptional({ description: "Nombre del comprador" })
  @IsOptional()
  @IsString()
  customerName?: string;
}
