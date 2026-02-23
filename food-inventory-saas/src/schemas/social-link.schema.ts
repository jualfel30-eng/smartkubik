import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type SocialLinkDocument = SocialLink & Document;

@Schema({ timestamps: true })
export class SocialLink {
  @Prop({ type: String, default: null, index: true })
  tenantId: string | null; // null = global SmartKubik links

  @Prop({ required: true })
  label: string;

  @Prop({ required: true })
  url: string;

  @Prop({ default: "link" })
  icon: string;

  @Prop({ default: false })
  highlight: boolean;

  @Prop({ default: true })
  active: boolean;

  @Prop({ default: 0 })
  order: number;

  @Prop()
  utmSource?: string;

  @Prop()
  utmMedium?: string;

  @Prop()
  utmCampaign?: string;
}

export const SocialLinkSchema = SchemaFactory.createForClass(SocialLink);

SocialLinkSchema.index({ tenantId: 1, order: 1 });
