import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type TenantPaymentConfigDocument = TenantPaymentConfig & Document;

@Schema()
export class PaymentMethodConfig {
  @Prop({ type: String, required: true })
  methodId: string; // 'efectivo_usd', 'transferencia_usd', 'zelle_usd', etc.

  @Prop({ type: String, required: true })
  name: string; // Display name

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Boolean, default: false })
  igtfApplicable: boolean;

  @Prop({ type: String })
  currency?: string; // 'USD', 'VES'

  @Prop({ type: Object })
  accountDetails?: {
    bankName?: string;
    accountNumber?: string;
    accountHolderName?: string;
    accountType?: string;
    routingNumber?: string;
    swiftCode?: string;
    zelleEmail?: string;
    zellePhone?: string;
    pagoMovilPhone?: string;
    pagoMovilBank?: string;
    pagoMovilCI?: string;
  };

  @Prop({ type: String })
  instructions?: string; // Custom instructions for customers

  @Prop({ type: Number, default: 0 })
  displayOrder: number; // Order in which to display the method
}
const PaymentMethodConfigSchema =
  SchemaFactory.createForClass(PaymentMethodConfig);

@Schema({ timestamps: true })
export class TenantPaymentConfig {
  @Prop({ type: String, ref: "Tenant", required: true, unique: true })
  tenantId: string;

  @Prop({ type: [PaymentMethodConfigSchema], default: [] })
  paymentMethods: PaymentMethodConfig[];

  @Prop({ type: Boolean, default: true })
  acceptCash: boolean;

  @Prop({ type: Boolean, default: true })
  acceptCards: boolean;

  @Prop({ type: Boolean, default: true })
  acceptTransfers: boolean;

  @Prop({ type: Boolean, default: false })
  requirePaymentConfirmation: boolean; // Require manual confirmation for online orders

  @Prop({ type: String })
  generalPaymentInstructions?: string; // General instructions shown to customers

  @Prop({ type: Types.ObjectId, ref: "User" })
  updatedBy?: Types.ObjectId;
}

export const TenantPaymentConfigSchema = SchemaFactory.createForClass(
  TenantPaymentConfig,
);

TenantPaymentConfigSchema.index({ tenantId: 1 }, { unique: true });
