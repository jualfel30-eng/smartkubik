import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import StripeFactory from "stripe";
import { Order } from "../../schemas/order.schema";

// Tipos derivados — ver nota en stripe-api.provider.ts.
type StripeClient = InstanceType<typeof StripeFactory>;
type StripeEvent = ReturnType<StripeClient["webhooks"]["constructEvent"]>;
type StripePaymentIntentObject = Awaited<
  ReturnType<StripeClient["paymentIntents"]["retrieve"]>
>;
import {
  StripePaymentIntent,
  StripePaymentIntentDocument,
  StripePaymentIntentStatus,
} from "../../schemas/stripe-payment-intent.schema";
import { StripeApiProvider } from "./stripe-api.provider";

export const STRIPE_PAYMENT_SUCCEEDED_EVENT = "stripe.payment_intent.succeeded";

export interface StripePaymentSucceededEvent {
  tenantId: string;
  orderId: string;
  orderNumber: string;
  paymentIntentId: string;
  amountUsd: number;
  livemode: boolean;
  cardBrand?: string;
  cardLast4?: string;
  receiptUrl?: string;
  customerEmail?: string;
}

export interface CreateIntentResult {
  clientSecret: string;
  publishableKey: string;
  paymentIntentId: string;
  orderNumber: string;
  amountCents: number;
  currency: string;
}

@Injectable()
export class StripePayService {
  private readonly logger = new Logger(StripePayService.name);

  constructor(
    @InjectModel(StripePaymentIntent.name)
    private readonly intentModel: Model<StripePaymentIntentDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<Order>,
    private readonly stripe: StripeApiProvider,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Crea (o reutiliza) un PaymentIntent para una orden.
   *
   * Idempotente por (tenantId, orderId): si ya existe un intent activo se devuelve.
   * Si el intent previo está cancelado o falló, se crea uno nuevo.
   *
   * Verifica ownership: la orden debe pertenecer al tenantId solicitado.
   */
  async createOrRetrievePaymentIntent(params: {
    tenantId: string;
    orderId: string;
    customerEmail?: string;
    customerName?: string;
  }): Promise<CreateIntentResult> {
    if (!this.stripe.isConfigured()) {
      throw new BadRequestException(
        "Stripe no está configurado en este servidor",
      );
    }

    if (!Types.ObjectId.isValid(params.orderId)) {
      throw new BadRequestException("orderId inválido");
    }

    const order = await this.orderModel
      .findOne({
        _id: new Types.ObjectId(params.orderId),
        tenantId: params.tenantId,
      })
      .lean();

    if (!order) {
      throw new NotFoundException("Orden no encontrada para este tenant");
    }

    if (order.paymentStatus === "paid") {
      throw new BadRequestException("La orden ya está pagada");
    }

    const totalAmount = Number(order.totalAmount);
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      throw new BadRequestException("totalAmount inválido en la orden");
    }
    const amountCents = Math.round(totalAmount * 100);

    const existing = await this.intentModel
      .findOne({
        tenantId: params.tenantId,
        orderId: order._id,
      })
      .exec();

    if (existing) {
      const stale = ["canceled", "succeeded"].includes(existing.status);
      if (!stale) {
        // Reutiliza: trae el clientSecret directo de Stripe (no lo persistimos)
        const fresh = await this.stripe.retrievePaymentIntent(
          existing.stripePaymentIntentId,
        );
        if (fresh.amount !== amountCents) {
          // El total cambió — cancelar y crear nuevo
          await this.stripe.cancelPaymentIntent(fresh.id);
          existing.status = StripePaymentIntentStatus.CANCELED;
          existing.statusHistory.push({
            status: StripePaymentIntentStatus.CANCELED,
            changedAt: new Date(),
            eventType: "amount_mismatch_recreate",
          });
          await existing.save();
        } else {
          return {
            clientSecret: fresh.client_secret as string,
            publishableKey: this.stripe.getPublishableKey(),
            paymentIntentId: fresh.id,
            orderNumber: order.orderNumber,
            amountCents,
            currency: existing.currency,
          };
        }
      }
    }

    const idempotencyKey = `order_${order._id.toString()}_${amountCents}`;
    const stripeIntent = await this.stripe.createPaymentIntent({
      amountCents,
      currency: "usd",
      customerEmail: params.customerEmail || order.customerEmail,
      customerName: params.customerName || order.customerName,
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      tenantId: params.tenantId,
      idempotencyKey,
    });

    if (existing) {
      existing.stripePaymentIntentId = stripeIntent.id;
      existing.amountCents = amountCents;
      existing.status = stripeIntent.status as StripePaymentIntentStatus;
      existing.livemode = stripeIntent.livemode;
      existing.customerEmail = params.customerEmail || order.customerEmail;
      existing.customerName = params.customerName || order.customerName;
      existing.statusHistory.push({
        status: stripeIntent.status,
        changedAt: new Date(),
        eventType: "recreated",
      });
      await existing.save();
    } else {
      await this.intentModel.create({
        tenantId: params.tenantId,
        orderId: order._id,
        orderNumber: order.orderNumber,
        stripePaymentIntentId: stripeIntent.id,
        amountCents,
        currency: "usd",
        status: stripeIntent.status,
        livemode: stripeIntent.livemode,
        customerEmail: params.customerEmail || order.customerEmail,
        customerName: params.customerName || order.customerName,
        statusHistory: [
          {
            status: stripeIntent.status,
            changedAt: new Date(),
            eventType: "created",
          },
        ],
      });
    }

    return {
      clientSecret: stripeIntent.client_secret as string,
      publishableKey: this.stripe.getPublishableKey(),
      paymentIntentId: stripeIntent.id,
      orderNumber: order.orderNumber,
      amountCents,
      currency: "usd",
    };
  }

  /**
   * Procesa un webhook firmado de Stripe.
   * Devuelve el documento actualizado o null si el evento no aplica.
   *
   * Dedupe por event.id: si ya fue procesado, retorna sin re-aplicar efectos.
   *
   * NOTA (PR 1): solo persiste el estado. La integración con OrderPaymentsService
   * para marcar la orden como `paid` se hace en PR 2.
   */
  async handleWebhookEvent(
    rawBody: Buffer | string,
    signature: string,
  ): Promise<{
    eventId: string;
    eventType: string;
    intentId?: string;
    duplicate: boolean;
    applied: boolean;
  }> {
    let event: StripeEvent;
    try {
      event = this.stripe.constructWebhookEvent(rawBody, signature);
    } catch (err) {
      this.logger.warn(`Stripe webhook firma inválida: ${err.message}`);
      throw new BadRequestException("Firma de webhook inválida");
    }

    this.logger.log(
      `Stripe webhook recibido: ${event.type} (${event.id}, livemode=${event.livemode})`,
    );

    const intentObj = this.extractIntent(event);
    if (!intentObj) {
      return {
        eventId: event.id,
        eventType: event.type,
        duplicate: false,
        applied: false,
      };
    }

    const doc = await this.intentModel
      .findOne({ stripePaymentIntentId: intentObj.id })
      .exec();

    if (!doc) {
      this.logger.warn(
        `Stripe webhook recibido para PaymentIntent desconocido: ${intentObj.id}`,
      );
      return {
        eventId: event.id,
        eventType: event.type,
        intentId: intentObj.id,
        duplicate: false,
        applied: false,
      };
    }

    const alreadyProcessed = doc.processedWebhookEvents.some(
      (e) => e.eventId === event.id,
    );
    if (alreadyProcessed) {
      return {
        eventId: event.id,
        eventType: event.type,
        intentId: intentObj.id,
        duplicate: true,
        applied: false,
      };
    }

    doc.status = intentObj.status as StripePaymentIntentStatus;
    doc.statusHistory.push({
      status: intentObj.status,
      changedAt: new Date(),
      eventType: event.type,
    });
    doc.processedWebhookEvents.push({
      eventId: event.id,
      eventType: event.type,
      receivedAt: new Date(),
    });

    if (event.type === "payment_intent.succeeded") {
      const charge = (intentObj as any).latest_charge;
      if (charge && typeof charge === "object") {
        doc.stripeChargeId = charge.id;
        doc.receiptUrl = charge.receipt_url || undefined;
        const pmDetails = charge.payment_method_details;
        if (pmDetails) {
          doc.paymentMethodType = pmDetails.type;
          if (pmDetails.card) {
            doc.cardBrand = pmDetails.card.brand;
            doc.cardLast4 = pmDetails.card.last4;
          }
        }
      }
      doc.webhookProcessed = true;
      doc.webhookProcessedAt = new Date();
    }

    if (event.type === "payment_intent.payment_failed") {
      doc.lastError = (intentObj.last_payment_error as any) || undefined;
    }

    await doc.save();

    if (event.type === "payment_intent.succeeded") {
      const payload: StripePaymentSucceededEvent = {
        tenantId: doc.tenantId,
        orderId: doc.orderId.toString(),
        orderNumber: doc.orderNumber,
        paymentIntentId: doc.stripePaymentIntentId,
        amountUsd: doc.amountCents / 100,
        livemode: doc.livemode,
        cardBrand: doc.cardBrand,
        cardLast4: doc.cardLast4,
        receiptUrl: doc.receiptUrl,
        customerEmail: doc.customerEmail,
      };
      this.eventEmitter.emit(STRIPE_PAYMENT_SUCCEEDED_EVENT, payload);
      this.logger.log(
        `Emitted ${STRIPE_PAYMENT_SUCCEEDED_EVENT} for order ${doc.orderNumber} ($${payload.amountUsd})`,
      );
    }

    return {
      eventId: event.id,
      eventType: event.type,
      intentId: intentObj.id,
      duplicate: false,
      applied: true,
    };
  }

  private extractIntent(event: StripeEvent): StripePaymentIntentObject | null {
    const obj = (event.data?.object as any) || null;
    if (obj && obj.object === "payment_intent") {
      return obj as StripePaymentIntentObject;
    }
    return null;
  }

  async findByOrderId(
    tenantId: string,
    orderId: string,
  ): Promise<StripePaymentIntentDocument | null> {
    if (!Types.ObjectId.isValid(orderId)) return null;
    return this.intentModel
      .findOne({ tenantId, orderId: new Types.ObjectId(orderId) })
      .exec();
  }
}
