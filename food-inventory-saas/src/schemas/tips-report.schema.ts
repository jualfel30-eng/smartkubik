import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type TipsReportDocument = TipsReport & Document;

@Schema()
export class DailyTipsBreakdown {
  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({ type: Number, required: true, default: 0 })
  tips: number;

  @Prop({ type: Number, required: true, default: 0 })
  orders: number;
}

const DailyTipsBreakdownSchema =
  SchemaFactory.createForClass(DailyTipsBreakdown);

@Schema({ timestamps: true })
export class TipsReport {
  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "User", required: true, index: true })
  employeeId: Types.ObjectId;

  @Prop({
    type: {
      start: Date,
      end: Date,
    },
    required: true,
  })
  period: {
    start: Date;
    end: Date;
  };

  @Prop({ type: Number, required: true, default: 0 })
  totalTips: number;

  @Prop({ type: Number, default: 0 })
  tipsByCash: number;

  @Prop({ type: Number, default: 0 })
  tipsByCard: number;

  @Prop({ type: Number, default: 0 })
  tipsByDigital: number;

  @Prop({ type: Number, required: true, default: 0 })
  ordersServed: number;

  @Prop({ type: Number, default: 0 })
  averageTipPerOrder: number;

  @Prop({ type: Number, default: 0 })
  tipPercentageAvg: number; // % sobre ventas

  @Prop({ type: [DailyTipsBreakdownSchema], default: [] })
  dailyBreakdown: DailyTipsBreakdown[];

  @Prop({
    type: String,
    enum: ["pending", "distributed", "paid"],
    default: "pending",
    index: true,
  })
  status: string;

  @Prop({ type: Date })
  paidAt?: Date;

  @Prop({ type: Types.ObjectId, ref: "PayrollRun" })
  payrollRunId?: Types.ObjectId; // Si se pagó vía nómina

  // Tax tracking
  @Prop({ type: Boolean, default: false })
  exportedToPayroll: boolean; // Si ya se exportó a nómina

  @Prop({ type: Date })
  exportedAt?: Date; // Fecha de exportación

  @Prop({ type: Number, default: 0 })
  taxableAmount: number; // Monto gravable para impuestos

  @Prop({ type: Number, default: 0 })
  estimatedTaxWithholding: number; // Retención estimada de impuestos

  @Prop({
    type: {
      jurisdiction: String, // "federal", "state", "local"
      rate: Number, // Tasa de impuesto aplicable (%)
      amount: Number, // Monto de impuesto calculado
    },
    default: {},
  })
  taxBreakdown?: {
    jurisdiction: string;
    rate: number;
    amount: number;
  };

  @Prop({ type: String })
  notes?: string; // Notas adicionales sobre esta distribución
}

export const TipsReportSchema = SchemaFactory.createForClass(TipsReport);

// Índices
TipsReportSchema.index({ tenantId: 1, employeeId: 1, "period.start": 1 });
TipsReportSchema.index({ tenantId: 1, status: 1 });
