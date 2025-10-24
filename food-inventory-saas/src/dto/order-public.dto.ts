import {
  IsString,
  IsNotEmpty,
  IsEmail,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  IsMongoId,
  IsNumber,
  Min,
  IsObject,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { SanitizeString } from "../decorators/sanitize.decorator";

export class PublicShippingAddressDto {
  @ApiProperty({ description: "Calle o dirección principal" })
  @IsString()
  @IsNotEmpty()
  @SanitizeString()
  street: string;

  @ApiPropertyOptional({ description: "Ciudad" })
  @IsOptional()
  @IsString()
  @SanitizeString()
  city?: string;

  @ApiPropertyOptional({ description: "Estado o región" })
  @IsOptional()
  @IsString()
  @SanitizeString()
  state?: string;

  @ApiPropertyOptional({ description: "Código postal" })
  @IsOptional()
  @IsString()
  @SanitizeString()
  zipCode?: string;

  @ApiPropertyOptional({ description: "País", default: "Venezuela" })
  @IsOptional()
  @IsString()
  @SanitizeString()
  country?: string;
}

export class CreatePublicOrderItemDto {
  @ApiProperty({ description: "ID del producto" })
  @IsMongoId()
  productId: string;

  @ApiPropertyOptional({ description: "ID de la variante seleccionada" })
  @IsOptional()
  @IsMongoId()
  variantId?: string;

  @ApiPropertyOptional({ description: "SKU de la variante seleccionada" })
  @IsOptional()
  @IsString()
  @SanitizeString()
  variantSku?: string;

  @ApiProperty({ description: "Cantidad solicitada" })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiProperty({ description: "Precio unitario mostrado en el storefront" })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({
    description: "Atributos seleccionados por el cliente",
    type: Object,
  })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;
}

export class CreatePublicOrderDto {
  @ApiProperty({ description: "ID del tenant que recibe la orden" })
  @IsMongoId()
  tenantId: string;

  @ApiProperty({ description: "Nombre del cliente" })
  @IsString()
  @IsNotEmpty()
  @SanitizeString()
  customerName: string;

  @ApiProperty({ description: "Correo electrónico del cliente" })
  @IsEmail()
  customerEmail: string;

  @ApiPropertyOptional({ description: "Teléfono del cliente" })
  @IsOptional()
  @IsString()
  @SanitizeString()
  customerPhone?: string;

  @ApiProperty({
    description: "Productos incluidos en la orden",
    type: [CreatePublicOrderItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePublicOrderItemDto)
  items: CreatePublicOrderItemDto[];

  @ApiPropertyOptional({
    description: "Método de envío seleccionado",
    enum: ["pickup", "delivery", "envio_nacional"],
  })
  @IsOptional()
  @IsEnum(["pickup", "delivery", "envio_nacional"])
  shippingMethod?: "pickup" | "delivery" | "envio_nacional";

  @ApiPropertyOptional({
    description: "Dirección de envío",
    type: PublicShippingAddressDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PublicShippingAddressDto)
  shippingAddress?: PublicShippingAddressDto;

  @ApiPropertyOptional({
    description: "Costo de envío calculado en el storefront",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingCost?: number;

  @ApiPropertyOptional({
    description: "Notas adicionales proporcionadas por el cliente",
  })
  @IsOptional()
  @IsString()
  @SanitizeString()
  notes?: string;

  @ApiPropertyOptional({
    description:
      "Campo honeypot utilizado para detectar envíos automatizados (debe permanecer vacío)",
  })
  @IsOptional()
  @IsString()
  @SanitizeString()
  honeypot?: string;
}
