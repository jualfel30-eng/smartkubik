import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export type DeliveryRatesDocument = DeliveryRates & Document;

@Schema()
export class DeliveryZone {
  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String })
  description?: string;

  @Prop({ type: Number, required: true })
  baseRate: number;

  @Prop({ type: Number, required: true })
  ratePerKm: number;

  @Prop({ type: Number })
  minDistance?: number;

  @Prop({ type: Number })
  maxDistance?: number;

  @Prop({ type: Number })
  minOrderAmount?: number;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: [Object] })
  polygonCoordinates?: Array<{ lat: number; lng: number }>;
}
const DeliveryZoneSchema = SchemaFactory.createForClass(DeliveryZone);

@Schema()
export class NationalShippingRate {
  @Prop({ type: String, required: true })
  state: string;

  @Prop({ type: String })
  city?: string;

  @Prop({ type: Number, required: true })
  rate: number;

  @Prop({ type: Number })
  estimatedDays?: number;

  @Prop({ type: String })
  courierCompany?: string;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;
}
const NationalShippingRateSchema =
  SchemaFactory.createForClass(NationalShippingRate);

@Schema({ timestamps: true })
export class DeliveryRates {
  @Prop({ type: Types.ObjectId, ref: "Tenant", required: true, unique: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Object })
  businessLocation: {
    address: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    placeId?: string;
  };

  @Prop({ type: [DeliveryZoneSchema] })
  deliveryZones: DeliveryZone[];

  @Prop({ type: [NationalShippingRateSchema] })
  nationalShippingRates: NationalShippingRate[];

  @Prop({ type: Object })
  settings: {
    enablePickup: boolean;
    enableDelivery: boolean;
    enableNationalShipping: boolean;
    freeDeliveryThreshold?: number;
    maxDeliveryDistance?: number;
    googleMapsApiKey?: string;
  };

  @Prop({ type: Object })
  shipping?: {
    enabled: boolean;
    activeProviders: string[]; // e.g. ['MRW-VE', 'ZOOM-VE', 'TEALCA-VE', 'LIBERTY-VE']
    defaultProvider?: string;
  };

  @Prop({ type: Types.ObjectId, ref: "User" })
  updatedBy?: Types.ObjectId;
}

export const DeliveryRatesSchema = SchemaFactory.createForClass(DeliveryRates);

DeliveryRatesSchema.index({ tenantId: 1 }, { unique: true });
