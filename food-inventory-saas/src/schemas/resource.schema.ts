import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type ResourceDocument = Resource & Document;

export interface ResourceBaseRate {
  amount: number;
  currency: string;
  description?: string;
}

export interface ResourcePricingTier {
  label: string;
  amount: number;
  currency?: string;
  startDate?: Date;
  endDate?: Date;
  daysOfWeek?: string[];
  minNights?: number;
  maxNights?: number;
  isDefault?: boolean;
  channel?: string;
}

export interface ResourcePromotion {
  name: string;
  type: "percentage" | "fixed";
  value: number;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  minNights?: number;
  maxNights?: number;
  bookingWindowStart?: Date;
  bookingWindowEnd?: Date;
  stackable?: boolean;
  code?: string;
}

/**
 * Resource Schema - Recursos del negocio (personas, equipos, salas)
 *
 * Ejemplos:
 * - Dr. Juan Pérez (tipo: doctor, especialidad: general)
 * - Sala 1 (tipo: sala, capacidad: 1)
 * - Estilista María (tipo: empleado, servicios: corte, tinte)
 * - Grúa 01 (tipo: equipo, servicios: remolque)
 */
@Schema({ timestamps: true })
export class Resource {
  @Prop({ type: String, required: true, index: true })
  tenantId: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({
    type: String,
    required: true,
    enum: ["person", "room", "equipment", "vehicle", "other"],
    default: "person",
  })
  type: string;

  @Prop({ trim: true })
  description: string;

  @Prop({ trim: true })
  email: string;

  @Prop({ trim: true })
  phone: string;

  @Prop({
    type: String,
    enum: ["active", "inactive", "on_vacation"],
    default: "active",
  })
  status: string;

  @Prop({ type: String })
  color: string; // Color para visualización en calendario

  @Prop({ type: String, trim: true })
  floor?: string; // Piso o nivel dentro del hotel

  @Prop({ type: String, trim: true })
  zone?: string; // Zona/ala dentro del piso (ej. Norte, VIP)

  @Prop({ type: Number, default: 0 })
  sortIndex?: number; // Orden relativo dentro del piso

  @Prop({ type: [String], default: [] })
  locationTags?: string[]; // Etiquetas auxiliares para filtros (ej. vista-mar, accesible)

  // Horario de disponibilidad
  @Prop({
    type: Object,
    default: {
      monday: { available: true, start: "09:00", end: "18:00" },
      tuesday: { available: true, start: "09:00", end: "18:00" },
      wednesday: { available: true, start: "09:00", end: "18:00" },
      thursday: { available: true, start: "09:00", end: "18:00" },
      friday: { available: true, start: "09:00", end: "18:00" },
      saturday: { available: false, start: "09:00", end: "13:00" },
      sunday: { available: false, start: "09:00", end: "13:00" },
    },
  })
  schedule: {
    monday: { available: boolean; start: string; end: string };
    tuesday: { available: boolean; start: string; end: string };
    wednesday: { available: boolean; start: string; end: string };
    thursday: { available: boolean; start: string; end: string };
    friday: { available: boolean; start: string; end: string };
    saturday: { available: boolean; start: string; end: string };
    sunday: { available: boolean; start: string; end: string };
  };

  // Días no disponibles (vacaciones, días libres)
  @Prop({
    type: [
      {
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        reason: { type: String },
      },
    ],
    default: [],
  })
  unavailableDates: Array<{
    startDate: Date;
    endDate: Date;
    reason?: string;
  }>;

  // Servicios que puede realizar este recurso
  @Prop({ type: [String], default: [] })
  allowedServiceIds: string[]; // IDs de servicios que puede realizar

  @Prop({ type: [String], default: [] })
  specializations: string[]; // Ej: ["cardiología", "pediatría"] o ["corte", "tinte"]

  @Prop({ type: Number, default: 1 })
  capacity: number; // Capacidad (para salas o equipos que pueden atender múltiples personas)

  @Prop({ type: Object })
  metadata: Record<string, any>; // Información adicional (licencias, certificaciones, etc.)

  @Prop({
    type: {
      amount: { type: Number, default: 0 },
      currency: { type: String, default: "USD" },
      description: { type: String },
    },
    default: null,
  })
  baseRate?: ResourceBaseRate | null;

  @Prop({
    type: [
      {
        label: { type: String, required: true, trim: true },
        amount: { type: Number, required: true },
        currency: { type: String, default: "USD" },
        startDate: { type: Date },
        endDate: { type: Date },
        daysOfWeek: { type: [String], default: [] },
        minNights: { type: Number },
        maxNights: { type: Number },
        isDefault: { type: Boolean, default: false },
        channel: { type: String, trim: true },
      },
    ],
    default: [],
  })
  pricing: ResourcePricingTier[];

  @Prop({
    type: [
      {
        name: { type: String, required: true, trim: true },
        type: {
          type: String,
          enum: ["percentage", "fixed"],
          default: "percentage",
        },
        value: { type: Number, required: true },
        description: { type: String },
        startDate: { type: Date },
        endDate: { type: Date },
        minNights: { type: Number },
        maxNights: { type: Number },
        bookingWindowStart: { type: Date },
        bookingWindowEnd: { type: Date },
        stackable: { type: Boolean, default: false },
        code: { type: String, trim: true },
      },
    ],
    default: [],
  })
  promotions: ResourcePromotion[];
}

export const ResourceSchema = SchemaFactory.createForClass(Resource);

// Índices compuestos
ResourceSchema.index({ tenantId: 1, status: 1 });
ResourceSchema.index({ tenantId: 1, type: 1 });
ResourceSchema.index({ tenantId: 1, name: "text" });
