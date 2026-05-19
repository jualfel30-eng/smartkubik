import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import StripeFactory from "stripe";

// En Stripe v22 + module=commonjs, el namespace `Stripe` (PaymentIntent, Event,
// LatestApiVersion) no se merge con el constructor exportado. El runtime es
// idéntico — derivamos los tipos vía `InstanceType` y `Awaited<ReturnType<...>>`.
type StripeClient = InstanceType<typeof StripeFactory>;
type StripePaymentIntent = Awaited<
  ReturnType<StripeClient["paymentIntents"]["retrieve"]>
>;
type StripeEvent = ReturnType<StripeClient["webhooks"]["constructEvent"]>;

@Injectable()
export class StripeApiProvider {
  private readonly logger = new Logger(StripeApiProvider.name);
  private readonly client: StripeClient | null;
  private readonly secretKey: string;
  private readonly publishableKey: string;
  private readonly webhookSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.secretKey = this.configService.get<string>("STRIPE_SECRET_KEY") || "";
    this.publishableKey =
      this.configService.get<string>("STRIPE_PUBLISHABLE_KEY") || "";
    this.webhookSecret =
      this.configService.get<string>("STRIPE_WEBHOOK_SECRET") || "";

    if (this.secretKey) {
      this.client = new StripeFactory(this.secretKey, {
        // apiVersion lo decide la cuenta Stripe; en runtime se acepta cualquier
        // string válido. Se omite para usar el default de la cuenta y evitar
        // que se desincronice con releases del SDK.
        typescript: true,
        appInfo: {
          name: "smartkubik",
          version: "1.0.0",
        },
      } as any);
    } else {
      this.client = null;
      this.logger.warn(
        "STRIPE_SECRET_KEY no configurado. Stripe Pay deshabilitado.",
      );
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  getPublishableKey(): string {
    return this.publishableKey;
  }

  getEnvironment(): "test" | "live" {
    return this.secretKey.startsWith("sk_live_") ? "live" : "test";
  }

  /**
   * Crea un PaymentIntent en Stripe.
   * idempotencyKey debe ser estable por orden — usar el orderId.
   */
  async createPaymentIntent(params: {
    amountCents: number;
    currency: string;
    customerEmail?: string;
    customerName?: string;
    orderId: string;
    orderNumber: string;
    tenantId: string;
    idempotencyKey: string;
  }): Promise<StripePaymentIntent> {
    if (!this.client) {
      throw new Error("Stripe no está configurado");
    }

    return this.client.paymentIntents.create(
      {
        amount: params.amountCents,
        currency: params.currency.toLowerCase(),
        automatic_payment_methods: { enabled: true },
        receipt_email: params.customerEmail,
        description: `Order ${params.orderNumber}`,
        metadata: {
          tenantId: params.tenantId,
          orderId: params.orderId,
          orderNumber: params.orderNumber,
          ...(params.customerName ? { customerName: params.customerName } : {}),
        },
      },
      { idempotencyKey: params.idempotencyKey },
    );
  }

  async retrievePaymentIntent(intentId: string): Promise<StripePaymentIntent> {
    if (!this.client) {
      throw new Error("Stripe no está configurado");
    }
    return this.client.paymentIntents.retrieve(intentId, {
      expand: ["latest_charge"],
    });
  }

  async cancelPaymentIntent(intentId: string): Promise<StripePaymentIntent> {
    if (!this.client) {
      throw new Error("Stripe no está configurado");
    }
    return this.client.paymentIntents.cancel(intentId);
  }

  /**
   * Construye un evento verificado a partir del raw body + firma del header `stripe-signature`.
   * Lanza si la firma no es válida.
   */
  constructWebhookEvent(
    rawBody: string | Buffer,
    signature: string,
  ): StripeEvent {
    if (!this.client) {
      throw new Error("Stripe no está configurado");
    }
    if (!this.webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET no configurado");
    }
    return this.client.webhooks.constructEvent(
      rawBody,
      signature,
      this.webhookSecret,
    );
  }
}
