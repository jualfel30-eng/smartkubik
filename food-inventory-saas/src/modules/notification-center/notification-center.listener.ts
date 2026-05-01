import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { NotificationCenterService } from "./notification-center.service";
import { NOTIFICATION_TYPES } from "../../schemas/notification.schema";

@Injectable()
export class NotificationCenterListener {
  private readonly logger = new Logger(NotificationCenterListener.name);

  constructor(private readonly notificationService: NotificationCenterService) { }

  private formatDate(value: Date | string | undefined | null): string {
    if (!value) return "";
    const d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString("es");
  }

  // ================== SALES EVENTS ==================

  @OnEvent("order.created")
  async handleOrderCreated(payload: {
    orderId: string;
    tenantId: string;
    customerId?: string;
    orderNumber?: string;
    customerName?: string;
    totalAmount?: number;
    source?: string;
  }) {
    this.logger.log(`Handling order.created for order ${payload.orderId}`);

    try {
      await this.notificationService.create(
        {
          category: "sales",
          type: NOTIFICATION_TYPES.ORDER_CREATED,
          title: `Nueva orden #${payload.orderNumber || payload.orderId.slice(-6)} - Pago pendiente`,
          message: payload.customerName
            ? `${payload.customerName} - $${(payload.totalAmount || 0).toFixed(2)}`
            : `Total: $${(payload.totalAmount || 0).toFixed(2)}`,
          priority: "low",
          entityType: "order",
          entityId: payload.orderId,
          navigateTo: `/orders/history?orderId=${payload.orderId}`,
          metadata: {
            orderNumber: payload.orderNumber,
            customerName: payload.customerName,
            total: payload.totalAmount,
            source: payload.source,
            status: "pending",
          },
        },
        payload.tenantId,
        { broadcast: true },
      );
    } catch (error) {
      this.logger.error(
        `Failed to create notification for order.created: ${error.message}`,
      );
    }
  }

  @OnEvent("order.paid")
  async handleOrderPaid(payload: {
    orderId: string;
    tenantId: string;
    customerId?: string;
    orderNumber?: string;
    customerName?: string;
    totalAmount?: number;
    paidAmount?: number;
    source?: string;
  }) {
    this.logger.log(`Handling order.paid for order ${payload.orderId}`);

    try {
      await this.notificationService.create(
        {
          category: "sales",
          type: NOTIFICATION_TYPES.ORDER_PAID,
          title: `✅ Venta completada #${payload.orderNumber || payload.orderId.slice(-6)}`,
          message: payload.customerName
            ? `${payload.customerName} - $${(payload.paidAmount || 0).toFixed(2)}`
            : `Total pagado: $${(payload.paidAmount || 0).toFixed(2)}`,
          priority: "high",
          entityType: "order",
          entityId: payload.orderId,
          navigateTo: `/orders/history?orderId=${payload.orderId}`,
          metadata: {
            orderNumber: payload.orderNumber,
            customerName: payload.customerName,
            totalAmount: payload.totalAmount,
            paidAmount: payload.paidAmount,
            source: payload.source,
            status: "paid",
          },
        },
        payload.tenantId,
        { broadcast: true },
      );
    } catch (error) {
      this.logger.error(
        `Failed to create notification for order.paid: ${error.message}`,
      );
    }
  }

  @OnEvent("order.fulfillment.updated")
  async handleFulfillmentUpdate(payload: {
    order: any;
    previousStatus: string;
    newStatus: string;
    tenantId: string;
  }) {
    const { order, previousStatus, newStatus, tenantId } = payload;

    // Only notify on significant status changes
    const notifyStatuses = [
      "confirmed",
      "picking",
      "packed",
      "shipped",
      "in_transit",
      "delivered",
      "cancelled",
    ];
    if (!notifyStatuses.includes(newStatus)) {
      return;
    }

    this.logger.log(
      `Handling order.fulfillment.updated for order ${order.orderNumber}: ${previousStatus} -> ${newStatus}`,
    );

    const statusMessages: Record<string, string> = {
      confirmed: "confirmada",
      picking: "en preparacion",
      packed: "empacada",
      shipped: "enviada",
      in_transit: "en camino",
      delivered: "entregada",
      cancelled: "cancelada",
    };

    try {
      await this.notificationService.create(
        {
          category: "sales",
          type: NOTIFICATION_TYPES.ORDER_FULFILLED,
          title: `Orden #${order.orderNumber} ${statusMessages[newStatus] || newStatus}`,
          message: `Estado actualizado de ${previousStatus} a ${newStatus}`,
          priority: newStatus === "cancelled" ? "high" : "medium",
          entityType: "order",
          entityId: order._id?.toString() || order.id,
          navigateTo: `/orders/history?orderId=${order._id || order.id}`,
          metadata: {
            orderNumber: order.orderNumber,
            previousStatus,
            newStatus,
          },
        },
        tenantId,
        { broadcast: true },
      );
    } catch (error) {
      this.logger.error(
        `Failed to create notification for order.fulfillment.updated: ${error.message}`,
      );
    }
  }

  // ================== INVENTORY EVENTS ==================

  @OnEvent("inventory.alert.triggered")
  async handleInventoryAlert(payload: {
    productName: string;
    productId: string;
    alertType: "low_stock" | "expiring_soon";
    currentStock?: number;
    minimumStock?: number;
    expirationDate?: Date;
    tenantId: string;
  }) {
    const {
      productName,
      productId,
      alertType,
      currentStock,
      minimumStock,
      expirationDate,
      tenantId,
    } = payload;

    this.logger.log(
      `Handling inventory.alert.triggered for product ${productName}: ${alertType}`,
    );

    const isExpiring = alertType === "expiring_soon";

    try {
      await this.notificationService.create(
        {
          category: "inventory",
          type: isExpiring
            ? NOTIFICATION_TYPES.INVENTORY_EXPIRING
            : NOTIFICATION_TYPES.INVENTORY_LOW_STOCK,
          title: isExpiring
            ? `Producto por vencer: ${productName}`
            : `Stock bajo: ${productName}`,
          message: isExpiring
            ? `Vence el ${expirationDate ? new Date(expirationDate).toLocaleDateString("es") : "pronto"}`
            : `Stock actual: ${currentStock} / Minimo: ${minimumStock}`,
          priority: "high",
          entityType: "product",
          entityId: productId,
          navigateTo: `/inventory-management?productId=${productId}`,
          metadata: {
            productName,
            alertType,
            currentStock,
            minimumStock,
            expirationDate,
          },
        },
        tenantId,
        { broadcast: true },
      );
    } catch (error) {
      this.logger.error(
        `Failed to create notification for inventory.alert.triggered: ${error.message}`,
      );
    }
  }

  // ================== HR EVENTS ==================

  @OnEvent("employee.created")
  async handleEmployeeCreated(payload: {
    employeeId: string;
    employeeName?: string;
    position?: string;
    department?: string;
    tenantId: string;
  }) {
    const employeeName = payload.employeeName || "Empleado";
    this.logger.log(`Handling employee.created for ${employeeName}`);

    try {
      await this.notificationService.create(
        {
          category: "hr",
          type: NOTIFICATION_TYPES.EMPLOYEE_CREATED,
          title: "Nuevo empleado registrado",
          message: payload.position
            ? `${employeeName} - ${payload.position}`
            : employeeName,
          priority: "low",
          entityType: "employee",
          entityId: payload.employeeId,
          navigateTo: `/payroll/employees?id=${payload.employeeId}`,
          metadata: {
            employeeName,
            position: payload.position,
            department: payload.department,
          },
        },
        payload.tenantId,
        { broadcast: true },
      );
    } catch (error) {
      this.logger.error(
        `Failed to create notification for employee.created: ${error.message}`,
      );
    }
  }

  @OnEvent("payroll.run.pending")
  async handlePayrollPending(payload: {
    runId: string;
    label?: string;
    periodStart: Date | string;
    periodEnd: Date | string;
    totalEmployees?: number;
    netPay?: number;
    currency?: string;
    tenantId: string;
  }) {
    const periodLabel =
      payload.label ||
      `${this.formatDate(payload.periodStart)} - ${this.formatDate(payload.periodEnd)}`;
    this.logger.log(`Handling payroll.run.pending for period ${periodLabel}`);

    try {
      const employeeCount = payload.totalEmployees ?? 0;
      const netPay = payload.netPay ?? 0;
      const currency = payload.currency || "VES";
      await this.notificationService.create(
        {
          category: "hr",
          type: NOTIFICATION_TYPES.PAYROLL_PENDING,
          title: "Nomina pendiente de procesamiento",
          message: `${periodLabel} - ${employeeCount} empleados - ${netPay.toFixed(2)} ${currency}`,
          priority: "high",
          entityType: "payrollRun",
          entityId: payload.runId,
          navigateTo: `/payroll/runs?id=${payload.runId}`,
          metadata: {
            label: payload.label,
            periodStart: payload.periodStart,
            periodEnd: payload.periodEnd,
            totalEmployees: employeeCount,
            netPay,
            currency,
          },
        },
        payload.tenantId,
        { broadcast: true },
      );
    } catch (error) {
      this.logger.error(
        `Failed to create notification for payroll.run.pending: ${error.message}`,
      );
    }
  }

  @OnEvent("payroll.run.completed")
  async handlePayrollCompleted(payload: {
    runId: string;
    label?: string;
    periodStart: Date | string;
    periodEnd: Date | string;
    totalEmployees?: number;
    netPay?: number;
    currency?: string;
    tenantId: string;
  }) {
    const periodLabel =
      payload.label ||
      `${this.formatDate(payload.periodStart)} - ${this.formatDate(payload.periodEnd)}`;
    this.logger.log(`Handling payroll.run.completed for period ${periodLabel}`);

    try {
      const employeeCount = payload.totalEmployees ?? 0;
      const netPay = payload.netPay ?? 0;
      const currency = payload.currency || "VES";
      await this.notificationService.create(
        {
          category: "hr",
          type: NOTIFICATION_TYPES.PAYROLL_COMPLETED,
          title: "Nomina procesada exitosamente",
          message: `${periodLabel} - ${netPay.toFixed(2)} ${currency} (${employeeCount} empleados)`,
          priority: "medium",
          entityType: "payrollRun",
          entityId: payload.runId,
          navigateTo: `/payroll/runs?id=${payload.runId}`,
          metadata: {
            label: payload.label,
            periodStart: payload.periodStart,
            periodEnd: payload.periodEnd,
            totalEmployees: employeeCount,
            netPay,
            currency,
          },
        },
        payload.tenantId,
        { broadcast: true },
      );
    } catch (error) {
      this.logger.error(
        `Failed to create notification for payroll.run.completed: ${error.message}`,
      );
    }
  }

  // ================== FINANCE EVENTS ==================

  @OnEvent("payable.due.approaching")
  async handlePayableDue(payload: {
    payableId: string;
    payableNumber?: string;
    payeeName?: string;
    totalAmount?: number;
    dueDate: Date | string;
    tenantId: string;
  }) {
    const payeeName = payload.payeeName || "Proveedor";
    this.logger.log(`Handling payable.due.approaching for ${payeeName}`);

    try {
      const amount = payload.totalAmount ?? 0;
      const dueDateStr = this.formatDate(payload.dueDate);
      const refNumber = payload.payableNumber ? ` #${payload.payableNumber}` : "";
      await this.notificationService.create(
        {
          category: "finance",
          type: NOTIFICATION_TYPES.PAYABLE_DUE,
          title: `Pago proximo a vencer${refNumber}`,
          message: `${payeeName} - $${amount.toFixed(2)} (Vence: ${dueDateStr})`,
          priority: "high",
          entityType: "payable",
          entityId: payload.payableId,
          navigateTo: `/accounts-payable?id=${payload.payableId}`,
          metadata: {
            payableNumber: payload.payableNumber,
            payeeName,
            totalAmount: amount,
            dueDate: payload.dueDate,
          },
        },
        payload.tenantId,
        { broadcast: true },
      );
    } catch (error) {
      this.logger.error(
        `Failed to create notification for payable.due.approaching: ${error.message}`,
        { stack: error.stack },
      );
    }
  }

  @OnEvent("bank.balance.low")
  async handleBankLowBalance(payload: {
    accountId: string;
    bankName: string;
    currentBalance: number;
    minimumBalance: number;
    currency: string;
    tenantId: string;
  }) {
    this.logger.log(`Handling bank.balance.low for ${payload.bankName}`);

    try {
      const currentBalance = payload.currentBalance ?? 0;
      const minimumBalance = payload.minimumBalance ?? 0;
      await this.notificationService.create(
        {
          category: "finance",
          type: NOTIFICATION_TYPES.BANK_LOW_BALANCE,
          title: `Saldo bajo: ${payload.bankName}`,
          message: `Saldo actual: ${currentBalance.toFixed(2)} ${payload.currency} (Minimo: ${minimumBalance.toFixed(2)})`,
          priority: "high",
          entityType: "bankAccount",
          entityId: payload.accountId,
          navigateTo: `/bank-accounts?id=${payload.accountId}`,
          metadata: {
            bankName: payload.bankName,
            currentBalance,
            minimumBalance,
            currency: payload.currency,
          },
        },
        payload.tenantId,
        { broadcast: true },
      );
    } catch (error) {
      this.logger.error(
        `Failed to create notification for bank.balance.low: ${error.message}`,
      );
    }
  }

  @OnEvent("billing.document.issued")
  async handleBillingIssued(payload: {
    documentId: string;
    type?: string;
    documentNumber: string;
    customerName?: string;
    total?: number;
    currency?: string;
    tenantId: string;
  }) {
    this.logger.log(
      `Handling billing.document.issued for ${payload.documentNumber}`,
    );

    try {
      const total = payload.total ?? 0;
      const currency = payload.currency || "USD";
      const docType = payload.type || "documento";
      const totalLabel = currency === "USD" ? `$${total.toFixed(2)}` : `${total.toFixed(2)} ${currency}`;
      await this.notificationService.create(
        {
          category: "finance",
          type: NOTIFICATION_TYPES.BILLING_ISSUED,
          title: `Documento emitido: ${docType} #${payload.documentNumber}`,
          message: payload.customerName
            ? `${payload.customerName} - ${totalLabel}`
            : `Total: ${totalLabel}`,
          priority: "low",
          entityType: "billingDocument",
          entityId: payload.documentId,
          navigateTo: `/billing/documents/${payload.documentId}`,
          metadata: {
            type: docType,
            documentNumber: payload.documentNumber,
            customerName: payload.customerName,
            total,
            currency,
          },
        },
        payload.tenantId,
        { broadcast: true },
      );
    } catch (error) {
      this.logger.error(
        `Failed to create notification for billing.document.issued: ${error.message}`,
      );
    }
  }

  // ================== MARKETING EVENTS ==================

  @OnEvent("campaign.started")
  async handleCampaignStarted(payload: {
    campaignId: string;
    campaignName: string;
    recipientCount: number;
    channel: string;
    tenantId: string;
  }) {
    this.logger.log(`Handling campaign.started for ${payload.campaignName}`);

    try {
      await this.notificationService.create(
        {
          category: "marketing",
          type: NOTIFICATION_TYPES.CAMPAIGN_STARTED,
          title: `Campana iniciada: ${payload.campaignName}`,
          message: `Enviando a ${payload.recipientCount} destinatarios via ${payload.channel}`,
          priority: "medium",
          entityType: "campaign",
          entityId: payload.campaignId,
          navigateTo: `/marketing?tab=campaigns&id=${payload.campaignId}`,
          metadata: {
            campaignName: payload.campaignName,
            recipientCount: payload.recipientCount,
            channel: payload.channel,
          },
        },
        payload.tenantId,
        { broadcast: true },
      );
    } catch (error) {
      this.logger.error(
        `Failed to create notification for campaign.started: ${error.message}`,
      );
    }
  }

  @OnEvent("campaign.response")
  async handleCampaignResponse(payload: {
    campaignId: string;
    campaignName: string;
    responseType: string;
    customerName?: string;
    tenantId: string;
  }) {
    this.logger.log(
      `Handling campaign.response for ${payload.campaignName}: ${payload.responseType}`,
    );

    try {
      await this.notificationService.create(
        {
          category: "marketing",
          type: NOTIFICATION_TYPES.CAMPAIGN_RESPONSE,
          title: `Respuesta de campana: ${payload.campaignName}`,
          message: payload.customerName
            ? `${payload.customerName} - ${payload.responseType}`
            : payload.responseType,
          priority: "medium",
          entityType: "campaign",
          entityId: payload.campaignId,
          navigateTo: `/marketing?tab=campaigns&id=${payload.campaignId}`,
          metadata: {
            campaignName: payload.campaignName,
            responseType: payload.responseType,
            customerName: payload.customerName,
          },
        },
        payload.tenantId,
        { broadcast: true },
      );
    } catch (error) {
      this.logger.error(
        `Failed to create notification for campaign.response: ${error.message}`,
      );
    }
  }

  // ================== CALENDAR EVENTS ==================

  @OnEvent("calendar.event.reminder")
  async handleCalendarReminder(payload: {
    eventId: string;
    eventTitle: string;
    eventStart: Date;
    tenantId: string;
    userId?: string;
  }) {
    this.logger.log(`Handling calendar.event.reminder for ${payload.eventTitle}`);

    try {
      await this.notificationService.create(
        {
          userId: payload.userId,
          category: "system",
          type: "calendar.reminder",
          title: `Recordatorio: ${payload.eventTitle}`,
          message: `Evento programado para ${new Date(payload.eventStart).toLocaleString("es")}`,
          priority: "medium",
          entityType: "event",
          entityId: payload.eventId,
          navigateTo: `/calendar?eventId=${payload.eventId}`,
          metadata: {
            eventTitle: payload.eventTitle,
            eventStart: payload.eventStart,
          },
        },
        payload.tenantId,
        { broadcast: !payload.userId },
      );
    } catch (error) {
      this.logger.error(
        `Failed to create notification for calendar.event.reminder: ${error.message}`,
      );
    }
  }
}
