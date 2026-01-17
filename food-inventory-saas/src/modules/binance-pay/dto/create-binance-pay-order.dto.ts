import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsEmail,
  Min,
  MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { BinancePayTransactionType } from "../../../schemas/binance-pay-transaction.schema";

export class CreateBinancePayOrderDto {
  @ApiProperty({
    description: "Tipo de transacción",
    enum: BinancePayTransactionType,
    example: BinancePayTransactionType.SUBSCRIPTION,
  })
  @IsEnum(BinancePayTransactionType)
  transactionType: BinancePayTransactionType;

  @ApiPropertyOptional({
    description: "ID del plan de suscripción (requerido si transactionType es subscription)",
    example: "507f1f77bcf86cd799439011",
  })
  @IsOptional()
  @IsString()
  subscriptionPlanId?: string;

  @ApiProperty({
    description: "Nombre del producto o servicio",
    example: "Plan Pro - Suscripción Mensual",
  })
  @IsString()
  @MaxLength(256)
  productName: string;

  @ApiPropertyOptional({
    description: "Detalle adicional del producto",
    example: "Acceso completo a todas las funcionalidades por 30 días",
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  productDetail?: string;

  @ApiProperty({
    description: "Monto a cobrar",
    example: 29.99,
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01)
  orderAmount: number;

  @ApiPropertyOptional({
    description: "Moneda del pago (default: USDT)",
    example: "USDT",
    default: "USDT",
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    description: "Email del comprador para notificaciones",
    example: "cliente@ejemplo.com",
  })
  @IsOptional()
  @IsEmail()
  buyerEmail?: string;

  @ApiPropertyOptional({
    description: "Nombre del comprador",
    example: "Juan Pérez",
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  buyerName?: string;

  @ApiPropertyOptional({
    description: "Metadatos adicionales para la transacción",
    example: { referralCode: "ABC123" },
  })
  @IsOptional()
  metadata?: Record<string, any>;
}
