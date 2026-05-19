import { Body, Controller, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../../decorators/public.decorator";
import { CreatePaymentIntentDto } from "./dto";
import { StripePayService } from "./stripe-pay.service";

@ApiTags("Stripe Pay (Public)")
@Controller("public/stripe")
export class StripePayPublicController {
  constructor(private readonly stripePayService: StripePayService) {}

  @Public()
  @Post("payment-intent")
  @ApiOperation({
    summary:
      "Crea (o reutiliza) un PaymentIntent de Stripe para una orden existente",
  })
  async createPaymentIntent(@Body() dto: CreatePaymentIntentDto) {
    const result = await this.stripePayService.createOrRetrievePaymentIntent({
      tenantId: dto.tenantId,
      orderId: dto.orderId,
      customerEmail: dto.customerEmail,
      customerName: dto.customerName,
    });

    return {
      success: true,
      data: result,
    };
  }
}
