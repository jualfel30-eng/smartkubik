import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";

/**
 * Interfaz de respuesta base de Binance Pay API
 */
interface BinancePayResponse<T = any> {
  status: "SUCCESS" | "FAIL";
  code: string;
  data?: T;
  errorMessage?: string;
}

/**
 * Respuesta de creación de orden
 */
export interface CreateOrderResponse {
  prepayId: string;
  terminalType: string;
  expireTime: number;
  qrcodeLink: string;
  qrContent: string;
  checkoutUrl: string;
  deeplink: string;
  universalUrl: string;
}

/**
 * Respuesta de consulta de orden
 */
export interface QueryOrderResponse {
  merchantId: number;
  prepayId: string;
  merchantTradeNo: string;
  status: string;
  currency: string;
  orderAmount: string;
  transactTime?: number;
  createTime: number;
  transactionId?: string;
  openUserId?: string;
  paymentInfo?: {
    paymentMethod?: string;
    payerId?: string;
    instructedAmount?: string;
    instructedCurrency?: string;
  };
}

/**
 * Respuesta de reembolso
 */
export interface RefundResponse {
  refundId: string;
  prepayId: string;
  orderAmount: string;
  refundedAmount: string;
  refundAmount: string;
  remainingAttempts: number;
  payerOpenId: string;
  duplicateRequest: string;
}

/**
 * Provider para comunicación con Binance Pay API
 * Documentación: https://developers.binance.com/docs/binance-pay/api-order-create-v2
 */
@Injectable()
export class BinancePayApiProvider {
  private readonly logger = new Logger(BinancePayApiProvider.name);
  private readonly apiBaseUrl: string;
  private readonly apiKey: string;
  private readonly apiSecret: string;

  constructor(private readonly configService: ConfigService) {
    // Determinar si estamos en sandbox o producción
    const isSandbox = this.configService.get<string>("BINANCE_PAY_SANDBOX") === "true";

    this.apiBaseUrl = isSandbox
      ? "https://bpay.binanceapi.com" // Sandbox
      : "https://bpay.binanceapi.com"; // Production (misma URL, diferente API key)

    this.apiKey = this.configService.get<string>("BINANCE_PAY_API_KEY") || "";
    this.apiSecret = this.configService.get<string>("BINANCE_PAY_API_SECRET") || "";
  }

  /**
   * Genera el timestamp en milisegundos
   */
  private getTimestamp(): string {
    return Date.now().toString();
  }

  /**
   * Genera un nonce aleatorio de 32 caracteres
   */
  private generateNonce(): string {
    return crypto.randomBytes(16).toString("hex").toUpperCase();
  }

  /**
   * Genera la firma HMAC-SHA512 para la API
   */
  private generateSignature(
    timestamp: string,
    nonce: string,
    body: string,
  ): string {
    const payload = `${timestamp}\n${nonce}\n${body}\n`;
    return crypto
      .createHmac("sha512", this.apiSecret)
      .update(payload)
      .digest("hex")
      .toUpperCase();
  }

  /**
   * Ejecuta una petición a la API de Binance Pay
   */
  private async request<T>(
    endpoint: string,
    body: Record<string, any>,
  ): Promise<BinancePayResponse<T>> {
    const timestamp = this.getTimestamp();
    const nonce = this.generateNonce();
    const bodyString = JSON.stringify(body);
    const signature = this.generateSignature(timestamp, nonce, bodyString);

    const url = `${this.apiBaseUrl}${endpoint}`;

    this.logger.debug(`Binance Pay API Request: ${endpoint}`);
    this.logger.debug(`Body: ${bodyString}`);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "BinancePay-Timestamp": timestamp,
          "BinancePay-Nonce": nonce,
          "BinancePay-Certificate-SN": this.apiKey,
          "BinancePay-Signature": signature,
        },
        body: bodyString,
      });

      const data = await response.json();

      this.logger.debug(`Binance Pay API Response: ${JSON.stringify(data)}`);

      return data as BinancePayResponse<T>;
    } catch (error) {
      this.logger.error(`Binance Pay API Error: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Crea una orden de pago
   * Documentación: https://developers.binance.com/docs/binance-pay/api-order-create-v2
   */
  async createOrder(params: {
    merchantTradeNo: string;
    orderAmount: number;
    currency: string;
    productName: string;
    productDetail?: string;
    returnUrl?: string;
    cancelUrl?: string;
    webhookUrl?: string;
    buyerEmail?: string;
    buyerName?: string;
  }): Promise<BinancePayResponse<CreateOrderResponse>> {
    const body = {
      env: {
        terminalType: "WEB",
      },
      merchantTradeNo: params.merchantTradeNo,
      orderAmount: params.orderAmount.toFixed(2),
      currency: params.currency,
      goods: {
        goodsType: "02", // Virtual goods
        goodsCategory: "Z000", // Others
        referenceGoodsId: params.merchantTradeNo,
        goodsName: params.productName,
        goodsDetail: params.productDetail || params.productName,
      },
      buyer: params.buyerEmail
        ? {
            buyerEmail: params.buyerEmail,
            buyerName: params.buyerName,
          }
        : undefined,
      returnUrl: params.returnUrl,
      cancelUrl: params.cancelUrl,
      webhookUrl: params.webhookUrl,
    };

    // Remover campos undefined
    Object.keys(body).forEach((key) => {
      if (body[key] === undefined) {
        delete body[key];
      }
    });

    return this.request<CreateOrderResponse>(
      "/binancepay/openapi/v2/order",
      body,
    );
  }

  /**
   * Consulta el estado de una orden
   * Documentación: https://developers.binance.com/docs/binance-pay/api-order-query-v2
   */
  async queryOrder(params: {
    merchantTradeNo?: string;
    prepayId?: string;
  }): Promise<BinancePayResponse<QueryOrderResponse>> {
    if (!params.merchantTradeNo && !params.prepayId) {
      throw new Error("Either merchantTradeNo or prepayId is required");
    }

    const body: Record<string, string> = {};
    if (params.merchantTradeNo) {
      body.merchantTradeNo = params.merchantTradeNo;
    }
    if (params.prepayId) {
      body.prepayId = params.prepayId;
    }

    return this.request<QueryOrderResponse>(
      "/binancepay/openapi/v2/order/query",
      body,
    );
  }

  /**
   * Cancela una orden pendiente
   * Documentación: https://developers.binance.com/docs/binance-pay/api-order-close
   */
  async closeOrder(params: {
    merchantTradeNo?: string;
    prepayId?: string;
  }): Promise<BinancePayResponse<{ status: string }>> {
    if (!params.merchantTradeNo && !params.prepayId) {
      throw new Error("Either merchantTradeNo or prepayId is required");
    }

    const body: Record<string, string> = {};
    if (params.merchantTradeNo) {
      body.merchantTradeNo = params.merchantTradeNo;
    }
    if (params.prepayId) {
      body.prepayId = params.prepayId;
    }

    return this.request("/binancepay/openapi/order/close", body);
  }

  /**
   * Solicita un reembolso
   * Documentación: https://developers.binance.com/docs/binance-pay/api-order-refund
   */
  async refundOrder(params: {
    refundRequestId: string;
    prepayId: string;
    refundAmount: number;
    refundReason?: string;
  }): Promise<BinancePayResponse<RefundResponse>> {
    const body = {
      refundRequestId: params.refundRequestId,
      prepayId: params.prepayId,
      refundAmount: params.refundAmount.toFixed(2),
      refundReason: params.refundReason || "Refund requested",
    };

    return this.request<RefundResponse>(
      "/binancepay/openapi/order/refund",
      body,
    );
  }

  /**
   * Verifica la firma de un webhook
   * Documentación: https://developers.binance.com/docs/binance-pay/webhook
   */
  verifyWebhookSignature(
    payload: string,
    timestamp: string,
    nonce: string,
    signature: string,
  ): boolean {
    const expectedSignature = this.generateSignature(timestamp, nonce, payload);

    // Comparación segura contra timing attacks
    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      );
    } catch {
      return false;
    }
  }

  /**
   * Verifica si las credenciales están configuradas
   */
  isConfigured(): boolean {
    return !!(this.apiKey && this.apiSecret);
  }

  /**
   * Obtiene el modo actual (sandbox/production)
   */
  getEnvironment(): "sandbox" | "production" {
    return this.configService.get<string>("BINANCE_PAY_SANDBOX") === "true"
      ? "sandbox"
      : "production";
  }
}
