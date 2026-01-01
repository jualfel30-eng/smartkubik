import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import {
  IsString,
  IsBoolean,
  IsOptional,
  IsNumber,
  IsObject,
} from "class-validator";

export type TenantPaymentConfigDocument = TenantPaymentConfig & Document;

@Schema()
export class PaymentMethodConfig {
  @IsString()
  @Prop({ type: String, required: true })
  methodId: string; // 'efectivo_usd', 'transferencia_usd', 'zelle_usd', etc.

  @IsString()
  @Prop({ type: String, required: true })
  name: string; // Display name

  @IsBoolean()
  @IsOptional()
  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @IsBoolean()
  @IsOptional()
  @Prop({ type: Boolean, default: false })
  igtfApplicable: boolean;

  @IsString()
  @IsOptional()
  @Prop({ type: String })
  currency?: string; // 'USD', 'VES'

  @IsObject()
  @IsOptional()
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

  @IsString()
  @IsOptional()
  @Prop({ type: String })
  instructions?: string; // Custom instructions for customers

  @IsNumber()
  @IsOptional()
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
