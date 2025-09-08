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
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInventoryLotDto {
  @ApiProperty({ description: 'Número de lote' })
  @IsString()
  @IsNotEmpty()
  lotNumber: string;

  @ApiProperty({ description: 'Cantidad del lote' })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiProperty({ description: 'Precio de costo del lote' })
  @IsNumber()
  @Min(0)
  costPrice: number;

  @ApiProperty({ description: 'Fecha de recepción' })
  @IsDate()
  @Type(() => Date)
  receivedDate: Date;

  @ApiPropertyOptional({ description: 'Fecha de vencimiento' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expirationDate?: Date;

  @ApiPropertyOptional({ description: 'Fecha de fabricación' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  manufacturingDate?: Date;

  @ApiPropertyOptional({ description: 'ID del proveedor' })
  @IsOptional()
  @IsMongoId()
  supplierId?: string;

  @ApiPropertyOptional({ description: 'Número de factura del proveedor' })
  @IsOptional()
  @IsString()
  supplierInvoice?: string;

  @ApiPropertyOptional({ description: 'Control de calidad' })
  @IsOptional()
  @IsObject()
  qualityCheck?: {
    temperature: number;
    humidity: number;
    visualInspection: string;
    approved: boolean;
    notes?: string;
  };
}

export class CreateInventoryDto {
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

  @ApiPropertyOptional({ description: 'ID de la variante' })
  @IsOptional()
  @IsMongoId()
  variantId?: string;

  @ApiPropertyOptional({ description: 'SKU de la variante' })
  @IsOptional()
  @IsString()
  variantSku?: string;

  @ApiProperty({ description: 'Cantidad inicial' })
  @IsNumber()
  @Min(0)
  totalQuantity: number;

  @ApiProperty({ description: 'Precio de costo promedio' })
  @IsNumber()
  @Min(0)
  averageCostPrice: number;

  @ApiPropertyOptional({ description: 'Lotes iniciales', type: [CreateInventoryLotDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInventoryLotDto)
  lots?: CreateInventoryLotDto[];

  @ApiPropertyOptional({ description: 'Ubicación física' })
  @IsOptional()
  @IsObject()
  location?: {
    warehouse: string;
    zone: string;
    aisle: string;
    shelf: string;
    bin: string;
  };
}

export class InventoryMovementDto {
  @ApiProperty({ description: 'ID del inventario' })
  @IsMongoId()
  inventoryId: string;

  @ApiProperty({ description: 'Tipo de movimiento', enum: ['in', 'out', 'adjustment', 'transfer', 'reservation', 'release'] })
  @IsEnum(['in', 'out', 'adjustment', 'transfer', 'reservation', 'release'])
  movementType: string;

  @ApiProperty({ description: 'Cantidad del movimiento' })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiProperty({ description: 'Precio unitario' })
  @IsNumber()
  @Min(0)
  unitCost: number;

  @ApiProperty({ description: 'Razón del movimiento' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({ description: 'Referencia (orden, factura, etc.)' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ description: 'ID de la orden relacionada' })
  @IsOptional()
  @IsMongoId()
  orderId?: string;

  @ApiPropertyOptional({ description: 'ID del proveedor' })
  @IsOptional()
  @IsMongoId()
  supplierId?: string;

  @ApiPropertyOptional({ description: 'Número de lote específico' })
  @IsOptional()
  @IsString()
  lotNumber?: string;
}

export class ReserveInventoryDto {
  @ApiProperty({ description: 'Items a reservar', type: 'array' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReserveInventoryItemDto)
  items: ReserveInventoryItemDto[];

  @ApiProperty({ description: 'ID de la orden' })
  @IsMongoId()
  orderId: string;

  @ApiPropertyOptional({ description: 'Minutos hasta expiración de la reserva', default: 30 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1440) // máximo 24 horas
  expirationMinutes?: number = 30;
}

export class ReserveInventoryItemDto {
  @ApiProperty({ description: 'SKU del producto' })
  @IsString()
  @IsNotEmpty()
  productSku: string;

  @ApiPropertyOptional({ description: 'SKU de la variante' })
  @IsOptional()
  @IsString()
  variantSku?: string;

  @ApiProperty({ description: 'Cantidad a reservar' })
  @IsNumber()
  @Min(0.01)
  quantity: number;

  @ApiPropertyOptional({ description: 'Usar FEFO (First Expired First Out)', default: true })
  @IsOptional()
  @IsBoolean()
  useFefo?: boolean = true;
}

export class ReleaseInventoryDto {
  @ApiProperty({ description: 'ID de la orden' })
  @IsMongoId()
  orderId: string;

  @ApiPropertyOptional({ description: 'SKUs específicos a liberar (si no se especifica, libera toda la orden)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productSkus?: string[];
}

export class AdjustInventoryDto {
  @ApiProperty({ description: 'ID del inventario' })
  @IsMongoId()
  inventoryId: string;

  @ApiProperty({ description: 'Nueva cantidad total' })
  @IsNumber()
  @Min(0)
  newQuantity: number;

  @ApiProperty({ description: 'Razón del ajuste' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({ description: 'Número de lote específico' })
  @IsOptional()
  @IsString()
  lotNumber?: string;

  @ApiPropertyOptional({ description: 'Nuevo precio de costo (si aplica)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  newCostPrice?: number;
}

export class InventoryQueryDto {
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

  @ApiPropertyOptional({ description: 'Término de búsqueda (SKU o nombre)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Almacén' })
  @IsOptional()
  @IsString()
  warehouse?: string;

  @ApiPropertyOptional({ description: 'Solo productos con stock bajo' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  lowStock?: boolean;

  @ApiPropertyOptional({ description: 'Solo productos próximos a vencer' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  nearExpiration?: boolean;

  @ApiPropertyOptional({ description: 'Solo productos vencidos' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  expired?: boolean;

  @ApiPropertyOptional({ description: 'Cantidad disponible mínima' })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  @IsNumber()
  @Min(0)
  minAvailable?: number;

  @ApiPropertyOptional({ description: 'Ordenar por', enum: ['productName', 'availableQuantity', 'lastUpdated'] })
  @IsOptional()
  @IsEnum(['productName', 'availableQuantity', 'lastUpdated'])
  sortBy?: string = 'lastUpdated';

  @ApiPropertyOptional({ description: 'Orden', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: string = 'desc';
}

export class InventoryMovementQueryDto {
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

  @ApiPropertyOptional({ description: 'ID del inventario' })
  @IsOptional()
  @IsMongoId()
  inventoryId?: string;

  @ApiPropertyOptional({ description: 'SKU del producto' })
  @IsOptional()
  @IsString()
  productSku?: string;

  @ApiPropertyOptional({ description: 'Tipo de movimiento' })
  @IsOptional()
  @IsEnum(['in', 'out', 'adjustment', 'transfer', 'reservation', 'release'])
  movementType?: string;

  @ApiPropertyOptional({ description: 'Fecha desde (ISO string)' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Fecha hasta (ISO string)' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'ID de la orden' })
  @IsOptional()
  @IsMongoId()
  orderId?: string;
}

