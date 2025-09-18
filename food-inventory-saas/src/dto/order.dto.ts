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
  ArrayMinSize
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Nueva clase para validar la dirección de envío
export class ShippingAddressDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  street: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
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
  @ApiProperty({ description: 'ID del producto' })
  @IsMongoId()
  productId: string;

  @ApiProperty({ description: 'Cantidad solicitada' })
  @IsNumber()
  @Min(0.01)
  quantity: number;
}

export class CreateOrderDto {
  @ApiPropertyOptional({ description: 'ID del cliente existente' })
  @IsOptional()
  @IsMongoId()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Nombre del cliente' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  customerName?: string;

  @ApiPropertyOptional({ description: 'RIF o C.I. del cliente para creación' })
  @IsOptional()
  @IsString()
  customerRif?: string;

  @ApiPropertyOptional({ description: 'Tipo de documento fiscal (V, E, J, G)' })
  @IsOptional()
  @IsEnum(['V', 'E', 'J', 'G'])
  taxType?: string;

  @ApiProperty({ description: 'Items de la orden', type: [CreateOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiPropertyOptional({ description: 'Dirección de envío para la orden' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress?: ShippingAddressDto;

  @ApiPropertyOptional({ description: 'Subtotal de la orden (sin impuestos)' })
  @IsOptional()
  @IsNumber()
  subtotal?: number;

  @ApiPropertyOptional({ description: 'Monto total de IVA de la orden' })
  @IsOptional()
  @IsNumber()
  ivaTotal?: number;

  @ApiPropertyOptional({ description: 'Monto total de IGTF de la orden' })
  @IsOptional()
  @IsNumber()
  igtfTotal?: number;

  @ApiPropertyOptional({ description: 'Costo de envío' })
  @IsOptional()
  @IsNumber()
  shippingCost?: number;

  @ApiPropertyOptional({ description: 'Monto de descuento' })
  @IsOptional()
  @IsNumber()
  discountAmount?: number;

  @ApiPropertyOptional({ description: 'Monto total final de la orden' })
  @IsOptional()
  @IsNumber()
  totalAmount?: number;

  @ApiPropertyOptional({ description: 'Canal de la orden', enum: ['online', 'phone', 'whatsapp', 'in_store', 'in_person', 'web'], default: 'in_person' })
  @IsOptional()
  @IsEnum(['online', 'phone', 'whatsapp', 'in_store', 'in_person', 'web'])
  channel?: string = 'in_person';

  @ApiPropertyOptional({ description: 'Tipo de orden', enum: ['retail', 'wholesale', 'b2b'], default: 'retail' })
  @IsOptional()
  @IsEnum(['retail', 'wholesale', 'b2b'])
  type?: string = 'retail';

  @ApiPropertyOptional({ description: 'Notas de la orden' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Reservar inventario automáticamente', default: true })
  @IsOptional()
  @IsBoolean()
  autoReserve?: boolean = true;

  @ApiProperty({ description: 'Método de pago' })
  @IsString()
  @IsNotEmpty()
  paymentMethod: string;
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
}

export class OrderPaymentDto {
  @ApiProperty({ description: 'Método de pago' })
  @IsString()
  @IsNotEmpty()
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
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Límite por página', default: 20 })
  @IsOptional()
  @Type(() => Number)
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

  @ApiPropertyOptional({ description: 'ID del cliente' })
  @IsOptional()
  @IsMongoId()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Campo para ordenar', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Orden de clasificación', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class OrderCalculationDto {
  @ApiProperty({ description: 'Items para calcular', type: [CreateOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiPropertyOptional({ description: 'Método de pago principal' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Monto de descuento', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number = 0;

  @ApiPropertyOptional({ description: 'Costo de envío', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingCost?: number = 0;
}
