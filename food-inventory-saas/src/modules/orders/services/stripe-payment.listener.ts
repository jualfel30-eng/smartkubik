import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import {
  STRIPE_PAYMENT_SUCCEEDED_EVENT,
  StripePaymentSucceededEvent,
} from "../../stripe-pay/stripe-pay.service";
import { OrdersService } from "../orders.service";

/**
 * Listener desacoplado: cuando Stripe confirma un pago vía webhook,
 * StripePayService emite STRIPE_PAYMENT_SUCCEEDED_EVENT y este listener
 * registra el pago en la orden a través del flujo estándar
 * `OrdersService.registerPayments()`.
 *
 * Esto reusa toda la lógica existente (paymentRecords, paymentStatus,
 * backflush BOM, OUT movements, evento order.paid). El método de pago se
 * persiste como `stripe_card_usd` y NO genera IGTF (no está en la lista
 * de igtfApplicableMethods de PaymentsService).
 */
@Injectable()
export class StripePaymentListener {
  private readonly logger = new Logger(StripePaymentListener.name);

  constructor(private readonly ordersService: OrdersService) {}

  @OnEvent(STRIPE_PAYMENT_SUCCEEDED_EVENT, { async: true })
  async onStripePaymentSucceeded(
    payload: StripePaymentSucceededEvent,
  ): Promise<void> {
    this.logger.log(
      `Stripe payment succeeded — registrando en orden ${payload.orderNumber}: $${payload.amountUsd} (${payload.cardBrand} ****${payload.cardLast4})`,
    );

    const reference = payload.cardLast4
      ? `${payload.paymentIntentId} (${payload.cardBrand || "card"} ****${payload.cardLast4})`
      : payload.paymentIntentId;

    const syntheticUser = {
      tenantId: payload.tenantId,
      id: "system-stripe-webhook",
      role: { name: "system", permissions: [] },
      isSystem: true,
    };

    try {
      await this.ordersService.registerPayments(
        payload.orderId,
        {
          payments: [
            {
              method: "stripe_card_usd",
              amount: payload.amountUsd,
              currency: "USD",
              exchangeRate: 1,
              reference,
              isConfirmed: true,
              date: new Date().toISOString(),
              idempotencyKey: payload.paymentIntentId,
            } as any,
          ],
        } as any,
        syntheticUser,
      );

      this.logger.log(
        `Orden ${payload.orderNumber} marcada como pagada vía Stripe (${payload.paymentIntentId})`,
      );
    } catch (error) {
      this.logger.error(
        `Error registrando pago Stripe en orden ${payload.orderNumber}: ${error.message}`,
        error.stack,
      );
      // No relanzamos: el webhook ya devolvió 200 a Stripe. Si registramos el
      // PaymentIntent como SUCCEEDED en stripepaymentintents pero falla acá,
      // operaciones puede reconciliar manualmente desde admin.
    }
  }
}
