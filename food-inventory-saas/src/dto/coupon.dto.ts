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
  MinLength,
  IsNotEmpty,
} from "class-validator";
import { Type } from "class-transformer";

/**
 * DTO para crear un nuevo cupón
 */
export class CreateCouponDto {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @IsNotEmpty()
  code: string; // Se convertirá a mayúsculas en el servicio

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum(["percentage", "fixed_amount"])
  discountType: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  discountValue: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minimumPurchaseAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxDiscountAmount?: number;

  @Type(() => Date)
  @IsDate()
  validFrom: Date;

  @Type(() => Date)
  @IsDate()
  validUntil: Date;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

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
  @IsArray()
  @IsMongoId({ each: true })
  applicableProducts?: string[];

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  applicableCategories?: string[];

  @IsOptional()
  @IsEnum(["all", "new_customers", "returning_customers", "vip"])
  customerEligibility?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  excludedCustomers?: string[];

  @IsOptional()
  @IsBoolean()
  combinableWithOtherOffers?: boolean;

  @IsOptional()
  metadata?: {
    campaign?: string;
    source?: string;
    notes?: string;
    [key: string]: any;
  };
}

/**
 * DTO para actualizar un cupón existente
 */
export class UpdateCouponDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsEnum(["percentage", "fixed_amount"])
  discountType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  discountValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minimumPurchaseAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxDiscountAmount?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  validFrom?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  validUntil?: Date;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

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
  @IsArray()
  @IsMongoId({ each: true })
  applicableProducts?: string[];

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  applicableCategories?: string[];

  @IsOptional()
  @IsEnum(["all", "new_customers", "returning_customers", "vip"])
  customerEligibility?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  excludedCustomers?: string[];

  @IsOptional()
  @IsBoolean()
  combinableWithOtherOffers?: boolean;

  @IsOptional()
  metadata?: {
    campaign?: string;
    source?: string;
    notes?: string;
    [key: string]: any;
  };
}

/**
 * DTO para validar un cupón antes de aplicarlo
 */
export class ValidateCouponDto {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  code: string;

  @IsMongoId()
  customerId: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  orderAmount: number;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  productIds?: string[]; // Productos en el carrito

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  categoryIds?: string[]; // Categorías de productos
}

/**
 * DTO para aplicar un cupón a una orden
 */
export class ApplyCouponDto {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  code: string;

  @IsMongoId()
  customerId: string;

  @IsMongoId()
  orderId: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  orderAmount: number;
}

/**
 * DTO para consultar cupones con filtros
 */
export class GetCouponsQueryDto {
  @IsOptional()
  @IsString()
  search?: string; // Buscar por código o descripción

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @IsOptional()
  @IsEnum(["percentage", "fixed_amount"])
  discountType?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  onlyValid?: boolean; // Solo cupones dentro de fecha de validez

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  onlyAvailable?: boolean; // Solo cupones con usos disponibles

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
 * DTO para obtener estadísticas de uso de cupón
 */
export class GetCouponStatsDto {
  @IsMongoId()
  couponId: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;
}

/**
 * DTO de respuesta para validación de cupón
 */
export class CouponValidationResponseDto {
  isValid: boolean;
  code: string;
  message?: string;
  discountAmount?: number;
  discountType?: string;
  discountValue?: number;
  finalAmount?: number;
  couponId?: string;
}

/**
 * DTO de respuesta para estadísticas de cupón
 */
export class CouponStatsResponseDto {
  couponId: string;
  code: string;
  totalUsageCount: number;
  maxUsageCount?: number;
  remainingUses?: number;
  totalDiscountAmount: number;
  totalOrderAmount: number;
  averageDiscountAmount: number;
  uniqueCustomers: number;
  usageByDate: Array<{
    date: string;
    count: number;
    discountAmount: number;
  }>;
}
