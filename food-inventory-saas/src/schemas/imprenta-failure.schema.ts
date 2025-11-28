import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type ImprentaFailureDocument = ImprentaFailure & Document;

@Schema({ timestamps: true })
export class ImprentaFailure {
  @Prop({ type: String, required: true })
  tenantId: string;

  @Prop({ type: String })
  documentId?: string;

  @Prop({ type: String })
  seriesId?: string;

  @Prop({ type: Object })
  request?: Record<string, any>;

  @Prop({ type: Object })
  error?: Record<string, any>;

  @Prop({ type: Number, default: 0 })
  attempts?: number;
}

export const ImprentaFailureSchema =
  SchemaFactory.createForClass(ImprentaFailure);
