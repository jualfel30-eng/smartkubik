import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type SupplierDocument = Supplier & Document;

@Schema()
export class SupplierContact {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  position: string;

  @Prop({ type: String })
  email?: string;

  @Prop({ type: String })
  phone?: string;

  @Prop({ type: Boolean, default: false })
  isPrimary: boolean;

  @Prop({ type: String })
  notes?: string;
}
const SupplierContactSchema = SchemaFactory.createForClass(SupplierContact);

@Schema()
export class SupplierPaymentTerm {
  @Prop({ type: String, required: true })
  method: string;

  @Prop({ type: Number, required: true })
  termDays: number;

  @Prop({ type: Number })
  discountPercentage?: number;

  @Prop({ type: Number })
  discountDays?: number;

  @Prop({ type: Boolean, default: false })
  isPreferred: boolean;
}
const SupplierPaymentTermSchema =
  SchemaFactory.createForClass(SupplierPaymentTerm);

@Schema()
export class SupplierPaymentSettings {
  @Prop({ type: Boolean, default: false })
  acceptsCredit: boolean;

  @Prop({ type: Number, default: 0 })
  defaultCreditDays: number; // 30, 60, 90 días

  @Prop({ type: Number, default: 0 })
  creditLimit: number; // Límite de crédito en USD/Bs

  @Prop({ type: [String], default: [] })
  acceptedPaymentMethods: string[]; // ['efectivo', 'transferencia', 'pago_movil', 'zelle', 'binance', 'paypal', etc.]

  @Prop({ type: [String], default: [] })
  customPaymentMethods: string[]; // Métodos personalizados agregados por el usuario

  @Prop({ type: String })
  preferredPaymentMethod?: string;

  @Prop({ type: Boolean, default: false })
  requiresAdvancePayment: boolean; // Requiere adelanto

  @Prop({ type: Number, default: 0 })
  advancePaymentPercentage?: number; // Porcentaje de adelanto (ej: 50%)

  @Prop({ type: String })
  paymentNotes?: string; // Notas sobre condiciones de pago
}
const SupplierPaymentSettingsSchema = SchemaFactory.createForClass(
  SupplierPaymentSettings,
);

@Schema({ timestamps: true })
export class Supplier {
  @Prop({ type: String, required: true })
  supplierNumber: string;

  @Prop({ type: String, required: false }) // DEPRECATED: Use Customer name
  name: string;

  @Prop({ type: String })
  tradeName?: string;

  @Prop({ type: String, required: true })
  supplierType: string;

  @Prop({ type: Object }) // DEPRECATED: Use Customer taxInfo
  taxInfo: {
    rif: string;
    businessName: string;
    isRetentionAgent: boolean;
    retentionPercentage?: number;
  };

  @Prop({ type: Object }) // DEPRECATED: Use Customer address
  address: {
    street: string;
    city: string;
    state: string;
    zipCode?: string;
    country: string;
  };

  @Prop({ type: [SupplierContactSchema] }) // DEPRECATED: Use Customer contacts
  contacts: SupplierContact[];

  @Prop({ type: [SupplierPaymentTermSchema] })
  paymentTerms: SupplierPaymentTerm[];

  @Prop({ type: SupplierPaymentSettingsSchema, default: {} })
  paymentSettings: SupplierPaymentSettings;

  @Prop({ type: [String] })
  categories: string[];

  @Prop({ type: Object })
  deliveryInfo: {
    leadTimeDays: number;
    minimumOrderAmount: number;
    deliveryZones: string[];
    deliveryCost: number;
    freeDeliveryThreshold?: number;
  };

  @Prop({ type: Object })
  qualityInfo: {
    certifications: string[];
    qualityRating: number;
    lastAuditDate?: Date;
    nextAuditDate?: Date;
    auditNotes?: string;
  };

  @Prop({ type: Object })
  metrics: {
    totalOrders: number;
    totalPurchased: number;
    averageOrderValue: number;
    lastOrderDate?: Date;
    onTimeDeliveryRate: number;
    qualityIssueRate: number;
    returnRate: number;
    paymentDelayDays: number;
  };

  @Prop({ type: String, required: true, default: "active" })
  status: string;

  @Prop({ type: String })
  inactiveReason?: string;

  @Prop({ type: Date })
  suspendedUntil?: Date;

  @Prop({ type: String })
  notes?: string;

  @Prop({ type: String })
  internalNotes?: string;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User" })
  assignedTo?: Types.ObjectId;

  @Prop({ type: String, ref: "Tenant", required: true })
  tenantId: string;

  @Prop({ type: Types.ObjectId, ref: "Customer" })
  customerId?: Types.ObjectId;
}

export const SupplierSchema = SchemaFactory.createForClass(Supplier);

// Índices para proveedores
SupplierSchema.index({ supplierNumber: 1, tenantId: 1 }, { unique: true });
SupplierSchema.index({ name: 1, tenantId: 1 });
SupplierSchema.index({ supplierType: 1, tenantId: 1 });
SupplierSchema.index({ "taxInfo.rif": 1, tenantId: 1 });
SupplierSchema.index({ status: 1, tenantId: 1 });
SupplierSchema.index({ categories: 1, tenantId: 1 });
SupplierSchema.index({ assignedTo: 1, tenantId: 1 });
SupplierSchema.index({ createdAt: -1, tenantId: 1 });

// Índice de texto para búsqueda
SupplierSchema.index({
  name: "text",
  tradeName: "text",
  supplierNumber: "text",
  "taxInfo.rif": "text",
});
