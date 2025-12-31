import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type CalendarDocument = Calendar & Document;

/**
 * Schema para Calendarios del ERP
 * Cada tenant puede tener múltiples calendarios con permisos específicos
 * Se sincronizan como calendarios secundarios en Google Calendar
 */
@Schema({ timestamps: true })
export class Calendar {
  @Prop({ type: String, required: true, trim: true })
  name: string;

  @Prop({ type: String, trim: true })
  description?: string;

  @Prop({ type: String, default: "#3B82F6" })
  color: string;

  /**
   * Roles que tienen acceso a este calendario
   * Ejemplo: ['admin', 'sales_manager', 'sales_rep']
   */
  @Prop({ type: [String], default: [] })
  allowedRoles: string[];

  /**
   * Usuarios específicos que tienen acceso
   * Se evalúa además de allowedRoles
   */
  @Prop({ type: [Types.ObjectId], ref: "User", default: [] })
  allowedUsers: Types.ObjectId[];

  /**
   * Indica si es el calendario por defecto del tenant
   * Solo puede haber uno por tenant
   */
  @Prop({ type: Boolean, default: false })
  isDefault: boolean;

  /**
   * Estado del calendario
   */
  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  /**
   * Tipo de calendario (para categorización)
   * Ejemplos: 'sales', 'production', 'hr', 'finance', 'general'
   */
  @Prop({ type: String, default: "general" })
  category: string;

  /**
   * Configuración de sincronización con Google Calendar
   */
  @Prop({
    type: Object,
    default: null,
  })
  googleSync?: {
    enabled: boolean;
    calendarId: string; // ID del calendario secundario en Google
    lastSyncAt?: Date;
    syncStatus?: "active" | "error" | "disabled";
    syncToken?: string; // Token de sincronización incremental
    errorMessage?: string;
    // Información del watch channel para notificaciones push
    watchChannel?: {
      id: string; // ID del canal
      resourceId: string; // ID del recurso en Google
      expiration: number; // Timestamp de expiración
      token: string; // Token de verificación
    };
  };

  /**
   * Configuración de visibilidad
   */
  @Prop({
    type: Object,
    default: { public: false, shareWithTenant: true },
  })
  visibility: {
    public: boolean; // Si es público (visible para todos en el tenant)
    shareWithTenant: boolean; // Si se comparte con todo el tenant
  };

  /**
   * Metadatos adicionales
   */
  @Prop({ type: Object, default: {} })
  metadata: Record<string, any>;

  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true })
  tenantId: Types.ObjectId;
}

export const CalendarSchema = SchemaFactory.createForClass(Calendar);

// Índices para optimizar queries
CalendarSchema.index({ tenantId: 1, isActive: 1 });
CalendarSchema.index({ tenantId: 1, isDefault: 1 });
CalendarSchema.index({ tenantId: 1, category: 1 });
CalendarSchema.index({ "googleSync.calendarId": 1 });

// Validación: Solo un calendario default por tenant
CalendarSchema.pre("save", async function (next) {
  if (this.isDefault && this.isNew) {
    const Calendar = this.constructor as any;
    const existing = await Calendar.findOne({
      tenantId: this.tenantId,
      isDefault: true,
      _id: { $ne: this._id },
    });
    if (existing) {
      throw new Error("Ya existe un calendario por defecto para este tenant");
    }
  }
  next();
});
