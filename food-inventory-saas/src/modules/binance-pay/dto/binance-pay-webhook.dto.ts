import { IsString, IsOptional, IsObject } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Tipos de eventos de webhook de Binance Pay
 */
export enum BinancePayWebhookEvent {
  PAY_SUCCESS = "PAY_SUCCESS",
  PAY_CLOSED = "PAY_CLOSED",
  PAY_REFUNDED = "PAY_REFUNDED",
}

/**
 * DTO para el payload del webhook de Binance Pay
 * Documentación: https://developers.binance.com/docs/binance-pay/webhook
 */
export class BinancePayWebhookDto {
  @ApiProperty({
    description: "Tipo de evento del webhook",
    example: "PAY_SUCCESS",
  })
  @IsString()
  bizType: string;

  @ApiProperty({
    description: "Datos del evento en formato JSON string",
  })
  @IsString()
  data: string;

  @ApiProperty({
    description: "ID del evento de Binance",
  })
  @IsString()
  bizId: string;

  @ApiProperty({
    description: "Timestamp del evento en milisegundos",
  })
  @IsString()
  bizIdStr: string;

  @ApiPropertyOptional({
    description: "Status del evento",
  })
  @IsOptional()
  @IsString()
  bizStatus?: string;
}

/**
 * Estructura de datos parseados del webhook PAY_SUCCESS
 */
export interface BinancePayWebhookPayData {
  merchantTradeNo: string;
  productType: string;
  productName: string;
  transactTime: number;
  tradeType: string;
  totalFee: number;
  currency: string;
  transactionId: string;
  openUserId?: string;
  payerInfo?: {
    firstName?: string;
    lastName?: string;
    walletId?: string;
    country?: string;
    city?: string;
    address?: string;
    identityType?: string;
    identityNumber?: string;
    dateOfBirth?: string;
    placeOfBirth?: string;
    nationality?: string;
  };
  commission?: number;
  paymentInfo?: {
    paymentMethod?: string;
    paymentId?: string;
    instructedAmount?: number;
    instructedCurrency?: string;
  };
}

/**
 * Estructura de datos parseados del webhook PAY_REFUNDED
 */
export interface BinancePayWebhookRefundData {
  merchantTradeNo: string;
  refundId: string;
  refundedAmount: number;
  refundedCurrency: string;
  transactionId: string;
  refundRequestId: string;
}

/**
 * Headers requeridos para validar webhooks de Binance Pay
 */
export interface BinancePayWebhookHeaders {
  "binancepay-timestamp": string;
  "binancepay-nonce": string;
  "binancepay-signature": string;
  "binancepay-certificate-sn"?: string;
}
