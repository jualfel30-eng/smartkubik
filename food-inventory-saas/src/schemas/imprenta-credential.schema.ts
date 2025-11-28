import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type ImprentaCredentialDocument = ImprentaCredential & Document;

@Schema({ timestamps: true })
export class ImprentaCredential {
  @Prop({ type: String, required: true })
  provider: string;

  @Prop({ type: String })
  baseUrl?: string;

  @Prop({ type: String })
  apiKey?: string;

  @Prop({ type: String })
  clientId?: string;

  @Prop({ type: String })
  clientSecret?: string;

  @Prop({ type: Date })
  rotatedAt?: Date;

  @Prop({ type: Date })
  expiresAt?: Date;

  @Prop({ type: [String] })
  scopes?: string[];

  @Prop({ type: Types.ObjectId, ref: "DocumentSequence" })
  sequenceId?: Types.ObjectId; // credencial por serie

  @Prop({ type: String, ref: "Tenant", required: true })
  tenantId: string;
}

export const ImprentaCredentialSchema =
  SchemaFactory.createForClass(ImprentaCredential);

ImprentaCredentialSchema.index({ tenantId: 1, provider: 1, sequenceId: 1 });
