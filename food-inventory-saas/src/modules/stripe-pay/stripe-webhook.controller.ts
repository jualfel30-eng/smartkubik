import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  RawBodyRequest,
  Req,
} from "@nestjs/common";
import {
  ApiExcludeEndpoint,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Request } from "express";
import { Public } from "../../decorators/public.decorator";
import { StripePayService } from "./stripe-pay.service";

/**
 * Webhook receiver para Stripe.
 *
 * IMPORTANTE: Stripe firma el webhook con el body crudo. main.ts ya captura
 * `req.rawBody = buf` en el verify hook de express.json, así que aquí lo
 * leemos directamente. NO llamar a JSON.stringify(req.body) — eso rompe la
 * firma porque el orden de keys puede cambiar.
 */
@ApiTags("Stripe Pay Webhooks")
@Controller("webhooks")
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(private readonly stripePayService: StripePayService) {}

  @Public()
  @Post("stripe")
  @HttpCode(200)
  @ApiOperation({ summary: "Recibe webhooks firmados de Stripe" })
  @ApiExcludeEndpoint()
  async handleStripe(
    @Req() req: RawBodyRequest<Request>,
    @Headers("stripe-signature") signature: string,
  ) {
    if (!signature) {
      this.logger.warn("Webhook Stripe sin header stripe-signature");
      throw new BadRequestException("Missing stripe-signature header");
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      this.logger.error(
        "rawBody no disponible — verifica que main.ts capture buf en express.json verify",
      );
      throw new BadRequestException("Raw body unavailable");
    }

    const result = await this.stripePayService.handleWebhookEvent(
      rawBody,
      signature,
    );

    this.logger.log(
      `Stripe webhook procesado: ${result.eventType} duplicate=${result.duplicate} applied=${result.applied}`,
    );

    return { received: true, ...result };
  }
}
