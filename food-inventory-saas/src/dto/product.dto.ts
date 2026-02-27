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

/**
 * DTO para estrategia de pricing de una variante
 * Soporta 3 modos:
 * - manual: Usuario ingresa precio directamente
 * - markup: Precio = Costo × (1 + Margen%)
 * - margin: Precio = Costo / (1 - Margen%)
 */
export class PricingStrategyDto {
  @ApiProperty({
    description: "Modo de cálculo de precio",
    enum: ["manual", "markup", "margin"],
    default: "manual",
    example: "markup",
  })
  @IsEnum(["manual", "markup", "margin"])
  mode: "manual" | "markup" | "margin";

  @ApiPropertyOptional({
    description: "Porcentaje de margen sobre costo (para modo markup)",
    example: 30,
    minimum: 0,
    maximum: 1000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  markupPercentage?: number;

  @ApiPropertyOptional({
    description: "Porcentaje de margen de ganancia (para modo margin)",
    example: 25,
    minimum: 0,
    maximum: 99.9,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(99.9)
  marginPercentage?: number;

  @ApiProperty({
    description: "Si el precio se calcula automáticamente al cambiar el costo",
    default: true,
  })
  @IsBoolean()
  autoCalculate: boolean;

  @ApiPropertyOptional({
    description: "Último precio manual ingresado (histórico)",
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  lastManualPrice?: number;

  @ApiPropertyOptional({
    description: "Estrategia de redondeo psicológico del precio final",
    enum: ["none", "0.99", "0.95", "0.90", "round_up", "round_down"],
    default: "none",
    example: "0.99",
  })
  @IsOptional()
  @IsEnum(["none", "0.99", "0.95", "0.90", "round_up", "round_down"])
  psychologicalRounding?: "none" | "0.99" | "0.95" | "0.90" | "round_up" | "round_down";
}

/**
 * DTO para pricing basado en ubicación
 */
export class LocationPricingDto {
  @ApiProperty({ description: "ID de la ubicación/sucursal" })
  @IsMongoId()
  locationId: string;

  @ApiProperty({ description: "Precio personalizado para esta ubicación", minimum: 0 })
  @IsNumber()
  @Min(0)
  customPrice: number;

  @ApiPropertyOptional({ description: "Si este precio está activo" })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: "Notas sobre este precio" })
  @IsOptional()
  @IsString()
  @SanitizeText()
  notes?: string;
}

/**
 * DTO para descuentos por volumen
 */
export class VolumeDiscountDto {
  @ApiProperty({ description: "Cantidad mínima para aplicar este descuento", minimum: 1 })
  @IsNumber()
  @Min(1)
  minQuantity: number;

  @ApiPropertyOptional({ description: "Porcentaje de descuento (0-100)", minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercentage?: number;

  @ApiPropertyOptional({ description: "Precio fijo para esta cantidad", minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fixedPrice?: number;
}

export class CreateProductVariantDto {
  @ApiProperty({ description: "Nombre de la variante" })
  @IsString()
  @IsNotEmpty()
  @SanitizeString()
  name: string;

  @ApiProperty({ description: "SKU único de la variante" })
  @IsOptional()
  @IsString()
  @SanitizeString()
  sku?: string;

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

  @ApiPropertyOptional({
    description:
      "Precio base en VES (puede ser calculado automáticamente según pricingStrategy)",
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  basePrice?: number;

  @ApiPropertyOptional({ description: "Precio mayorista en VES" })
  @IsOptional()
  @IsNumber()
  @Min(0)
  wholesalePrice?: number;

  @ApiProperty({ description: "Precio de costo en VES" })
  @IsNumber()
  @Min(0)
  costPrice: number;

  @ApiPropertyOptional({
    description: "Estrategia de pricing (manual, markup, margin)",
    type: PricingStrategyDto,
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PricingStrategyDto)
  pricingStrategy?: PricingStrategyDto;

  @ApiPropertyOptional({ description: "Precios personalizados por ubicación/sucursal", type: [LocationPricingDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LocationPricingDto)
  locationPricing?: LocationPricingDto[];

  @ApiPropertyOptional({ description: "Descuentos por volumen/cantidad", type: [VolumeDiscountDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VolumeDiscountDto)
  volumeDiscounts?: VolumeDiscountDto[];

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
    minimum: 0.000001,
  })
  @IsNumber()
  @Min(0.000001)
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

  @ApiPropertyOptional({ description: "Si esta unidad se vende por peso", default: false })
  @IsOptional()
  @IsBoolean()
  isSoldByWeight?: boolean;
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
  @ApiPropertyOptional({
    description: "Tipo de producto",
    enum: ["simple", "consumable", "supply", "raw_material"],
    default: "simple",
  })
  @IsOptional()
  @IsEnum(["simple", "consumable", "supply", "raw_material"])
  productType?: string;

  @ApiProperty({ description: "SKU único del producto" })
  @IsOptional()
  @IsString()
  @SanitizeString()
  sku?: string;

  @ApiProperty({ description: "Nombre del producto" })
  @IsString()
  @IsNotEmpty()
  @SanitizeString()
  name: string;

  @ApiProperty({
    description: "Categorías del producto",
    type: [String],
    isArray: true,
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  category: string[];

  @ApiProperty({
    description: "Subcategorías del producto",
    type: [String],
    isArray: true,
  })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  subcategory: string[];

  @ApiProperty({ description: "Marca del producto" })
  @IsString()
  @IsNotEmpty()
  @SanitizeString()
  brand: string;

  @ApiPropertyOptional({ description: "Origen del producto" })
  @IsOptional()
  @IsString()
  @SanitizeString()
  origin?: string;

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
    description: "Unidad de vida útil",
    enum: ["days", "months", "years"],
  })
  @IsOptional()
  @IsEnum(["days", "months", "years"])
  shelfLifeUnit?: string;

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
    wholesaleEnabled?: boolean;
    wholesaleMinQuantity?: number;
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

  @ApiPropertyOptional({ description: "Enviar a cocina/comanda", default: true })
  @IsOptional()
  @IsBoolean()
  sendToKitchen?: boolean;

  @ApiProperty({ description: "Categoría fiscal del producto" })
  @IsString()
  @IsNotEmpty()
  taxCategory: string;
}

export class UpdateProductDto {
  @ApiPropertyOptional({ description: "SKU único del producto" })
  @IsOptional()
  @IsString()
  @SanitizeString()
  sku?: string;

  @ApiPropertyOptional({ description: "Nombre del producto" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({
    description: "Categorías del producto",
    type: [String],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  category?: string[];

  @ApiPropertyOptional({
    description: "Subcategorías del producto",
    type: [String],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subcategory?: string[];

  @ApiPropertyOptional({ description: "Marca del producto" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @ApiPropertyOptional({ description: "Marca del producto" })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  brand?: string;

  @ApiPropertyOptional({ description: "Origen del producto" })
  @IsOptional()
  @IsString()
  @SanitizeString()
  origin?: string;

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

  @ApiPropertyOptional({
    description: "Unidad de vida útil",
    enum: ["days", "months", "years"],
  })
  @IsOptional()
  @IsEnum(["days", "months", "years"])
  shelfLifeUnit?: string;

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
    wholesaleEnabled?: boolean;
    wholesaleMinQuantity?: number;
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

  @ApiPropertyOptional({ description: "Tiene una promoción activa" })
  @IsOptional()
  @IsBoolean()
  hasActivePromotion?: boolean;

  @ApiPropertyOptional({ description: "Detalles de la promoción" })
  @IsOptional()
  @IsObject()
  promotion?: {
    discountPercentage: number;
    reason: string;
    startDate: Date;
    endDate: Date;
    durationDays?: number;
    isActive: boolean;
    autoDeactivate: boolean;
  };

  @ApiPropertyOptional({ description: "Aplica IVA 16%" })
  @IsOptional()
  @IsBoolean()
  ivaApplicable?: boolean;

  @ApiPropertyOptional({ description: "Exento de IGTF 3%" })
  @IsOptional()
  @IsBoolean()
  igtfExempt?: boolean;

  @ApiPropertyOptional({ description: "Enviar a cocina/comanda" })
  @IsOptional()
  @IsBoolean()
  sendToKitchen?: boolean;
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
  @Max(20000)
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

  @ApiPropertyOptional({
    description: "Tipo de producto",
    enum: ["simple", "consumable", "supply", "raw_material"],
  })
  @IsOptional()
  @IsEnum(["simple", "consumable", "supply", "raw_material"])
  productType?: string;

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

  @ApiPropertyOptional({ description: "Filtrar por ID de proveedor" })
  @IsOptional()
  @IsMongoId()
  supplierId?: string;

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

  // Uso interno: excluir ciertos IDs (p.ej. productos marcados como consumibles)
  @IsOptional()
  excludeProductIds?: string[];

  // Optimización: filtrar por lista específica de IDs
  @ApiPropertyOptional({ description: "Filtrar por lista de IDs (separados por coma)" })
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') return value.split(',').map(id => id.trim()).filter(id => id.length > 0);
    return [];
  })
  @IsArray()
  @IsString({ each: true })
  ids?: string[];

  // Alias común de búsqueda (?q=) para compatibilidad con UI
  @ApiPropertyOptional({ description: "Alias de búsqueda", name: "q" })
  @IsOptional()
  @IsString()
  @Transform(({ value, obj }) => {
    if (!obj.search && typeof value === "string" && value.trim().length > 0) {
      obj.search = value;
    }
    return value;
  })
  q?: string;
}
