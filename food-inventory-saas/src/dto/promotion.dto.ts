import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsMongoId,
  IsBoolean,
  IsDate,
  IsArray,
  Min,
  Max,
  MaxLength,
  IsNotEmpty,
  ValidateNested,
  IsIn,
} from "class-validator";
import { Type } from "class-transformer";

/**
 * DTO para configurar tiers de precios escalonados
 */
export class TierConfigDto {
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  minQuantity: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  maxQuantity?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  discountPercentage: number;
}

/**
 * DTO para items del bundle
 */
export class BundleItemDto {
  @IsMongoId()
  productId: string;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  quantity: number;
}

/**
 * DTO para crear una nueva promoción
 */
export class CreatePromotionDto {
  @IsString()
  @MaxLength(200)
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsEnum([
    "percentage_discount",
    "fixed_amount_discount",
    "buy_x_get_y",
    "tiered_pricing",
    "bundle_discount",
  ])
  type: string;

  @IsOptional()
  @IsEnum(["active", "inactive", "scheduled"])
  status?: string;

  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @Type(() => Date)
  @IsDate()
  endDate: Date;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  priority?: number;

  // Configuración de descuento básico
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  discountValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxDiscountAmount?: number;

  // Buy X Get Y
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  buyQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  getQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  getDiscountPercentage?: number;

  // Tiered Pricing
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TierConfigDto)
  tiers?: TierConfigDto[];

  // Condiciones
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minimumPurchaseAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  minimumQuantity?: number;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  applicableProducts?: string[];

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  applicableCategories?: string[];

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  excludedProducts?: string[];

  // Bundle
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BundleItemDto)
  bundleItems?: BundleItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  bundleDiscountPercentage?: number;

  // Restricciones temporales
  @IsOptional()
  @IsArray()
  @IsIn(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"], { each: true })
  applicableDays?: string[];

  @IsOptional()
  @IsString()
  applicableStartTime?: string; // HH:mm

  @IsOptional()
  @IsString()
  applicableEndTime?: string; // HH:mm

  // Límites de uso
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxUsageCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  maxUsagePerCustomer?: number;

  @IsOptional()
  @IsEnum(["all", "new_customers", "returning_customers", "vip"])
  customerEligibility?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  excludedCustomers?: string[];

  @IsOptional()
  @IsBoolean()
  combinableWithCoupons?: boolean;

  @IsOptional()
  @IsBoolean()
  combinableWithOtherPromotions?: boolean;

  @IsOptional()
  @IsBoolean()
  autoApply?: boolean;

  @IsOptional()
  @IsBoolean()
  showInStorefront?: boolean;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  metadata?: {
    campaign?: string;
    source?: string;
    notes?: string;
    [key: string]: any;
  };
}

/**
 * DTO para actualizar una promoción
 */
export class UpdatePromotionDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsEnum(["active", "inactive", "scheduled", "expired"])
  status?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  priority?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  discountValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxDiscountAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  buyQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  getQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  getDiscountPercentage?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TierConfigDto)
  tiers?: TierConfigDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minimumPurchaseAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  minimumQuantity?: number;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  applicableProducts?: string[];

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  applicableCategories?: string[];

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  excludedProducts?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BundleItemDto)
  bundleItems?: BundleItemDto[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  bundleDiscountPercentage?: number;

  @IsOptional()
  @IsArray()
  @IsIn(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"], { each: true })
  applicableDays?: string[];

  @IsOptional()
  @IsString()
  applicableStartTime?: string;

  @IsOptional()
  @IsString()
  applicableEndTime?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxUsageCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  maxUsagePerCustomer?: number;

  @IsOptional()
  @IsEnum(["all", "new_customers", "returning_customers", "vip"])
  customerEligibility?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  excludedCustomers?: string[];

  @IsOptional()
  @IsBoolean()
  combinableWithCoupons?: boolean;

  @IsOptional()
  @IsBoolean()
  combinableWithOtherPromotions?: boolean;

  @IsOptional()
  @IsBoolean()
  autoApply?: boolean;

  @IsOptional()
  @IsBoolean()
  showInStorefront?: boolean;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  metadata?: {
    campaign?: string;
    source?: string;
    notes?: string;
    [key: string]: any;
  };
}

/**
 * DTO para consultar promociones activas aplicables
 */
export class FindApplicablePromotionsDto {
  @IsOptional()
  @IsMongoId()
  customerId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  orderAmount?: number;

  @IsOptional()
  @IsArray()
  productItems?: Array<{
    productId: string;
    quantity: number;
    categoryId?: string;
  }>;
}

/**
 * DTO para aplicar promoción a una orden
 */
export class ApplyPromotionDto {
  @IsMongoId()
  promotionId: string;

  @IsMongoId()
  orderId: string;

  @IsOptional()
  @IsMongoId()
  customerId?: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  orderAmount: number;

  @IsArray()
  productItems: Array<{
    productId: string;
    quantity: number;
    price: number;
    categoryId?: string;
  }>;
}

/**
 * DTO para consultar lista de promociones
 */
export class GetPromotionsQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(["active", "inactive", "scheduled", "expired"])
  status?: string;

  @IsOptional()
  @IsEnum([
    "percentage_discount",
    "fixed_amount_discount",
    "buy_x_get_y",
    "tiered_pricing",
    "bundle_discount",
  ])
  type?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  onlyActive?: boolean; // Solo promociones activas y dentro de fecha

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  showInStorefront?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;
}

/**
 * DTO de respuesta para promoción aplicada
 */
export class PromotionApplicationResponseDto {
  isApplicable: boolean;
  promotionId?: string;
  promotionName?: string;
  promotionType?: string;
  message?: string;
  discountAmount?: number;
  finalAmount?: number;
  productsAffected?: Array<{
    productId: string;
    originalPrice: number;
    discountedPrice: number;
    discountAmount: number;
  }>;
}

/**
 * DTO de respuesta para estadísticas de promoción
 */
export class PromotionStatsResponseDto {
  promotionId: string;
  name: string;
  type: string;
  status: string;
  totalUsageCount: number;
  maxUsageCount?: number;
  remainingUses?: number;
  totalRevenue: number;
  totalOrders: number;
  totalDiscountGiven: number;
  averageDiscountPerOrder: number;
  averageOrderValue: number;
  conversionRate?: number;
  usageByDate: Array<{
    date: string;
    orders: number;
    revenue: number;
    discount: number;
  }>;
}
