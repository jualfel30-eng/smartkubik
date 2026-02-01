import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { BillingService } from "../billing.service";
import { Tenant } from "../../../schemas/tenant.schema";
import { Order } from "../../../schemas/order.schema";

interface OrderPaidEvent {
  orderId: string;
  orderNumber: string;
  customerId?: string;
  customerName: string;
  totalAmount: number;
  paidAmount: number;
  tenantId: string;
  source: string;
}

/**
 * Listener que genera y emite facturas automáticamente cuando una orden es pagada,
 * si el tenant tiene habilitada la opción autoInvoiceOnPayment.
 */
@Injectable()
export class AutoBillingListener {
  private readonly logger = new Logger(AutoBillingListener.name);

  constructor(
    private readonly billingService: BillingService,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<Tenant>,
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
  ) {}

  @OnEvent("order.paid")
  async handleOrderPaid(event: OrderPaidEvent) {
    try {
      // 1. Verificar si el tenant tiene auto-facturación habilitada
      const tenant = await this.tenantModel
        .findOne({ tenantId: event.tenantId })
        .lean();

      if (!tenant?.settings?.billingPreferences?.autoInvoiceOnPayment) {
        return; // Auto-facturación no habilitada, salir silenciosamente
      }

      this.logger.log(
        `Auto-billing triggered for order ${event.orderNumber} (tenant: ${event.tenantId})`,
      );

      // 2. Obtener la orden completa para extraer items, totales y datos fiscales
      const order: any = await this.orderModel
        .findById(event.orderId)
        .lean();

      if (!order) {
        this.logger.warn(
          `Auto-billing: Order ${event.orderId} not found, skipping`,
        );
        return;
      }

      // 3. Verificar que no tenga ya una factura asociada
      if (order.billingDocumentId) {
        this.logger.log(
          `Auto-billing: Order ${event.orderNumber} already has billing document ${order.billingDocumentNumber}, skipping`,
        );
        return;
      }

      // 4. Obtener serie por defecto para el tipo de documento
      const docType =
        tenant.settings.billingPreferences.autoInvoiceDocumentType || "invoice";

      let seriesId: string;
      try {
        seriesId = await this.billingService.getDefaultSeriesId(
          event.tenantId,
          docType,
        );
      } catch {
        this.logger.error(
          `Auto-billing: No active series found for type "${docType}" in tenant ${event.tenantId}. ` +
            `Configure a default series to enable auto-billing.`,
        );
        return;
      }

      // 5. Construir items para el documento de facturación
      const items = (order.items || []).map((item: any) => ({
        product: item.productId,
        description: item.name || item.productName || "Producto",
        quantity: item.quantity,
        unitPrice: item.price,
        discount: item.discountType
          ? { type: item.discountType, value: item.discountValue || 0 }
          : undefined,
        tax: item.taxType
          ? { type: item.taxType, rate: item.taxRate || 0 }
          : undefined,
        total: item.subtotal || item.quantity * item.price,
      }));

      // 6. Construir totales
      const taxes: { type: string; rate: number; amount: number }[] = [];
      if (order.ivaTotal && order.ivaTotal > 0) {
        taxes.push({ type: "IVA", rate: 16, amount: order.ivaTotal });
      }
      if (order.igtfTotal && order.igtfTotal > 0) {
        taxes.push({ type: "IGTF", rate: 3, amount: order.igtfTotal });
      }

      const totals = {
        subtotal: order.subtotal || 0,
        taxes,
        discounts: order.discountAmount || 0,
        grandTotal: order.totalAmount || 0,
        currency: order.currency || "USD",
        exchangeRate: order.exchangeRate,
      };

      // 7. Determinar método de pago principal
      const mainPayment = (order.paymentRecords || []).reduce(
        (max: any, p: any) => (!max || p.amount > max.amount ? p : max),
        null,
      );

      // 8. Crear documento de facturación en draft
      const billingDoc = await this.billingService.create(
        {
          type: docType,
          seriesId,
          customerName: order.customerName || event.customerName,
          customerTaxId: order.customerRif,
          customerData: {
            address: order.customerAddress,
            email: order.customerEmail,
            phone: order.customerPhone,
          },
          items,
          totals,
          paymentMethod: mainPayment?.method,
          currency: totals.currency,
          exchangeRate: totals.exchangeRate,
          issueDate: new Date(),
          relatedOrderId: event.orderId,
        },
        event.tenantId,
      );

      this.logger.log(
        `Auto-billing: Created draft ${docType} ${billingDoc.documentNumber} for order ${event.orderNumber}`,
      );

      // 9. Emitir (issue) el documento para obtener número de control fiscal
      const issuedDoc = await this.billingService.issue(
        billingDoc._id.toString(),
        { orderId: event.orderId },
        event.tenantId,
      );

      this.logger.log(
        `Auto-billing: Issued ${docType} ${issuedDoc.documentNumber} ` +
          `(control: ${issuedDoc.controlNumber || "N/A"}) for order ${event.orderNumber}`,
      );
    } catch (error) {
      // No lanzar el error para no afectar otros listeners de order.paid
      this.logger.error(
        `Auto-billing failed for order ${event.orderNumber} (tenant: ${event.tenantId}): ${error.message}`,
        error.stack,
      );
    }
  }
}
