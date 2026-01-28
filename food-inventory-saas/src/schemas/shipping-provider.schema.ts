import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type ShippingProviderDocument = ShippingProvider & Document;

@Schema()
export class Agency {
    @Prop({ type: String, required: true })
    code: string;

    @Prop({ type: String, required: true })
    name: string;

    @Prop({ type: String, required: true })
    address: string;

    @Prop({ type: String })
    phone?: string;

    @Prop({ type: Object })
    coordinates?: {
        lat: number;
        lng: number;
    };
}
const AgencySchema = SchemaFactory.createForClass(Agency);

@Schema()
export class City {
    @Prop({ type: String, required: true })
    name: string;

    @Prop({ type: String }) // Zip code prefix or similar if needed
    code?: string;

    @Prop({ type: [AgencySchema], default: [] })
    agencies: Agency[];
}
const CitySchema = SchemaFactory.createForClass(City);

@Schema()
export class Region {
    @Prop({ type: String, required: true })
    state: string; // e.g. "Carabobo"

    @Prop({ type: [CitySchema], default: [] })
    cities: City[];
}
const RegionSchema = SchemaFactory.createForClass(Region);

@Schema({ timestamps: true })
export class ShippingProvider {
    @Prop({ type: String, required: true, unique: true })
    name: string; // e.g. "MRW", "TEALCA"

    @Prop({ type: String, required: true, unique: true })
    code: string; // e.g. "MRW-VE"

    @Prop({ type: Boolean, default: true })
    isActive: boolean;

    @Prop({ type: String })
    logoUrl?: string;

    @Prop({ type: String })
    website?: string;

    @Prop({ type: [RegionSchema], default: [] })
    regions: Region[];
}

export const ShippingProviderSchema = SchemaFactory.createForClass(ShippingProvider);
