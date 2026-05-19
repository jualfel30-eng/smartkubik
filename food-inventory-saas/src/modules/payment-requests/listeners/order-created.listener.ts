import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  TenantPaymentConfig,
  TenantPaymentConfigDocument,
} from "../../../schemas/tenant-payment-config.schema";
import { Tenant, TenantDocument } from "../../../schemas/tenant.schema";
import { Order, OrderDocument } from "../../../schemas/order.schema";
import { PaymentRequestsService } from "../services/payment-requests.service";

interface OrderCreatedPayload {
  orderId: string;
  tenantId: string;
  orderNumber?: string;
  customerName?: string;
  totalAmount?: number;
  source?: string;
}

/**
 * Auto-issues a PaymentRequest when:
 *  1. The order originated from the storefront (`source === 'storefront'`).
 *  2. The tenant has opted in via TenantPaymentConfig.requirePaymentProof.
 *  3. The order isn't already paid AND has at least one non-cash active
 *     payment method configured in Tenant.settings.paymentMethods (the
 *     store the admin's PaymentMethodsSettings page writes to).
 *
 * Everything else (POS, WhatsApp, API, manual) uses the manual "Solicitar
 * comprobante" admin button instead — that's the on-demand path covered by
 * PR3. The spec is explicit: never block order creation on delivery
 * failures, never bulk-send WhatsApp.
 */
@Injectable()
export class PaymentRequestOrderCreatedListener {
  private readonly logger = new Logger(PaymentRequestOrderCreatedListener.name);

  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(TenantPaymentConfig.name)
    private readonly tenantPaymentConfigModel: Model<TenantPaymentConfigDocument>,
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>,
    private readonly paymentRequestsService: PaymentRequestsService,
  ) {}

  @OnEvent("order.created")
  async handleOrderCreated(payload: OrderCreatedPayload): Promise<void> {
    if (!payload?.orderId || !payload?.tenantId) {
      return;
    }
    if (payload.source !== "storefront") {
      return;
    }

    try {
      const config = await this.tenantPaymentConfigModel.findOne({
        tenantId: payload.tenantId,
      });
      if (!config || !config.requirePaymentProof) {
        return;
      }

      // Source of truth for the tenant's real bank info is
      // Tenant.settings.paymentMethods (the admin writes here). Fall back to
      // TenantPaymentConfig.paymentMethods only if the admin hasn't
      // configured anything yet — preserves the legacy direct-endpoint path.
      const tenant: any = await this.tenantModel
        .findById(payload.tenantId)
        .select({ "settings.paymentMethods": 1 })
        .lean();
      const adminMethods: any[] = tenant?.settings?.paymentMethods || [];

      const nonCashActiveAdmin = adminMethods.find(
        (m) => m.enabled && !/cash|efectivo/i.test(m.id || ""),
      );
      const nonCashActiveConfig = (config.paymentMethods || []).find(
        (m: any) => m.isActive && !/cash|efectivo/i.test(m.methodId || ""),
      );
      const chosenMethodId =
        nonCashActiveAdmin?.id || (nonCashActiveConfig as any)?.methodId;

      if (!chosenMethodId) {
        this.logger.debug(
          `Skipping PaymentRequest auto-create for order ${payload.orderId}: tenant ${payload.tenantId} has no non-cash active method`,
        );
        return;
      }

      if (!Types.ObjectId.isValid(payload.orderId)) return;

      const order = await this.orderModel
        .findOne({
          _id: new Types.ObjectId(payload.orderId),
        })
        .select({ paymentStatus: 1, customerPhone: 1 });

      if (!order) {
        this.logger.warn(
          `order.created listener: order ${payload.orderId} not found`,
        );
        return;
      }

      if (order.paymentStatus && order.paymentStatus !== "pending") {
        this.logger.debug(
          `Skipping PaymentRequest for order ${payload.orderId}: paymentStatus=${order.paymentStatus}`,
        );
        return;
      }

      await this.paymentRequestsService.create(
        payload.tenantId,
        {
          entityType: "order",
          entityId: payload.orderId,
          methodId: chosenMethodId,
          deliveryPhone: order.customerPhone,
          deliveryChannel: order.customerPhone ? "whatsapp" : "manual",
        },
        { kind: "system" },
      );

      this.logger.log(
        `Auto-issued PaymentRequest for storefront order ${payload.orderNumber || payload.orderId}`,
      );
    } catch (err) {
      // Order creation is already committed at this point. Never throw —
      // a failure here just leaves the order without an auto-issued PR;
      // the admin can manually issue it via the same code path in PR3.
      this.logger.error(
        `Auto-issue PaymentRequest failed for order ${payload.orderId}: ${err?.message}`,
        err?.stack,
      );
    }
  }
}
