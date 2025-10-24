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
} from "class-validator";
import { Type, Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  SanitizeString,
  SanitizeText,
  SanitizeStringArray,
} from "../decorators/sanitize.decorator";

export class CreateProductVariantDto {
  @ApiProperty({ description: "Nombre de la variante" })
  @IsString()
  @IsNotEmpty()
  @SanitizeString()
  name: string;

  @ApiProperty({ description: "SKU único de la variante" })
  @IsString()
  @IsNotEmpty()
  @SanitizeString()
  sku: string;

  @ApiPropertyOptional({ description: "Código de barras" })
  @IsOptional()
  @IsString()
  @SanitizeString()
  barcode?: string;

  @ApiProperty({ description: "Unidad de medida", example: "kg" })
  @IsString()
  @IsNotEmpty()
  unit: string;

  @ApiProperty({ description: "Tamaño de la unidad", example: 500 })
  @IsNumber()
  @Min(0.01)
  unitSize: number;

  @ApiProperty({ description: "Precio base en VES" })
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiProperty({ description: "Precio de costo en VES" })
  @IsNumber()
  @Min(0)
  costPrice: number;

  @ApiPropertyOptional({ description: "Descripción de la variante" })
  @IsOptional()
  @IsString()
  @SanitizeText()
  description?: string;

  @ApiPropertyOptional({ description: "URLs de imágenes" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ description: "Dimensiones del producto" })
  @IsOptional()
  @IsObject()
  dimensions?: {
    length: number;
    width: number;
    height: number;
    weight: number;
  };

  @ApiPropertyOptional({
    description: "Atributos personalizados de la variante",
    type: Object,
  })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;
}

export class CreateSellingUnitDto {
  @ApiProperty({
    description: "Nombre de la unidad de venta",
    example: "Kilogramos",
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: "Abreviación", example: "kg" })
  @IsString()
  @IsNotEmpty()
  abbreviation: string;

  @ApiProperty({
    description: "Factor de conversión a unidad base",
    example: 1000,
    minimum: 0.001,
  })
  @IsNumber()
  @Min(0.001)
  conversionFactor: number;

  @ApiProperty({ description: "Precio por esta unidad" })
  @IsNumber()
  @Min(0)
  pricePerUnit: number;

  @ApiProperty({ description: "Costo por esta unidad" })
  @IsNumber()
  @Min(0)
  costPerUnit: number;

  @ApiPropertyOptional({ description: "Unidad activa", default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: "Unidad por defecto al vender",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: "Cantidad mínima de venta" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minimumQuantity?: number;

  @ApiPropertyOptional({ description: "Paso de incremento" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  incrementStep?: number;
}

export class CreateProductSupplierDto {
  @ApiProperty({ description: "ID del proveedor" })
  @IsMongoId()
  supplierId: string;

  @ApiProperty({ description: "Nombre del proveedor" })
  @IsString()
  @IsNotEmpty()
  supplierName: string;

  @ApiProperty({ description: "SKU del proveedor" })
  @IsString()
  @IsNotEmpty()
  supplierSku: string;

  @ApiProperty({ description: "Precio de costo" })
  @IsNumber()
  @Min(0)
  costPrice: number;

  @ApiProperty({ description: "Tiempo de entrega en días" })
  @IsNumber()
  @Min(1)
  leadTimeDays: number;

  @ApiProperty({ description: "Cantidad mínima de pedido" })
  @IsNumber()
  @Min(1)
  minimumOrderQuantity: number;

  @ApiPropertyOptional({
    description: "Es proveedor preferido",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPreferred?: boolean;
}

export class CreateProductDto {
  @ApiProperty({ description: "SKU único del producto" })
  @IsString()
  @IsNotEmpty()
  @SanitizeString()
  sku: string;

  @ApiProperty({ description: "Nombre del producto" })
  @IsString()
  @IsNotEmpty()
  @SanitizeString()
  name: string;

  @ApiProperty({ description: "Categorías del producto", type: String })
  @IsString()
  @IsNotEmpty()
  @SanitizeString()
  category: string;

  @ApiProperty({ description: "Subcategorías del producto", type: String })
  @IsString()
  @IsNotEmpty()
  @SanitizeString()
  subcategory: string;

  @ApiProperty({ description: "Marca del producto" })
  @IsString()
  @IsNotEmpty()
  @SanitizeString()
  brand: string;

  @ApiPropertyOptional({ description: "Unidad de medida", default: "unidad" })
  @IsOptional()
  @IsString()
  unitOfMeasure?: string;

  @ApiPropertyOptional({ description: "Se vende por peso", default: false })
  @IsOptional()
  @IsBoolean()
  isSoldByWeight?: boolean;

  @ApiPropertyOptional({
    description: "Tiene múltiples unidades de venta",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  hasMultipleSellingUnits?: boolean;

  @ApiPropertyOptional({
    description: "Unidades de venta disponibles",
    type: [CreateSellingUnitDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSellingUnitDto)
  sellingUnits?: CreateSellingUnitDto[];

  @ApiPropertyOptional({ description: "Descripción del producto" })
  @IsOptional()
  @IsString()
  @SanitizeText()
  description?: string;

  @ApiPropertyOptional({ description: "Ingredientes del producto" })
  @IsOptional()
  @IsString()
  @SanitizeText()
  ingredients?: string;

  @ApiPropertyOptional({ description: "Etiquetas del producto" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @SanitizeStringArray()
  tags?: string[];

  @ApiPropertyOptional({
    description: "Atributos personalizados del producto",
    type: Object,
  })
  @IsOptional()
  @IsObject()
  attributes?: Record<string, any>;

  @ApiProperty({
    description: "Variantes del producto",
    type: [CreateProductVariantDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variants: CreateProductVariantDto[];

  @ApiPropertyOptional({
    description: "Proveedores del producto",
    type: [CreateProductSupplierDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductSupplierDto)
  suppliers?: CreateProductSupplierDto[];

  @ApiProperty({ description: "Es producto perecedero" })
  @IsBoolean()
  isPerishable: boolean;

  @ApiPropertyOptional({ description: "Vida útil en días" })
  @IsOptional()
  @IsNumber()
  @Min(1)
  shelfLifeDays?: number;

  @ApiPropertyOptional({
    description: "Temperatura de almacenamiento",
    enum: ["ambiente", "refrigerado", "congelado"],
  })
  @IsOptional()
  @IsEnum(["ambiente", "refrigerado", "congelado"])
  storageTemperature?: string;

  @ApiPropertyOptional({
    description: "Humedad de almacenamiento",
    enum: ["baja", "media", "alta"],
  })
  @IsOptional()
  @IsEnum(["baja", "media", "alta"])
  storageHumidity?: string;

  @ApiPropertyOptional({ description: "Alérgenos" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergens?: string[];

  @ApiPropertyOptional({ description: "Información nutricional" })
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

  @ApiProperty({ description: "Reglas de precios" })
  @IsObject()
  pricingRules: {
    cashDiscount: number;
    cardSurcharge: number;
    usdPrice?: number;
    minimumMargin: number;
    maximumDiscount: number;
  };

  @ApiProperty({ description: "Configuración de inventario" })
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

  @ApiPropertyOptional({ description: "Aplica IVA 16%", default: true })
  @IsOptional()
  @IsBoolean()
  ivaApplicable?: boolean;

  @ApiPropertyOptional({ description: "Exento de IGTF 3%", default: false })
  @IsOptional()
  @IsBoolean()
  igtfExempt?: boolean;

  @ApiProperty({ description: "Categoría fiscal del producto" })
  @IsString()
  @IsNotEmpty()
  taxCategory: string;
}

export class UpdateProductDto {
  @ApiPropertyOptional({ description: "Nombre del producto" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({
    description: "Categoría del producto",
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: "Subcategoría del producto",
  })
  @IsOptional()
  @IsString()
  subcategory?: string;

  @ApiPropertyOptional({ description: "Marca del producto" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  brand?: string;

  @ApiPropertyOptional({ description: "Descripción del producto" })
  @IsOptional()
  @IsString()
  @SanitizeText()
  description?: string;

  @ApiPropertyOptional({ description: "Ingredientes del producto" })
  @IsOptional()
  @IsString()
  @SanitizeText()
  ingredients?: string;

  @ApiPropertyOptional({ description: "Etiquetas del producto" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @SanitizeStringArray()
  tags?: string[];

  @ApiPropertyOptional({ description: "Es producto perecedero" })
  @IsOptional()
  @IsBoolean()
  isPerishable?: boolean;

  @ApiPropertyOptional({ description: "Vida útil en días" })
  @IsOptional()
  @IsNumber()
  @Min(1)
  shelfLifeDays?: number;

  @ApiPropertyOptional({ description: "Temperatura de almacenamiento" })
  @IsOptional()
  @IsEnum(["ambiente", "refrigerado", "congelado"])
  storageTemperature?: string;

  @ApiPropertyOptional({ description: "Reglas de precios" })
  @IsOptional()
  @IsObject()
  pricingRules?: {
    cashDiscount: number;
    cardSurcharge: number;
    usdPrice?: number;
    minimumMargin: number;
    maximumDiscount: number;
  };

  @ApiPropertyOptional({ description: "Configuración de inventario" })
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

  @ApiPropertyOptional({ description: "Estado activo del producto" })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: "Vendido por peso" })
  @IsOptional()
  @IsBoolean()
  isSoldByWeight?: boolean;

  @ApiPropertyOptional({ description: "Unidad de medida" })
  @IsOptional()
  @IsString()
  unitOfMeasure?: string;

  @ApiPropertyOptional({ description: "Tiene múltiples unidades de venta" })
  @IsOptional()
  @IsBoolean()
  hasMultipleSellingUnits?: boolean;

  @ApiPropertyOptional({
    description: "Unidades de venta disponibles",
    type: [CreateSellingUnitDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSellingUnitDto)
  sellingUnits?: CreateSellingUnitDto[];

  @ApiPropertyOptional({
    description: "Variantes del producto",
    type: [CreateProductVariantDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variants?: CreateProductVariantDto[];
}

export class ProductQueryDto {
  @ApiPropertyOptional({ description: "Página", default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: "Límite por página", default: 20 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(500)
  limit?: number = 20;

  @ApiPropertyOptional({ description: "Término de búsqueda" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: "Categoría" })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: "Marca" })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ description: "Solo productos activos", default: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === "") {
      return true;
    }
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      return value.toLowerCase() === "true";
    }
    return Boolean(value);
  })
  @IsBoolean()
  isActive?: boolean = true;

  @ApiPropertyOptional({ description: "Solo productos perecederos" })
  @IsOptional()
  @Transform(({ value }) => value === "true")
  @IsBoolean()
  isPerishable?: boolean;

  @ApiPropertyOptional({
    description: "Ordenar por",
    enum: ["name", "category", "createdAt", "updatedAt"],
  })
  @IsOptional()
  @IsEnum(["name", "category", "createdAt", "updatedAt"])
  sortBy?: string = "createdAt";

  @ApiPropertyOptional({ description: "Orden", enum: ["asc", "desc"] })
  @IsOptional()
  @IsEnum(["asc", "desc"])
  sortOrder?: string = "desc";

  @ApiPropertyOptional({
    description: "Incluir productos inactivos en el resultado",
    default: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === "true" || value === true)
  @IsBoolean()
  includeInactive?: boolean = false;
}
