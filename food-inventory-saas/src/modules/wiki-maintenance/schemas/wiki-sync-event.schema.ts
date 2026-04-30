import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WikiSyncEventDocument = WikiSyncEvent & Document;

@Schema({ timestamps: true, collection: 'wikisyncevents' })
export class WikiSyncEvent {
  /** When the sync was marked complete by the user */
  @Prop({ required: true })
  timestamp: Date;

  /** Number of pending review entries that were processed/archived */
  @Prop({ required: true, default: 0 })
  entriesProcessed: number;

  /** User who marked the sync */
  @Prop({ type: Types.ObjectId, ref: 'User' })
  triggeredBy?: Types.ObjectId;

  /** Denormalized user name for display in history */
  @Prop()
  triggeredByName?: string;

  /** Optional free-text notes */
  @Prop()
  notes?: string;

  /**
   * Snapshot of the pending entries at the moment the sync was marked.
   * Stored for history audit — not used for active reviews.
   */
  @Prop({ type: Object, default: [] })
  archivedEntries: any[];
}

export const WikiSyncEventSchema = SchemaFactory.createForClass(WikiSyncEvent);
WikiSyncEventSchema.index({ timestamp: -1 });
