import { Injectable, Logger } from "@nestjs/common";
import { WhatsAppService } from "../../marketing/whatsapp.service";
import { NotificationCenterService } from "../../notification-center/notification-center.service";
import { PaymentRequestDocument } from "../schemas/payment-request.schema";

/**
 * Notification fan-out for PaymentRequest lifecycle events.
 *
 * Two sinks:
 *   - WhatsApp (customer-facing): portal link + reject reasons.
 *   - Notification Center (tenant-facing): in-app + Socket.IO + web-push,
 *     reusing the existing infra. Type-discriminated under category "finance".
 *
 * Every method is best-effort — failures are logged but never thrown, so a
 * notification outage doesn't break the underlying flow.
 */
@Injectable()
export class PaymentRequestNotificationsService {
  private readonly logger = new Logger(
    PaymentRequestNotificationsService.name,
  );

  constructor(
    private readonly whatsapp: WhatsAppService,
    private readonly notificationCenter: NotificationCenterService,
  ) {}

  // ────────────────────────────────────────────────────────────────────
  // WhatsApp (customer)
  // ────────────────────────────────────────────────────────────────────

  async sendPortalLinkViaWhatsApp(
    pr: PaymentRequestDocument,
    normalizedPhone: string,
    portalUrl: string,
  ): Promise<void> {
    const amount = this.formatAmount(pr.amountDue, pr.currency);
    const customerName = pr.entitySnapshot.customerName?.trim() || "Hola";
    const body = [
      `${customerName} 👋`,
      ``,
      `Aquí está el enlace para confirmar tu pago de ${amount}:`,
      portalUrl,
      ``,
      `Sigue las instrucciones y sube tu comprobante. Si tienes dudas, responde este mensaje.`,
    ].join("\n");

    const result = await this.whatsapp.sendTextMessage(
      pr.tenantId.toString(),
      normalizedPhone,
      body,
    );

    if (!result?.success) {
      throw new Error(result?.error || "whatsapp_send_failed");
    }
  }

  async sendStatusChangeViaWhatsApp(
    pr: PaymentRequestDocument,
    normalizedPhone: string,
    portalUrl: string,
    reason: string,
    note?: string,
  ): Promise<void> {
    const headline = this.statusHeadline(reason);
    const body = [
      `Recibimos tu comprobante para el pago de ${this.formatAmount(pr.amountDue, pr.currency)}.`,
      ``,
      headline,
      note ? `\nDetalle: ${note}` : "",
      ``,
      `Para corregirlo, abre este enlace:`,
      portalUrl,
    ]
      .filter(Boolean)
      .join("\n");

    const result = await this.whatsapp.sendTextMessage(
      pr.tenantId.toString(),
      normalizedPhone,
      body,
    );

    if (!result?.success) {
      throw new Error(result?.error || "whatsapp_send_failed");
    }
  }

  // ────────────────────────────────────────────────────────────────────
  // Notification Center (tenant)
  // ────────────────────────────────────────────────────────────────────

  /**
   * Fires when a customer submits a proof — the admin needs to know there's
   * something to review. Broadcast to every user in the tenant; the front-end
   * filters by permission `payment_requests_review`.
   */
  async notifyProofSubmitted(pr: PaymentRequestDocument): Promise<void> {
    await this.dispatch(pr, {
      type: "payment-request.submitted",
      priority: "high",
      title: "Nuevo comprobante por revisar",
      message: `${pr.entitySnapshot.customerName || "Cliente"} envió un comprobante por ${this.formatAmount(pr.amountDue, pr.currency)}`,
      navigateTo: `/payment-requests/${pr._id}`,
    });
  }

  async notifyConfirmed(pr: PaymentRequestDocument): Promise<void> {
    await this.dispatch(pr, {
      type: "payment-request.confirmed",
      priority: "medium",
      title: "Pago confirmado",
      message: `${pr.entitySnapshot.customerName || "Cliente"} — ${this.formatAmount(pr.amountDue, pr.currency)}`,
      navigateTo: `/payment-requests/${pr._id}`,
    });
  }

  async notifyStatusChange(
    pr: PaymentRequestDocument,
    context: { reason: string; note?: string; rejectedProofId?: string },
  ): Promise<void> {
    // Tenant-side dispatch
    await this.dispatch(pr, {
      type: "payment-request.status-changed",
      priority: "medium",
      title: `Solicitud actualizada (${pr.status})`,
      message: context.note,
      navigateTo: `/payment-requests/${pr._id}`,
    });

    // Customer-side WhatsApp dispatch (best-effort)
    const phone = pr.delivery.deliveredTo;
    if (phone) {
      try {
        await this.sendStatusChangeViaWhatsApp(
          pr,
          phone,
          this.buildPortalUrl(pr.token),
          context.reason,
          context.note,
        );
      } catch (err: any) {
        this.logger.warn(
          `WhatsApp status-change send failed for PR ${pr._id}: ${err.message}`,
        );
      }
    }
  }

  /**
   * Quiet, tenant-only fan-out. Used for states the customer shouldn't be
   * notified about (awaiting_settlement) or admin-internal events.
   */
  async notifyInternalStatusChange(
    pr: PaymentRequestDocument,
  ): Promise<void> {
    await this.dispatch(pr, {
      type: "payment-request.status-changed",
      priority: "low",
      title: `Solicitud actualizada (${pr.status})`,
      navigateTo: `/payment-requests/${pr._id}`,
    });
  }

  // ────────────────────────────────────────────────────────────────────
  // Internals
  // ────────────────────────────────────────────────────────────────────

  private async dispatch(
    pr: PaymentRequestDocument,
    opts: {
      type: string;
      priority: "low" | "medium" | "high" | "critical";
      title: string;
      message?: string;
      navigateTo?: string;
    },
  ): Promise<void> {
    try {
      await this.notificationCenter.create(
        {
          category: "finance",
          type: opts.type,
          title: opts.title,
          message: opts.message,
          priority: opts.priority,
          entityType: "payment_request",
          entityId: pr._id.toString(),
          navigateTo: opts.navigateTo,
          metadata: {
            paymentRequestId: pr._id.toString(),
            entityType: pr.entityType,
            entityId: pr.entityId.toString(),
            status: pr.status,
            amountDue: pr.amountDue,
            currency: pr.currency,
          },
        },
        pr.tenantId.toString(),
        { broadcast: true },
      );
    } catch (err: any) {
      this.logger.warn(
        `Notification center dispatch failed for PR ${pr._id}: ${err.message}`,
      );
    }
  }

  private formatAmount(amount: number, currency: "USD" | "VES"): string {
    const formatted = amount.toLocaleString("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return currency === "USD" ? `$${formatted}` : `${formatted} Bs`;
  }

  private statusHeadline(reason: string): string {
    switch (reason) {
      case "info_mismatch":
        return "Necesitamos que revises algunos datos del comprobante.";
      case "proof_unclear":
        return "La imagen no se ve clara. ¿Puedes subir otra foto?";
      case "partial":
        return "Recibimos parte del pago. ¿Puedes completar el monto restante?";
      case "rejected_final":
        return "Esta solicitud quedó cerrada. Contacta al negocio para más detalles.";
      default:
        return "Hay una actualización en tu solicitud de pago.";
    }
  }

  private buildPortalUrl(token: string): string {
    const base = process.env.STOREFRONT_PUBLIC_URL || "http://localhost:3001";
    const trimmed = base.endsWith("/") ? base.slice(0, -1) : base;
    return `${trimmed}/pago/${token}`;
  }
}
