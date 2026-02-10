import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type SavedAnalyticsViewDocument = SavedAnalyticsView & Document;

@Schema({ timestamps: true, collection: "saved_analytics_views" })
export class SavedAnalyticsView {
  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ type: [String], required: true })
  metricIds: string[];

  @Prop({
    type: {
      years: [Number],
      months: [Number],
    },
  })
  periodConfig?: {
    years: number[];
    months: number[];
  };

  @Prop({ default: false })
  isTemplate: boolean;

  @Prop()
  vertical?: string; // 'restaurant', 'retail', 'services', 'manufacturing', 'hospitality'

  @Prop({ type: Types.ObjectId, ref: "User" })
  createdBy?: Types.ObjectId;
}

export const SavedAnalyticsViewSchema = SchemaFactory.createForClass(
  SavedAnalyticsView,
);

// Indexes for performance
SavedAnalyticsViewSchema.index({ tenantId: 1, name: 1 });
SavedAnalyticsViewSchema.index({ tenantId: 1, isTemplate: 1 });
