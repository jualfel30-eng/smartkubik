import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type TenantEventLogDocument = TenantEventLog & Document;

@Schema({ timestamps: true })
export class TenantEventLog {
  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true, index: true })
  eventType: string; // 'order.created', 'inventory.adjusted', 'product.created', etc.

  @Prop({ type: String })
  entityType: string; // 'order', 'product', 'supplier', 'inventory', 'customer'

  @Prop({ type: String })
  entityId: string;

  @Prop({ type: Object, required: true })
  data: Record<string, any>; // Event-specific payload

  @Prop({ type: String, default: "system" })
  source: string; // 'whatsapp_ai', 'web_admin', 'api', 'system'

  @Prop({ type: Object })
  metadata: Record<string, any>; // userId, sessionId, ip, etc.
}

export const TenantEventLogSchema =
  SchemaFactory.createForClass(TenantEventLog);

// Compound indexes for time-series queries
TenantEventLogSchema.index({ tenantId: 1, eventType: 1, createdAt: -1 });
TenantEventLogSchema.index({ tenantId: 1, entityType: 1, createdAt: -1 });
TenantEventLogSchema.index({ tenantId: 1, createdAt: -1 });

// TTL index: auto-delete events older than 1 year
TenantEventLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 365 * 24 * 3600 },
);
