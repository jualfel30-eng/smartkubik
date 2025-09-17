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
  IsDate
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// CORREGIDO
export class CreateOrderItemDto {
  @ApiProperty({ description: 'ID del producto' })
  @IsMongoId()
  productId: string;

  @ApiProperty({ description: 'SKU del producto' })
  @IsString()
  @IsNotEmpty()
  productSku: string;

  @ApiProperty({ description: 'Nombre del producto' })
  @IsString()
  @IsNotEmpty()
  productName: string;

  @ApiProperty({ description: 'Cantidad solicitada' })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiProperty({ description: 'Precio de costo del producto' })
  @IsNumber()
  @Min(0)
  costPrice: number;

  @ApiProperty({ description: 'Precio unitario sin impuestos' })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ description: 'Precio total (cantidad * precio unitario)' })
  @IsNumber()
  @Min(0)
  totalPrice: number;

  @ApiProperty({ description: 'Monto de IVA del item' })
  @IsNumber()
  @Min(0)
  ivaAmount: number;

  @ApiProperty({ description: 'Monto de IGTF del item' })
  @IsNumber()
  @Min(0)
  igtfAmount: number;

  @ApiProperty({ description: 'Precio final del item (con impuestos)' })
  @IsNumber()
  @Min(0)
  finalPrice: number;

  @ApiProperty({ description: 'Estado del item en la orden' })
  @IsString()
  @IsNotEmpty()
  status: string;
}

// CORREGIDO
export class CreateOrderDto {
  @ApiProperty({ description: 'ID del cliente' })
  @IsMongoId()
  customerId: string;

  @ApiProperty({ description: 'Nombre del cliente' })
  @IsString()
  @IsNotEmpty()
  customerName: string;

  @ApiProperty({ description: 'Items de la orden', type: [CreateOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiProperty({ description: 'Subtotal de la orden (sin impuestos)' })
  @IsNumber()
  subtotal: number;

  @ApiProperty({ description: 'Monto total de IVA de la orden' })
  @IsNumber()
  ivaTotal: number;

  @ApiProperty({ description: 'Monto total de IGTF de la orden' })
  @IsNumber()
  igtfTotal: number;

  @ApiProperty({ description: 'Costo de envío' })
  @IsNumber()
  shippingCost: number;

  @ApiProperty({ description: 'Monto de descuento' })
  @IsNumber()
  discountAmount: number;

  @ApiProperty({ description: 'Monto total final de la orden' })
  @IsNumber()
  totalAmount: number;

  @ApiPropertyOptional({ description: 'Canal de la orden', enum: ['online', 'phone', 'whatsapp', 'in_store'], default: 'in_store' })
  @IsOptional()
  @IsEnum(['online', 'phone', 'whatsapp', 'in_store'])
  channel?: string = 'in_store';

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
}

// --- CLASES ORIGINALES RESTAURADAS ---

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

export class OrderPaymentDto { // Necesaria para AddOrderPaymentDto
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
  @IsEnum(['cash', 'card', 'transfer', 'usd_cash', 'usd_transfer'])
  paymentMethod?: string;
}
