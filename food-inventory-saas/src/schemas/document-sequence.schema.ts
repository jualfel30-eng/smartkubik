import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type DocumentSequenceDocument = DocumentSequence & Document;

@Schema({ timestamps: true })
export class DocumentSequence {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  scope: "tenant" | "sucursal" | "caja";

  @Prop({ type: String })
  prefix?: string;

  @Prop({ type: Number, default: 0 })
  currentNumber: number;

  @Prop({ type: Number })
  rangeStart?: number;

  @Prop({ type: Number })
  rangeEnd?: number;

  @Prop({ type: String, default: "digital" })
  channel: "digital" | "machine_fiscal" | "contingency";

  @Prop({ type: String, default: "active" })
  status: "active" | "paused" | "closed";

  @Prop({ type: Types.ObjectId, ref: "Location" })
  locationId?: Types.ObjectId; // sucursal/caja

  @Prop({ type: String, ref: "Tenant", required: true })
  tenantId: string;
}

export const DocumentSequenceSchema =
  SchemaFactory.createForClass(DocumentSequence);

DocumentSequenceSchema.index(
  { tenantId: 1, name: 1, channel: 1 },
  { unique: true },
);
