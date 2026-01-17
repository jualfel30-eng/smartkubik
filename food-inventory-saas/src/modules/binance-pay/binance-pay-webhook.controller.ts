import {
  Controller,
  Post,
  Headers,
  Body,
  RawBodyRequest,
  Req,
  HttpCode,
  Logger,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint } from "@nestjs/swagger";
import { Request } from "express";
import { BinancePayService } from "./binance-pay.service";

/**
 * Controller para recibir webhooks de Binance Pay
 *
 * IMPORTANTE: Este endpoint NO tiene autenticación JWT porque Binance
 * necesita poder enviar webhooks directamente. La autenticación se hace
 * mediante verificación de firma HMAC-SHA512.
 *
 * Documentación: https://developers.binance.com/docs/binance-pay/webhook
 */
@ApiTags("Binance Pay Webhooks")
@Controller("binance-pay")
export class BinancePayWebhookController {
  private readonly logger = new Logger(BinancePayWebhookController.name);

  constructor(private readonly binancePayService: BinancePayService) {}

  @Post("webhook")
  @HttpCode(200)
  @ApiOperation({ summary: "Recibir webhooks de Binance Pay" })
  @ApiResponse({
    status: 200,
    description: "Webhook procesado",
    schema: {
      type: "object",
      properties: {
        returnCode: { type: "string", example: "SUCCESS" },
        returnMessage: { type: "string", example: "OK" },
      },
    },
  })
  @ApiExcludeEndpoint() // Ocultar de Swagger público
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers("binancepay-timestamp") timestamp: string,
    @Headers("binancepay-nonce") nonce: string,
    @Headers("binancepay-signature") signature: string,
  ) {
    this.logger.log("Webhook de Binance Pay recibido");

    // Validar que los headers requeridos estén presentes
    if (!timestamp || !nonce || !signature) {
      this.logger.warn("Webhook sin headers de autenticación");
      return {
        returnCode: "FAIL",
        returnMessage: "Missing authentication headers",
      };
    }

    // Obtener el body raw para verificación de firma
    const rawBody = req.rawBody?.toString("utf-8") || JSON.stringify(req.body);

    this.logger.debug(`Webhook timestamp: ${timestamp}`);
    this.logger.debug(`Webhook nonce: ${nonce}`);
    this.logger.debug(`Webhook body length: ${rawBody.length}`);

    try {
      const result = await this.binancePayService.handleWebhook(
        rawBody,
        timestamp,
        nonce,
        signature,
      );

      this.logger.log(
        `Webhook procesado: ${result.returnCode} - ${result.returnMessage}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Error procesando webhook: ${error.message}`,
        error.stack,
      );

      return {
        returnCode: "FAIL",
        returnMessage: "Internal error",
      };
    }
  }

  /**
   * Endpoint de health check para verificar que el webhook está accesible
   * Binance puede usar esto para verificar la conectividad
   */
  @Post("webhook/health")
  @HttpCode(200)
  @ApiOperation({ summary: "Health check del endpoint de webhook" })
  async webhookHealth() {
    return {
      returnCode: "SUCCESS",
      returnMessage: "Webhook endpoint is healthy",
      timestamp: new Date().toISOString(),
    };
  }
}
