import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WikiMaintenanceConfigDocument = WikiMaintenanceConfig & Document;

/**
 * Singleton configuration for the wiki maintenance system.
 * Only one document exists, identified by key='global'.
 */
@Schema({ timestamps: true, collection: 'wikimaintenanceconfigs' })
export class WikiMaintenanceConfig {
  @Prop({ required: true, unique: true, default: 'global' })
  key: string;

  /** How often the wiki should be synced (in days) */
  @Prop({ required: true, default: 3, min: 1, max: 30 })
  intervalDays: number;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;
}

export const WikiMaintenanceConfigSchema =
  SchemaFactory.createForClass(WikiMaintenanceConfig);
