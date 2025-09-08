import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SupplierDocument = Supplier & Document;

@Schema()
export class SupplierContact {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  position: string;

  @Prop()
  email?: string;

  @Prop()
  phone?: string;

  @Prop({ default: false })
  isPrimary: boolean;

  @Prop()
  notes?: string;
}

@Schema()
export class SupplierPaymentTerm {
  @Prop({ required: true })
  method: string; // cash, transfer, check, credit

  @Prop({ required: true })
  termDays: number; // días de crédito

  @Prop()
  discountPercentage?: number; // descuento por pronto pago

  @Prop()
  discountDays?: number; // días para descuento

  @Prop({ default: false })
  isPreferred: boolean;
}

@Schema({ timestamps: true })
export class Supplier {
  @Prop({ required: true })
  supplierNumber: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  tradeName?: string;

  @Prop({ required: true })
  supplierType: string; // manufacturer, distributor, wholesaler, importer

  @Prop({ type: Object })
  taxInfo: {
    rif: string;
    businessName: string;
    isRetentionAgent: boolean;
    retentionPercentage?: number;
  };

  @Prop({ type: Object })
  address: {
    street: string;
    city: string;
    state: string;
    zipCode?: string;
    country: string;
  };

  @Prop([SupplierContact])
  contacts: SupplierContact[];

  @Prop([SupplierPaymentTerm])
  paymentTerms: SupplierPaymentTerm[];

  @Prop([String])
  categories: string[]; // categorías de productos que suministra

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
    certifications: string[]; // HACCP, ISO, etc.
    qualityRating: number; // 1-5
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

  @Prop({ required: true, default: 'active' })
  status: string; // active, inactive, suspended, blocked

  @Prop()
  inactiveReason?: string;

  @Prop()
  suspendedUntil?: Date;

  @Prop()
  notes?: string;

  @Prop()
  internalNotes?: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedTo?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true })
  tenantId: Types.ObjectId;
}

export const SupplierSchema = SchemaFactory.createForClass(Supplier);

// Índices para proveedores
SupplierSchema.index({ supplierNumber: 1, tenantId: 1 }, { unique: true });
SupplierSchema.index({ name: 1, tenantId: 1 });
SupplierSchema.index({ supplierType: 1, tenantId: 1 });
SupplierSchema.index({ 'taxInfo.rif': 1, tenantId: 1 });
SupplierSchema.index({ status: 1, tenantId: 1 });
SupplierSchema.index({ categories: 1, tenantId: 1 });
SupplierSchema.index({ assignedTo: 1, tenantId: 1 });
SupplierSchema.index({ createdAt: -1, tenantId: 1 });

// Índice de texto para búsqueda
SupplierSchema.index({ 
  name: 'text', 
  tradeName: 'text',
  supplierNumber: 'text',
  'taxInfo.rif': 'text'
});

