import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsMongoId,
  Min,
  MaxLength,
  IsDate,
  IsBoolean,
} from "class-validator";
import { Type } from "class-transformer";

/**
 * DTO para acumular puntos de lealtad
 */
export class EarnPointsDto {
  @IsMongoId()
  customerId: string;

  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount: number; // Monto de la compra para calcular puntos

  @IsOptional()
  @IsMongoId()
  orderId?: string; // Referencia a la orden que generó los puntos

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

/**
 * DTO para redimir puntos de lealtad
 */
export class RedeemPointsDto {
  @IsMongoId()
  customerId: string;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  points: number; // Cantidad de puntos a redimir

  @IsOptional()
  @IsMongoId()
  orderId?: string; // Orden donde se aplica la redención

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

/**
 * DTO para ajustar manualmente puntos
 */
export class AdjustPointsDto {
  @IsMongoId()
  customerId: string;

  @IsNumber()
  @Type(() => Number)
  points: number; // Puede ser positivo o negativo

  @IsString()
  @MaxLength(500)
  reason: string; // Razón del ajuste manual

  @IsEnum(["admin_adjustment", "correction", "bonus", "penalty"])
  type: string;
}

/**
 * DTO para obtener historial de puntos
 */
export class GetPointsHistoryDto {
  @IsOptional()
  @IsMongoId()
  customerId?: string;

  @IsOptional()
  @IsEnum(["earn", "redeem", "expire", "adjust"])
  type?: string;

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
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}

/**
 * DTO para actualizar configuración de loyalty
 */
export class UpdateLoyaltyConfigDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  pointsPerDollar?: number; // Cuántos puntos se ganan por cada dólar

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  pointsValue?: number; // Valor en dólares de cada punto

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minimumPointsToRedeem?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  pointsExpirationDays?: number; // 0 = nunca expiran

  @IsOptional()
  @IsBoolean()
  autoApplyRewards?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyOnPointsEarned?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyOnPointsExpiring?: boolean;
}

/**
 * DTO para obtener balance de puntos
 */
export class GetPointsBalanceDto {
  @IsMongoId()
  customerId: string;
}

/**
 * DTO de respuesta de transacción de puntos
 */
export class PointsTransactionResponseDto {
  id: string;
  customerId: string;
  customerName: string;
  type: "earn" | "redeem" | "expire" | "adjust";
  points: number;
  balance: number; // Balance después de la transacción
  description?: string;
  orderId?: string;
  createdAt: Date;
}

/**
 * DTO de respuesta de balance de puntos
 */
export class PointsBalanceResponseDto {
  customerId: string;
  customerName: string;
  tier: string;
  totalPoints: number;
  availablePoints: number;
  expiringPoints: number;
  expiringDate?: Date;
  pointsValue: number; // Valor en dólares de los puntos disponibles
}
