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
  IsDate,
  ArrayMinSize,
  IsObject,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SanitizeString, SanitizeText } from "../decorators/sanitize.decorator";

// Nueva clase para validar la dirección de envío
export class ShippingAddressDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @SanitizeString()
  street: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @SanitizeString()
  city: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  zipCode?: string;
}

export class CreateOrderItemDto {
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
  variantSku?: string;

  @ApiProperty({ description: "Cantidad solicitada" })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiPropertyOptional({
    description: "Unidad de venta seleccionada (si aplica)",
  })
  @IsOptional()
  @IsString()
  selectedUnit?: string; // Abbreviation de la unidad (ej: "kg", "g", "lb")

  @ApiPropertyOptional({
    description: "Factor de conversión usado (calculado automáticamente)",
  })
  @IsOptional()
  @IsNumber()
  conversionFactor?: number;

  @ApiPropertyOptional({
    description: "Atributos específicos del item",
    type: Object,
  })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;
}

export class RegisterPaymentDto {
  @ApiProperty({ description: "Monto del pago en USD" })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ description: "Monto del pago en VES" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amountVes?: number;

  @ApiPropertyOptional({ description: "Tasa de cambio usada" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  exchangeRate?: number;

  @ApiPropertyOptional({ description: "Moneda del pago (USD o VES)" })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ description: "Método de pago" })
  @IsString()
  @IsNotEmpty()
  method: string;

  @ApiProperty({ description: "Fecha del pago" })
  @IsDate()
  @Type(() => Date)
  date: Date;

  @ApiPropertyOptional({ description: "Referencia del pago" })
  @IsOptional()
  @IsString()
  @SanitizeString()
  reference?: string;

  @ApiPropertyOptional({ description: "Clave de idempotencia opcional" })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @ApiPropertyOptional({ description: "IGTF aplicado en USD" })
  @IsOptional()
  @IsNumber()
  igtf?: number;

  @ApiPropertyOptional({
    description: "ID de la cuenta bancaria (para pagos confirmados)",
  })
  @IsOptional()
  @IsMongoId()
  bankAccountId?: string;

  @ApiPropertyOptional({ description: "Indica si el pago está confirmado" })
  @IsOptional()
  @IsBoolean()
  isConfirmed?: boolean;
}

export class CreateOrderDto {
  @ApiPropertyOptional({ description: "ID del cliente existente" })
  @IsOptional()
  @IsMongoId()
  customerId?: string;

  @ApiPropertyOptional({ description: "Nombre del cliente" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @SanitizeString()
  customerName?: string;

  @ApiPropertyOptional({ description: "RIF o C.I. del cliente para creación" })
  @IsOptional()
  @IsString()
  @SanitizeString()
  customerRif?: string;

  @ApiPropertyOptional({ description: "Tipo de documento fiscal (V, E, J, G)" })
  @IsOptional()
  @IsEnum(["V", "E", "J", "G"])
  taxType?: string;

  @ApiProperty({ description: "Items de la orden", type: [CreateOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiPropertyOptional({
    description: "Método de entrega (pickup, delivery, envio_nacional)",
  })
  @IsOptional()
  @IsEnum(["pickup", "delivery", "envio_nacional"])
  deliveryMethod?: string;

  @ApiPropertyOptional({ description: "Dirección de envío para la orden" })
  @IsOptional()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress?: ShippingAddressDto;

  @ApiPropertyOptional({
    description:
      "Ubicación del cliente para delivery (se guardará en el perfil)",
  })
  @IsOptional()
  @IsObject()
  customerLocation?: {
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    placeId?: string;
    formattedAddress?: string;
  };

  @ApiPropertyOptional({ description: "Subtotal de la orden (sin impuestos)" })
  @IsOptional()
  @IsNumber()
  subtotal?: number;

  @ApiPropertyOptional({ description: "Monto total de IVA de la orden" })
  @IsOptional()
  @IsNumber()
  ivaTotal?: number;

  @ApiPropertyOptional({ description: "Monto total de IGTF de la orden" })
  @IsOptional()
  @IsNumber()
  igtfTotal?: number;

  @ApiPropertyOptional({ description: "Costo de envío" })
  @IsOptional()
  @IsNumber()
  shippingCost?: number;

  @ApiPropertyOptional({ description: "Monto de descuento" })
  @IsOptional()
  @IsNumber()
  discountAmount?: number;

  @ApiPropertyOptional({ description: "Código de cupón a aplicar" })
  @IsOptional()
  @IsString()
  @SanitizeString()
  couponCode?: string;

  @ApiPropertyOptional({ description: "Monto total final de la orden" })
  @IsOptional()
  @IsNumber()
  totalAmount?: number;

  @ApiPropertyOptional({
    description: "Canal de la orden",
    enum: ["online", "phone", "whatsapp", "in_store", "in_person", "web"],
    default: "in_person",
  })
  @IsOptional()
  @IsEnum(["online", "phone", "whatsapp", "in_store", "in_person", "web"])
  channel?: string = "in_person";

  @ApiPropertyOptional({
    description: "Tipo de orden",
    enum: ["retail", "wholesale", "b2b"],
    default: "retail",
  })
  @IsOptional()
  @IsEnum(["retail", "wholesale", "b2b"])
  type?: string = "retail";

  @ApiPropertyOptional({ description: "Notas de la orden" })
  @IsOptional()
  @IsString()
  @SanitizeText()
  notes?: string;

  @ApiPropertyOptional({
    description: "Reservar inventario automáticamente",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  autoReserve?: boolean = true;

  @ApiPropertyOptional({
    description: "Pagos de la orden",
    type: [RegisterPaymentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegisterPaymentDto)
  payments?: RegisterPaymentDto[];
}

export class UpdateOrderDto {
  @ApiPropertyOptional({
    description: "Estado de la orden",
    enum: [
      "draft",
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
    ],
  })
  @IsOptional()
  @IsEnum([
    "draft",
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ])
  status?: string;

  @ApiPropertyOptional({
    description: "Estado de pago",
    enum: ["pending", "partial", "paid", "overpaid", "refunded"],
  })
  @IsOptional()
  @IsEnum(["pending", "partial", "paid", "overpaid", "refunded"])
  paymentStatus?: string;

  @ApiPropertyOptional({ description: "Usuario asignado" })
  @IsOptional()
  @IsMongoId()
  assignedTo?: string;

  @ApiPropertyOptional({ description: "Notas de la orden" })
  @IsOptional()
  @IsString()
  @SanitizeText()
  notes?: string;

  @ApiPropertyOptional({ description: "Notas internas" })
  @IsOptional()
  @IsString()
  @SanitizeText()
  internalNotes?: string;
}

export class OrderPaymentDto {
  @ApiProperty({ description: "Método de pago" })
  @IsString()
  @IsNotEmpty()
  method: string;

  @ApiProperty({ description: "Moneda", enum: ["VES", "USD"] })
  @IsEnum(["VES", "USD"])
  currency: string;

  @ApiProperty({ description: "Monto del pago" })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ description: "Tasa de cambio (si es USD)" })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  exchangeRate?: number;

  @ApiPropertyOptional({ description: "Referencia de transferencia o tarjeta" })
  @IsOptional()
  @IsString()
  @SanitizeString()
  reference?: string;

  @ApiPropertyOptional({ description: "Banco" })
  @IsOptional()
  @IsString()
  bank?: string;
}

export class AddOrderPaymentDto {
  @ApiProperty({ description: "ID de la orden" })
  @IsMongoId()
  orderId: string;

  @ApiProperty({ description: "Información del pago", type: OrderPaymentDto })
  @ValidateNested()
  @Type(() => OrderPaymentDto)
  payment: OrderPaymentDto;
}

export class ConfirmOrderPaymentDto {
  @ApiProperty({ description: "ID de la orden" })
  @IsMongoId()
  orderId: string;

  @ApiProperty({ description: "Índice del pago en el array" })
  @IsNumber()
  @Min(0)
  paymentIndex: number;

  @ApiPropertyOptional({ description: "Fecha de confirmación" })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  confirmedAt?: Date;
}

export class OrderQueryDto {
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

  @ApiPropertyOptional({
    description: "Término de búsqueda (número de orden, cliente)",
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: "Estado de la orden" })
  @IsOptional()
  @IsEnum([
    "draft",
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ])
  status?: string;

  @ApiPropertyOptional({ description: "ID del cliente" })
  @IsOptional()
  @IsMongoId()
  customerId?: string;

  @ApiPropertyOptional({
    description: "Campo para ordenar",
    default: "createdAt",
  })
  @IsOptional()
  @IsString()
  sortBy?: string = "createdAt";

  @ApiPropertyOptional({
    description: "Orden de clasificación",
    enum: ["asc", "desc"],
    default: "desc",
  })
  @IsOptional()
  @IsEnum(["asc", "desc"])
  sortOrder?: "asc" | "desc" = "desc";

  @ApiPropertyOptional({
    description: "Clave de atributo del item para filtrar (ej: size, color)",
  })
  @IsOptional()
  @IsString()
  itemAttributeKey?: string;

  @ApiPropertyOptional({
    description: "Valor del atributo del item para filtrar",
  })
  @IsOptional()
  @IsString()
  itemAttributeValue?: string;
}

export class OrderCalculationDto {
  @ApiProperty({
    description: "Items para calcular",
    type: [CreateOrderItemDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiPropertyOptional({
    description: "Pagos para calcular IGTF",
    type: [RegisterPaymentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RegisterPaymentDto)
  payments?: RegisterPaymentDto[];

  @ApiPropertyOptional({ description: "Monto de descuento", default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number = 0;

  @ApiPropertyOptional({ description: "Costo de envío", default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingCost?: number = 0;
}

export class BulkRegisterPaymentsDto {
  @ApiProperty({ type: [RegisterPaymentDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RegisterPaymentDto)
  payments: RegisterPaymentDto[];
}
