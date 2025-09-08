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
  IsObject,
  IsDateString,
  IsDate,
  IsEmail,
  IsPhoneNumber,
  ArrayMinSize
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderItemDto {
  @ApiProperty({ description: 'SKU del producto' })
  @IsString()
  @IsNotEmpty()
  productSku: string;

  @ApiPropertyOptional({ description: 'SKU de la variante' })
  @IsOptional()
  @IsString()
  variantSku?: string;

  @ApiProperty({ description: 'Cantidad solicitada' })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiProperty({ description: 'Precio unitario sin impuestos' })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({ description: 'Notas del item' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class OrderPaymentDto {
  @ApiProperty({ description: 'Método de pago', enum: ['cash', 'card', 'transfer', 'usd_cash', 'usd_transfer', 'mixed'] })
  @IsEnum(['cash', 'card', 'transfer', 'usd_cash', 'usd_transfer', 'mixed'])
  method: string;

  @ApiProperty({ description: 'Moneda', enum: ['VES', 'USD'] })
  @IsEnum(['VES', 'USD'])
  currency: string;

  @ApiProperty({ description: 'Monto del pago' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ description: 'Tasa de cambio (si es USD)' })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  exchangeRate?: number;

  @ApiPropertyOptional({ description: 'Referencia de transferencia o tarjeta' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ description: 'Banco' })
  @IsOptional()
  @IsString()
  bank?: string;
}

export class OrderShippingDto {
  @ApiProperty({ description: 'Método de envío', enum: ['pickup', 'delivery', 'courier'] })
  @IsEnum(['pickup', 'delivery', 'courier'])
  method: string;

  @ApiPropertyOptional({ description: 'Dirección de envío' })
  @IsOptional()
  @IsObject()
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode?: string;
    country: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };

  @ApiPropertyOptional({ description: 'Fecha programada de entrega' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  scheduledDate?: Date;

  @ApiPropertyOptional({ description: 'Costo de envío' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost?: number;

  @ApiPropertyOptional({ description: 'Compañía de courier' })
  @IsOptional()
  @IsString()
  courierCompany?: string;

  @ApiPropertyOptional({ description: 'Notas de envío' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateOrderDto {
  @ApiProperty({ description: 'ID del cliente' })
  @IsMongoId()
  customerId: string;

  @ApiProperty({ description: 'Items de la orden', type: [CreateOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiPropertyOptional({ description: 'Información de pago', type: [OrderPaymentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderPaymentDto)
  payments?: OrderPaymentDto[];

  @ApiPropertyOptional({ description: 'Información de envío', type: OrderShippingDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrderShippingDto)
  shipping?: OrderShippingDto;

  @ApiPropertyOptional({ description: 'Monto de descuento', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number = 0;

  @ApiPropertyOptional({ description: 'Canal de la orden', enum: ['online', 'phone', 'whatsapp', 'in_store'], default: 'online' })
  @IsOptional()
  @IsEnum(['online', 'phone', 'whatsapp', 'in_store'])
  channel?: string = 'online';

  @ApiPropertyOptional({ description: 'Tipo de orden', enum: ['retail', 'wholesale', 'b2b'], default: 'retail' })
  @IsOptional()
  @IsEnum(['retail', 'wholesale', 'b2b'])
  type?: string = 'retail';

  @ApiPropertyOptional({ description: 'Información fiscal' })
  @IsOptional()
  @IsObject()
  taxInfo?: {
    customerTaxId?: string;
    customerTaxType?: string;
    invoiceRequired: boolean;
  };

  @ApiPropertyOptional({ description: 'Notas de la orden' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Notas internas' })
  @IsOptional()
  @IsString()
  internalNotes?: string;

  @ApiPropertyOptional({ description: 'Reservar inventario automáticamente', default: true })
  @IsOptional()
  @IsBoolean()
  autoReserve?: boolean = true;
}

export class UpdateOrderDto {
  @ApiPropertyOptional({ description: 'Estado de la orden', enum: ['draft', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'] })
  @IsOptional()
  @IsEnum(['draft', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'])
  status?: string;

  @ApiPropertyOptional({ description: 'Estado de pago', enum: ['pending', 'partial', 'paid', 'overpaid', 'refunded'] })
  @IsOptional()
  @IsEnum(['pending', 'partial', 'paid', 'overpaid', 'refunded'])
  paymentStatus?: string;

  @ApiPropertyOptional({ description: 'Información de envío actualizada', type: OrderShippingDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrderShippingDto)
  shipping?: OrderShippingDto;

  @ApiPropertyOptional({ description: 'Usuario asignado' })
  @IsOptional()
  @IsMongoId()
  assignedTo?: string;

  @ApiPropertyOptional({ description: 'Notas de la orden' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Notas internas' })
  @IsOptional()
  @IsString()
  internalNotes?: string;

  @ApiPropertyOptional({ description: 'Número de tracking' })
  @IsOptional()
  @IsString()
  trackingNumber?: string;
}

export class AddOrderPaymentDto {
  @ApiProperty({ description: 'ID de la orden' })
  @IsMongoId()
  orderId: string;

  @ApiProperty({ description: 'Información del pago', type: OrderPaymentDto })
  @ValidateNested()
  @Type(() => OrderPaymentDto)
  payment: OrderPaymentDto;
}

export class ConfirmOrderPaymentDto {
  @ApiProperty({ description: 'ID de la orden' })
  @IsMongoId()
  orderId: string;

  @ApiProperty({ description: 'Índice del pago en el array' })
  @IsNumber()
  @Min(0)
  paymentIndex: number;

  @ApiPropertyOptional({ description: 'Fecha de confirmación' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  confirmedAt?: Date;
}

export class OrderQueryDto {
  @ApiPropertyOptional({ description: 'Página', default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Límite por página', default: 20 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Término de búsqueda (número de orden, cliente)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Estado de la orden' })
  @IsOptional()
  @IsEnum(['draft', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'])
  status?: string;

  @ApiPropertyOptional({ description: 'Estado de pago' })
  @IsOptional()
  @IsEnum(['pending', 'partial', 'paid', 'overpaid', 'refunded'])
  paymentStatus?: string;

  @ApiPropertyOptional({ description: 'Canal de la orden' })
  @IsOptional()
  @IsEnum(['online', 'phone', 'whatsapp', 'in_store'])
  channel?: string;

  @ApiPropertyOptional({ description: 'Tipo de orden' })
  @IsOptional()
  @IsEnum(['retail', 'wholesale', 'b2b'])
  type?: string;

  @ApiPropertyOptional({ description: 'ID del cliente' })
  @IsOptional()
  @IsMongoId()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Usuario asignado' })
  @IsOptional()
  @IsMongoId()
  assignedTo?: string;

  @ApiPropertyOptional({ description: 'Fecha desde (ISO string)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Fecha hasta (ISO string)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Monto mínimo' })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(0)
  minAmount?: number;

  @ApiPropertyOptional({ description: 'Monto máximo' })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(0)
  maxAmount?: number;

  @ApiPropertyOptional({ description: 'Ordenar por', enum: ['orderNumber', 'createdAt', 'totalAmount', 'customerName'] })
  @IsOptional()
  @IsEnum(['orderNumber', 'createdAt', 'totalAmount', 'customerName'])
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Orden', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: string = 'desc';
}

export class OrderCalculationDto {
  @ApiProperty({ description: 'Items para calcular', type: [CreateOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiPropertyOptional({ description: 'ID del cliente (para precios especiales)' })
  @IsOptional()
  @IsMongoId()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Método de pago principal' })
  @IsOptional()
  @IsEnum(['cash', 'card', 'transfer', 'usd_cash', 'usd_transfer'])
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Monto de descuento' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @ApiPropertyOptional({ description: 'Costo de envío' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingCost?: number;
}

