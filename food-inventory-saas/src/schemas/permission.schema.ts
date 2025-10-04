import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PermissionDocument = Permission & Document;

@Schema({ timestamps: true })
export class Permission {
  @Prop({ type: String, required: true, unique: true })
  name: string;

  @Prop({ type: String, required: true })
  description: string;

  @Prop({ type: String, required: true })
  module: string;

  @Prop({ type: String, required: true })
  action: string;
}

export const PermissionSchema = SchemaFactory.createForClass(Permission);

PermissionSchema.index({ name: 1 }, { unique: true });
PermissionSchema.index({ module: 1 });
