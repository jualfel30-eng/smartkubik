import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GlobalSettingDocument = GlobalSetting & Document;

@Schema({ timestamps: true })
export class GlobalSetting {
  @Prop({ type: String, required: true, unique: true, index: true })
  key: string;

  @Prop({ type: String, required: true })
  value: string;

  @Prop({ type: String })
  description?: string;
}

export const GlobalSettingSchema = SchemaFactory.createForClass(GlobalSetting);
