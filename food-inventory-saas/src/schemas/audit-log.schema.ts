import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Schema as MongooseSchema } from "mongoose";

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: true })
export class AuditLog {
  @Prop({ required: true })
  action: string; // e.g., 'update_tenant', 'impersonate_user'

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "User", required: true })
  performedBy: MongooseSchema.Types.ObjectId; // Super Admin User ID

  @Prop({ type: MongooseSchema.Types.Mixed })
  details: any; // e.g., { oldStatus: 'active', newStatus: 'suspended' }

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: "Tenant" })
  tenantId?: MongooseSchema.Types.ObjectId; // The tenant affected, if any

  @Prop()
  targetId?: string; // The ID of the entity affected, e.g., a user ID during impersonation

  @Prop()
  ipAddress: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);

// Índices para optimizar consultas de auditoría
AuditLogSchema.index({ performedBy: 1, createdAt: -1 });
AuditLogSchema.index({ tenantId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ targetId: 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: -1 }); // Para limpieza de logs antiguos
AuditLogSchema.index({ ipAddress: 1, createdAt: -1 });
