import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { WhatsAppService } from "../marketing/whatsapp.service";
import { TenantPaymentConfig } from "../../schemas/tenant-payment-config.schema";
import { OrderDocument } from "../../schemas/order.schema";
import { StorefrontConfig } from "../../schemas/storefront-config.schema";

@Injectable()
export class WhatsAppOrderNotificationsService {
  private readonly logger = new Logger(WhatsAppOrderNotificationsService.name);

  constructor(
    private readonly whatsappService: WhatsAppService,
    @InjectModel(TenantPaymentConfig.name)
    private tenantPaymentConfigModel: Model<TenantPaymentConfig>,
    @InjectModel(StorefrontConfig.name)
    private storefrontConfigModel: Model<StorefrontConfig>,
  ) {}

  /**
   * Send order confirmation with payment instructions via WhatsApp
   */
  async sendOrderConfirmation(order: OrderDocument): Promise<void> {
    try {
      if (!order.customerPhone) {
        this.logger.warn(
          `Cannot send WhatsApp notification for order ${order.orderNumber}: no customer phone`,
        );
        return;
      }

      // Get storefront config to check if WhatsApp is enabled
      const storefrontConfig = await this.storefrontConfigModel.findOne({
        tenantId: order.tenantId,
      });

      if (
        !storefrontConfig?.whatsappIntegration?.enabled ||
        !storefrontConfig?.whatsappIntegration?.autoSendOrderConfirmation
      ) {
        this.logger.debug(
          `WhatsApp notifications disabled for tenant ${order.tenantId}`,
        );
        return;
      }

      // Get payment configuration
      const paymentConfig = await this.tenantPaymentConfigModel.findOne({
        tenantId: order.tenantId,
      });

      // Build confirmation message
      const message = await this.buildOrderConfirmationMessage(
        order,
        paymentConfig,
        storefrontConfig,
      );

      // Send WhatsApp message
      const phone = this.normalizePhoneNumber(order.customerPhone);
      await this.whatsappService.sendTextMessage(
        order.tenantId.toString(),
        phone,
        message,
        order.customerId?.toString(),
      );

      this.logger.log(
        `Order confirmation sent via WhatsApp for order ${order.orderNumber}`,
      );
    } catch (error) {
      this.logger.error(
        `Error sending WhatsApp order confirmation: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Build the order confirmation message with payment instructions
   */
  private async buildOrderConfirmationMessage(
    order: OrderDocument,
    paymentConfig: TenantPaymentConfig | null,
    storefrontConfig: any,
  ): Promise<string> {
    const lines: string[] = [];

    // Header
    lines.push(`✅ *Orden Confirmada #${order.orderNumber}*`);
    lines.push("");
    lines.push(`Hola ${order.customerName},`);
    lines.push(
      "Hemos recibido tu orden exitosamente. A continuación los detalles:",
    );
    lines.push("");

    // Order items
    lines.push("📦 *Productos:*");
    for (const item of order.items) {
      const price = (item.unitPrice * item.quantity).toFixed(2);
      lines.push(
        `• ${item.productName} x${item.quantity} ${item.selectedUnit || ""} - $${price}`,
      );
    }
    lines.push("");

    // Shipping info
    if (order.shipping) {
      lines.push("🚚 *Entrega:*");
      const methodLabels = {
        pickup: "Retiro en tienda",
        delivery: "Delivery a domicilio",
        envio_nacional: "Envío nacional",
      };
      lines.push(`Método: ${methodLabels[order.shipping.method] || order.shipping.method}`);

      if (order.shipping.method === "delivery" && order.shipping.address) {
        lines.push(
          `Dirección: ${order.shipping.address.street}, ${order.shipping.address.city}`,
        );
      }

      if (order.shipping.cost > 0) {
        lines.push(`Costo de envío: $${order.shipping.cost.toFixed(2)}`);
      }
      lines.push("");
    }

    // Totals
    lines.push("💰 *Total:*");
    if (order.subtotal !== order.totalAmount) {
      lines.push(`Subtotal: $${order.subtotal.toFixed(2)}`);
    }
    if (order.ivaTotal > 0) {
      lines.push(`IVA: $${order.ivaTotal.toFixed(2)}`);
    }
    if (order.igtfTotal > 0) {
      lines.push(`IGTF: $${order.igtfTotal.toFixed(2)}`);
    }
    if (order.shippingCost > 0) {
      lines.push(`Envío: $${order.shippingCost.toFixed(2)}`);
    }
    lines.push(`*TOTAL A PAGAR: $${order.totalAmount.toFixed(2)}*`);

    if (order.totalAmountVes > 0) {
      lines.push(`*(Bs. ${order.totalAmountVes.toFixed(2)})*`);
    }
    lines.push("");

    // Payment instructions
    if (
      paymentConfig &&
      paymentConfig.paymentMethods &&
      paymentConfig.paymentMethods.length > 0
    ) {
      lines.push("💳 *Métodos de Pago Disponibles:*");
      lines.push("");

      const activePaymentMethods = paymentConfig.paymentMethods.filter(
        (pm) => pm.isActive,
      );

      for (const method of activePaymentMethods) {
        lines.push(`*${method.name}*`);

        if (method.accountDetails) {
          const details = method.accountDetails;

          if (details.bankName) {
            lines.push(`Banco: ${details.bankName}`);
          }

          if (details.accountNumber) {
            lines.push(`Cuenta: ${details.accountNumber}`);
          }

          if (details.accountHolderName) {
            lines.push(`Titular: ${details.accountHolderName}`);
          }

          if (details.zelleEmail) {
            lines.push(`Zelle: ${details.zelleEmail}`);
          }

          if (details.pagoMovilPhone) {
            lines.push(`Pago Móvil: ${details.pagoMovilPhone}`);
            if (details.pagoMovilBank) {
              lines.push(`Banco: ${details.pagoMovilBank}`);
            }
            if (details.pagoMovilCI) {
              lines.push(`CI: ${details.pagoMovilCI}`);
            }
          }
        }

        if (method.instructions) {
          lines.push(method.instructions);
        }

        lines.push("");
      }

      if (paymentConfig.generalPaymentInstructions) {
        lines.push("ℹ️ *Instrucciones Generales:*");
        lines.push(paymentConfig.generalPaymentInstructions);
        lines.push("");
      }
    }

    // Footer with reference
    lines.push("---");
    lines.push(
      `📱 *Por favor, envía tu comprobante de pago respondiendo a este mensaje con el código:*`,
    );
    lines.push(`*${order.orderNumber}*`);
    lines.push("");
    lines.push("Gracias por tu compra! 🙏");

    if (storefrontConfig?.seo?.title) {
      lines.push(`- ${storefrontConfig.seo.title}`);
    }

    return lines.join("\n");
  }

  /**
   * Normalize phone number to WhatsApp format
   */
  private normalizePhoneNumber(phone: string): string {
    // Remove all non-numeric characters
    let normalized = phone.replace(/\D/g, "");

    // If doesn't start with country code, assume Venezuela (+58)
    if (!normalized.startsWith("58") && !normalized.startsWith("+58")) {
      // Remove leading 0 if present
      if (normalized.startsWith("0")) {
        normalized = normalized.substring(1);
      }
      normalized = "58" + normalized;
    }

    // Remove + if present
    normalized = normalized.replace("+", "");

    return normalized;
  }

  /**
   * Send delivery status update
   */
  async sendDeliveryUpdate(
    order: OrderDocument,
    status: string,
    customMessage?: string,
  ): Promise<void> {
    try {
      if (!order.customerPhone) {
        return;
      }

      const storefrontConfig = await this.storefrontConfigModel.findOne({
        tenantId: order.tenantId,
      });

      if (
        !storefrontConfig?.whatsappIntegration?.enabled ||
        !storefrontConfig?.whatsappIntegration?.sendDeliveryUpdates
      ) {
        return;
      }

      const statusMessages = {
        confirmed: "✅ Tu orden ha sido confirmada y está siendo preparada.",
        picking: "📦 Estamos preparando tu orden.",
        packed: "✅ Tu orden está lista.",
        in_transit: "🚚 Tu orden está en camino.",
        delivered: "🎉 Tu orden ha sido entregada. ¡Gracias por tu compra!",
        cancelled: "❌ Tu orden ha sido cancelada.",
      };

      const message =
        customMessage ||
        statusMessages[status] ||
        `Tu orden #${order.orderNumber} ha sido actualizada.`;

      const phone = this.normalizePhoneNumber(order.customerPhone);
      await this.whatsappService.sendTextMessage(
        order.tenantId.toString(),
        phone,
        `*Actualización de Orden #${order.orderNumber}*\n\n${message}`,
        order.customerId?.toString(),
      );

      this.logger.log(
        `Delivery status update sent via WhatsApp for order ${order.orderNumber}`,
      );
    } catch (error) {
      this.logger.error(
        `Error sending WhatsApp delivery update: ${error.message}`,
      );
    }
  }

  /**
   * Generate storefront link for WhatsApp sharing
   */
  async generateStorefrontLink(tenantId: string): Promise<string> {
    const storefrontConfig = await this.storefrontConfigModel.findOne({
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!storefrontConfig || !storefrontConfig.domain) {
      throw new Error("Storefront not configured for this tenant");
    }

    // Assuming domain is the full URL or subdomain
    const baseUrl = storefrontConfig.domain.startsWith("http")
      ? storefrontConfig.domain
      : `https://${storefrontConfig.domain}`;

    return baseUrl;
  }

  /**
   * Generate WhatsApp click-to-chat link with storefront URL
   */
  async generateWhatsAppStorefrontMessage(
    tenantId: string,
    customMessage?: string,
  ): Promise<{ phone: string; message: string; link: string }> {
    const storefrontConfig = await this.storefrontConfigModel.findOne({
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!storefrontConfig?.whatsappIntegration?.enabled) {
      throw new Error("WhatsApp integration not enabled");
    }

    const storefrontUrl = await this.generateStorefrontLink(tenantId);
    const businessPhone =
      storefrontConfig.whatsappIntegration.businessPhone ||
      storefrontConfig.contactInfo.phone;

    const message =
      customMessage ||
      storefrontConfig.whatsappIntegration.messageTemplate ||
      `¡Hola! 👋 Mira nuestro catálogo de productos aquí: ${storefrontUrl}`;

    const phone = this.normalizePhoneNumber(businessPhone);
    const whatsappLink = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    return {
      phone,
      message,
      link: whatsappLink,
    };
  }
}
