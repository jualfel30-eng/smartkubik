import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type PayrollLocalizationDocument = PayrollLocalization & Document;

export type PayrollLocalizationStatus = "draft" | "pending" | "active";

@Schema({ timestamps: true })
export class PayrollLocalization {
  @Prop({ type: Types.ObjectId, ref: "Tenant" })
  tenantId?: Types.ObjectId | null;

  @Prop({ type: String, required: true, index: true })
  country: string;

  @Prop({ type: Number, required: true, default: 1 })
  version: number;

  @Prop({ type: String })
  label?: string;

  @Prop({
    type: String,
    enum: ["draft", "pending", "active"],
    default: "draft",
    required: true,
  })
  status: PayrollLocalizationStatus;

  @Prop({ type: Date })
  validFrom?: Date;

  @Prop({ type: Date })
  validTo?: Date;

  @Prop({ type: Object, default: {} })
  rates?: Record<string, any>;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;
}

export const PayrollLocalizationSchema =
  SchemaFactory.createForClass(PayrollLocalization);

PayrollLocalizationSchema.index(
  { country: 1, version: -1, tenantId: 1 },
  { unique: false },
);
