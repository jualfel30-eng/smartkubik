import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GooglePlacesCacheDocument = GooglePlacesCache & Document;

@Schema({ collection: 'googleplacescache', timestamps: true })
export class GooglePlacesCache {
  @Prop({ required: true, unique: true, index: true })
  placeId: string;

  @Prop({ type: Object })
  data: any;

  @Prop({ required: true })
  fetchedAt: Date;
}

export const GooglePlacesCacheSchema = SchemaFactory.createForClass(GooglePlacesCache);
