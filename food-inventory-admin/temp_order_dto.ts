import { 
  IsString, 
  IsNumber,
  IsOptional, 
  IsArray, 
  ValidateNested, 
  IsNotEmpty,
  Min,
  IsEnum,
  IsMongoId,
  ArrayMinSize
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Reemplaza tu clase CreateOrderItemDto con esta:
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

// Reemplaza tu clase CreateOrderDto con esta:
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
}
