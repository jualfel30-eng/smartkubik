import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type SequenceLockDocument = SequenceLock & Document;

@Schema({ timestamps: true })
export class SequenceLock {
  @Prop({ type: Types.ObjectId, ref: "DocumentSequence", required: true })
  sequenceId: Types.ObjectId;

  @Prop({ type: String, required: true })
  tenantId: string;

  @Prop({ type: String, required: true })
  owner: string;

  @Prop({ type: Date, required: true })
  lockedUntil: Date;

  // TTL automático para limpiar locks expirados
  @Prop({ type: Date, default: () => new Date() })
  expireAt: Date;
}

export const SequenceLockSchema = SchemaFactory.createForClass(SequenceLock);

SequenceLockSchema.index(
  { tenantId: 1, sequenceId: 1 },
  { unique: true },
);
SequenceLockSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });
