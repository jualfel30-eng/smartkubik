import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  DeliveryRates,
  DeliveryRatesDocument,
} from "../../schemas/delivery-rates.schema";

interface CalculateDeliveryDto {
  tenantId: string;
  method: "pickup" | "delivery" | "envio_nacional";
  customerLocation?: {
    lat: number;
    lng: number;
  };
  destinationState?: string;
  destinationCity?: string;
  orderAmount?: number;
}

interface DeliveryCostResult {
  cost: number;
  distance?: number;
  duration?: number;
  zone?: string;
  freeDelivery?: boolean;
}

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    @InjectModel(DeliveryRates.name)
    private deliveryRatesModel: Model<DeliveryRatesDocument>,
  ) {}

  async calculateDeliveryCost(
    dto: CalculateDeliveryDto,
  ): Promise<DeliveryCostResult> {
    const tenantId = new Types.ObjectId(dto.tenantId);
    const rates = await this.deliveryRatesModel.findOne({ tenantId });

    if (!rates) {
      this.logger.warn(
        `No delivery rates configured for tenant ${dto.tenantId}`,
      );
      return { cost: 0 };
    }

    // Pickup is always free
    if (dto.method === "pickup") {
      return { cost: 0 };
    }

    // Delivery within local zones
    if (dto.method === "delivery") {
      if (!dto.customerLocation) {
        this.logger.warn(
          "No customer location provided for delivery calculation",
        );
        return { cost: 0 };
      }

      return this.calculateLocalDelivery(
        rates,
        dto.customerLocation,
        dto.orderAmount,
      );
    }

    // National shipping
    if (dto.method === "envio_nacional") {
      if (!dto.destinationState) {
        this.logger.warn("No destination state provided for national shipping");
        return { cost: 0 };
      }

      return this.calculateNationalShipping(
        rates,
        dto.destinationState,
        dto.destinationCity,
      );
    }

    return { cost: 0 };
  }

  private async calculateLocalDelivery(
    rates: DeliveryRatesDocument,
    customerLocation: { lat: number; lng: number },
    orderAmount?: number,
  ): Promise<DeliveryCostResult> {
    if (!rates.businessLocation?.coordinates) {
      this.logger.warn("Business location not configured");
      return { cost: 0 };
    }

    // Check free delivery threshold
    if (
      rates.settings?.freeDeliveryThreshold &&
      orderAmount &&
      orderAmount >= rates.settings.freeDeliveryThreshold
    ) {
      return { cost: 0, freeDelivery: true };
    }

    try {
      // Calculate distance using Haversine formula
      const distanceKm = this.calculateHaversineDistance(
        rates.businessLocation.coordinates,
        customerLocation,
      );

      // Check if distance exceeds maximum allowed
      if (
        rates.settings?.maxDeliveryDistance &&
        distanceKm > rates.settings.maxDeliveryDistance
      ) {
        this.logger.warn(
          `Distance ${distanceKm} km exceeds maximum ${rates.settings.maxDeliveryDistance} km`,
        );
        return { cost: 0, distance: distanceKm };
      }

      return this.calculateCostByDistance(rates, distanceKm);
    } catch (error) {
      this.logger.error(`Error calculating delivery cost: ${error.message}`);
      return { cost: 0 };
    }
  }

  private calculateHaversineDistance(
    point1: { lat: number; lng: number },
    point2: { lat: number; lng: number },
  ): number {
    const R = 6371; // Earth radius in kilometers
    const dLat = this.toRad(point2.lat - point1.lat);
    const dLon = this.toRad(point2.lng - point1.lng);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(point1.lat)) *
        Math.cos(this.toRad(point2.lat)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private calculateCostByDistance(
    rates: DeliveryRatesDocument,
    distanceKm: number,
  ): DeliveryCostResult {
    // Find matching zone
    const matchingZone = rates.deliveryZones
      .filter((zone) => zone.isActive)
      .find((zone) => {
        if (zone.minDistance !== undefined && distanceKm < zone.minDistance) {
          return false;
        }
        if (zone.maxDistance !== undefined && distanceKm > zone.maxDistance) {
          return false;
        }
        return true;
      });

    if (!matchingZone) {
      this.logger.warn(`No matching zone for distance ${distanceKm} km`);
      return { cost: 0, distance: distanceKm };
    }

    const cost = matchingZone.baseRate + matchingZone.ratePerKm * distanceKm;

    return {
      cost: Math.round(cost * 100) / 100,
      distance: distanceKm,
      zone: matchingZone.name,
    };
  }

  private calculateNationalShipping(
    rates: DeliveryRatesDocument,
    state: string,
    city?: string,
  ): DeliveryCostResult {
    // Try to find exact match with city
    let shippingRate = rates.nationalShippingRates
      .filter((rate) => rate.isActive)
      .find((rate) => rate.state === state && rate.city === city);

    // If not found, try to find state-level rate
    if (!shippingRate) {
      shippingRate = rates.nationalShippingRates
        .filter((rate) => rate.isActive)
        .find((rate) => rate.state === state && !rate.city);
    }

    if (!shippingRate) {
      this.logger.warn(
        `No shipping rate found for ${state}${city ? `, ${city}` : ""}`,
      );
      return { cost: 0 };
    }

    return {
      cost: shippingRate.rate,
      duration: shippingRate.estimatedDays
        ? shippingRate.estimatedDays * 24 * 60
        : undefined,
    };
  }

  async getDeliveryRates(
    tenantId: string,
  ): Promise<DeliveryRatesDocument | null> {
    return this.deliveryRatesModel.findOne({
      tenantId: new Types.ObjectId(tenantId),
    });
  }

  async upsertDeliveryRates(
    tenantId: string,
    data: any,
    userId: string,
  ): Promise<DeliveryRatesDocument> {
    const rates = await this.deliveryRatesModel.findOneAndUpdate(
      { tenantId: new Types.ObjectId(tenantId) },
      {
        ...data,
        tenantId: new Types.ObjectId(tenantId),
        updatedBy: new Types.ObjectId(userId),
      },
      { new: true, upsert: true },
    );

    return rates;
  }
}
