import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { PayableLine, PayableLineSchema } from "./payable.schema"; // Re-use PayableLine schema

export type RecurringPayableDocument = RecurringPayable & Document;

@Schema({ timestamps: true })
export class RecurringPayable {
  @Prop({ required: true, index: true })
  templateName: string; // e.g., "Alquiler Oficina Principal"

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true, enum: ["monthly", "quarterly", "yearly"] })
  frequency: string;

  @Prop({ required: true })
  startDate: Date;

  @Prop({ required: true })
  nextDueDate: Date;

  @Prop({ required: true, default: true })
  isActive: boolean;

  // --- Fields copied from Payable schema ---
  @Prop({
    required: true,
    enum: [
      "purchase_order",
      "payroll",
      "service_payment",
      "utility_bill",
      "other",
    ],
  })
  type: string;

  @Prop({ required: true, enum: ["supplier", "employee", "custom"] })
  payeeType: string;

  @Prop({ type: Types.ObjectId, refPath: "payeeType" })
  payeeId?: Types.ObjectId;

  @Prop({ required: true })
  payeeName: string;

  @Prop()
  description?: string;

  @Prop([PayableLineSchema])
  lines: PayableLine[];

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  createdBy: Types.ObjectId;

  @Prop()
  notes?: string;
}

export const RecurringPayableSchema =
  SchemaFactory.createForClass(RecurringPayable);

RecurringPayableSchema.index({ tenantId: 1, isActive: 1 });
