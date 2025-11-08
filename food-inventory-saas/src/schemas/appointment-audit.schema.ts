import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";

export type AppointmentAuditDocument = AppointmentAudit & Document;

@Schema({ timestamps: true })
export class AppointmentAudit {
  @Prop({ type: String, required: true, index: true })
  tenantId: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: "Appointment",
    required: true,
  })
  appointmentId: MongooseSchema.Types.ObjectId;

  @Prop({ type: String, required: true })
  action: string;

  @Prop({ type: String })
  source?: string;

  @Prop({ type: String })
  performedBy?: string;

  @Prop({ type: Object, default: {} })
  changes: Record<string, any>;
}

export const AppointmentAuditSchema =
  SchemaFactory.createForClass(AppointmentAudit);

AppointmentAuditSchema.index({ tenantId: 1, appointmentId: 1, createdAt: -1 });
