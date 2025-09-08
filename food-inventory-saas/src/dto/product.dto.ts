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
  ArrayMinSize,
  IsObject,
  IsDateString
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductVariantDto {
  @ApiProperty({ description: 'Nombre de la variante' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'SKU único de la variante' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ description: 'Código de barras' })
  @IsString()
  @IsNotEmpty()
  barcode: string;

  @ApiProperty({ description: 'Unidad de medida', example: 'kg' })
  @IsString()
  @IsNotEmpty()
  unit: string;

  @ApiProperty({ description: 'Tamaño de la unidad', example: 500 })
  @IsNumber()
  @Min(0.01)
  unitSize: number;

  @ApiProperty({ description: 'Precio base en VES' })
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiProperty({ description: 'Precio de costo en VES' })
  @IsNumber()
  @Min(0)
  costPrice: number;

  @ApiPropertyOptional({ description: 'Descripción de la variante' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'URLs de imágenes' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ description: 'Dimensiones del producto' })
  @IsOptional()
  @IsObject()
  dimensions?: {
    length: number;
    width: number;
    height: number;
    weight: number;
  };
}

export class CreateProductSupplierDto {
  @ApiProperty({ description: 'ID del proveedor' })
  @IsMongoId()
  supplierId: string;

  @ApiProperty({ description: 'Nombre del proveedor' })
  @IsString()
  @IsNotEmpty()
  supplierName: string;

  @ApiProperty({ description: 'SKU del proveedor' })
  @IsString()
  @IsNotEmpty()
  supplierSku: string;

  @ApiProperty({ description: 'Precio de costo' })
  @IsNumber()
  @Min(0)
  costPrice: number;

  @ApiProperty({ description: 'Tiempo de entrega en días' })
  @IsNumber()
  @Min(1)
  leadTimeDays: number;

  @ApiProperty({ description: 'Cantidad mínima de pedido' })
  @IsNumber()
  @Min(1)
  minimumOrderQuantity: number;

  @ApiPropertyOptional({ description: 'Es proveedor preferido', default: false })
  @IsOptional()
  @IsBoolean()
  isPreferred?: boolean;
}

export class CreateProductDto {
  @ApiProperty({ description: 'SKU único del producto' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ description: 'Nombre del producto' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Categoría del producto' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ description: 'Subcategoría del producto' })
  @IsString()
  @IsNotEmpty()
  subcategory: string;

  @ApiProperty({ description: 'Marca del producto' })
  @IsString()
  @IsNotEmpty()
  brand: string;

  @ApiPropertyOptional({ description: 'Descripción del producto' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Etiquetas del producto' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'Variantes del producto', type: [CreateProductVariantDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variants: CreateProductVariantDto[];

  @ApiPropertyOptional({ description: 'Proveedores del producto', type: [CreateProductSupplierDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductSupplierDto)
  suppliers?: CreateProductSupplierDto[];

  @ApiProperty({ description: 'Es producto perecedero' })
  @IsBoolean()
  isPerishable: boolean;

  @ApiPropertyOptional({ description: 'Vida útil en días' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  shelfLifeDays?: number;

  @ApiPropertyOptional({ description: 'Temperatura de almacenamiento', enum: ['ambiente', 'refrigerado', 'congelado'] })
  @IsOptional()
  @IsEnum(['ambiente', 'refrigerado', 'congelado'])
  storageTemperature?: string;

  @ApiPropertyOptional({ description: 'Humedad de almacenamiento', enum: ['baja', 'media', 'alta'] })
  @IsOptional()
  @IsEnum(['baja', 'media', 'alta'])
  storageHumidity?: string;

  @ApiPropertyOptional({ description: 'Alérgenos' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergens?: string[];

  @ApiPropertyOptional({ description: 'Información nutricional' })
  @IsOptional()
  @IsObject()
  nutritionalInfo?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sodium: number;
  };

  @ApiProperty({ description: 'Reglas de precios' })
  @IsObject()
  pricingRules: {
    cashDiscount: number;
    cardSurcharge: number;
    usdPrice?: number;
    minimumMargin: number;
    maximumDiscount: number;
  };

  @ApiProperty({ description: 'Configuración de inventario' })
  @IsObject()
  inventoryConfig: {
    trackLots: boolean;
    trackExpiration: boolean;
    minimumStock: number;
    maximumStock: number;
    reorderPoint: number;
    reorderQuantity: number;
    fefoEnabled: boolean;
  };

  @ApiPropertyOptional({ description: 'Aplica IVA 16%', default: true })
  @IsOptional()
  @IsBoolean()
  ivaApplicable?: boolean;

  @ApiPropertyOptional({ description: 'Exento de IGTF 3%', default: false })
  @IsOptional()
  @IsBoolean()
  igtfExempt?: boolean;

  @ApiProperty({ description: 'Categoría fiscal del producto' })
  @IsString()
  @IsNotEmpty()
  taxCategory: string;
}

export class UpdateProductDto {
  @ApiPropertyOptional({ description: 'Nombre del producto' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ description: 'Categoría del producto' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  category?: string;

  @ApiPropertyOptional({ description: 'Subcategoría del producto' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  subcategory?: string;

  @ApiPropertyOptional({ description: 'Marca del producto' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  brand?: string;

  @ApiPropertyOptional({ description: 'Descripción del producto' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Etiquetas del producto' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ description: 'Es producto perecedero' })
  @IsOptional()
  @IsBoolean()
  isPerishable?: boolean;

  @ApiPropertyOptional({ description: 'Vida útil en días' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  shelfLifeDays?: number;

  @ApiPropertyOptional({ description: 'Temperatura de almacenamiento' })
  @IsOptional()
  @IsEnum(['ambiente', 'refrigerado', 'congelado'])
  storageTemperature?: string;

  @ApiPropertyOptional({ description: 'Reglas de precios' })
  @IsOptional()
  @IsObject()
  pricingRules?: {
    cashDiscount: number;
    cardSurcharge: number;
    usdPrice?: number;
    minimumMargin: number;
    maximumDiscount: number;
  };

  @ApiPropertyOptional({ description: 'Configuración de inventario' })
  @IsOptional()
  @IsObject()
  inventoryConfig?: {
    trackLots: boolean;
    trackExpiration: boolean;
    minimumStock: number;
    maximumStock: number;
    reorderPoint: number;
    reorderQuantity: number;
    fefoEnabled: boolean;
  };

  @ApiPropertyOptional({ description: 'Estado activo del producto' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ProductQueryDto {
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

  @ApiPropertyOptional({ description: 'Término de búsqueda' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Categoría' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Marca' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ description: 'Solo productos activos', default: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isActive?: boolean = true;

  @ApiPropertyOptional({ description: 'Solo productos perecederos' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  isPerishable?: boolean;

  @ApiPropertyOptional({ description: 'Ordenar por', enum: ['name', 'category', 'createdAt', 'updatedAt'] })
  @IsOptional()
  @IsEnum(['name', 'category', 'createdAt', 'updatedAt'])
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ description: 'Orden', enum: ['asc', 'desc'] })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: string = 'desc';
}

