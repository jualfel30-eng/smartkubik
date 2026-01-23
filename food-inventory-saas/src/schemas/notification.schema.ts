import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type NotificationDocument = Notification & Document;

export type NotificationCategory =
  | "sales"
  | "inventory"
  | "hr"
  | "finance"
  | "marketing"
  | "system";

export type NotificationPriority = "low" | "medium" | "high" | "critical";

export const NOTIFICATION_TYPES = {
  // Sales
  ORDER_CREATED: "order.created",
  ORDER_CONFIRMED: "order.confirmed",
  ORDER_FULFILLED: "order.fulfilled",
  ORDER_CANCELLED: "order.cancelled",
  ORDER_PAID: "order.paid",
  // Inventory
  INVENTORY_LOW_STOCK: "inventory.low_stock",
  INVENTORY_EXPIRING: "inventory.expiring",
  INVENTORY_RECEIVED: "inventory.received",
  // HR
  EMPLOYEE_CREATED: "employee.created",
  PAYROLL_PENDING: "payroll.pending",
  PAYROLL_COMPLETED: "payroll.completed",
  ABSENCE_REQUEST: "absence.request",
  // Finance
  PAYABLE_DUE: "payable.due",
  PAYMENT_RECEIVED: "payment.received",
  BANK_LOW_BALANCE: "bank.low_balance",
  BILLING_ISSUED: "billing.issued",
  // Marketing
  CAMPAIGN_STARTED: "campaign.started",
  CAMPAIGN_RESPONSE: "campaign.response",
  WHATSAPP_MESSAGE: "whatsapp.message",
  // System
  SYSTEM_ALERT: "system.alert",
  SYSTEM_MAINTENANCE: "system.maintenance",
} as const;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  /**
   * Usuario específico destinatario de la notificación.
   * Si es null, la notificación es broadcast a todos los usuarios del tenant.
   */
  @Prop({ type: Types.ObjectId, ref: "User", index: true })
  userId?: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    enum: ["sales", "inventory", "hr", "finance", "marketing", "system"],
    index: true,
  })
  category: NotificationCategory;

  @Prop({
    type: String,
    required: true,
  })
  type: string;

  @Prop({ type: String, required: true, trim: true })
  title: string;

  @Prop({ type: String, trim: true })
  message?: string;

  @Prop({
    type: String,
    enum: ["low", "medium", "high", "critical"],
    default: "medium",
  })
  priority: NotificationPriority;

  @Prop({ type: Boolean, default: false, index: true })
  isRead: boolean;

  @Prop({ type: Date })
  readAt?: Date;

  @Prop({ type: Types.ObjectId, ref: "User" })
  readBy?: Types.ObjectId;

  /**
   * Tipo de entidad relacionada para navegación
   */
  @Prop({ type: String })
  entityType?: string;

  /**
   * ID de la entidad relacionada
   */
  @Prop({ type: String })
  entityId?: string;

  /**
   * Ruta frontend para navegar al hacer click
   * Ej: '/orders/123', '/inventario?productId=456'
   */
  @Prop({ type: String })
  navigateTo?: string;

  /**
   * Metadata adicional específica del tipo de notificación
   */
  @Prop({ type: Object })
  metadata?: Record<string, any>;

  /**
   * Canales por los que se despachó la notificación
   */
  @Prop({ type: [String], default: ["in-app"] })
  dispatchedChannels: string[];

  @Prop({ type: Boolean, default: false })
  emailSent: boolean;

  @Prop({ type: Boolean, default: false })
  whatsappSent: boolean;

  /**
   * Soft delete - marca la notificación como eliminada sin borrarla
   */
  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop({ type: Date })
  deletedAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Indexes para queries frecuentes
NotificationSchema.index({
  tenantId: 1,
  userId: 1,
  isRead: 1,
  createdAt: -1,
});
NotificationSchema.index({ tenantId: 1, category: 1, createdAt: -1 });
NotificationSchema.index({ tenantId: 1, createdAt: -1 });
NotificationSchema.index({ tenantId: 1, isRead: 1 });
NotificationSchema.index({ tenantId: 1, isDeleted: 1 });
