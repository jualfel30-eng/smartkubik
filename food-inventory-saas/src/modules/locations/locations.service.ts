
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { DeliveryRates, DeliveryRatesDocument } from '../../schemas/delivery-rates.schema';

@Injectable()
export class LocationsService {
  constructor(
    @InjectModel(DeliveryRates.name) private deliveryRatesModel: Model<DeliveryRatesDocument>,
  ) {}

  async getLocations() {
    const allRates = await this.deliveryRatesModel.find().exec();
    const locations = allRates.reduce((acc, tenantRates) => {
      tenantRates.nationalShippingRates.forEach(rate => {
        if (!acc[rate.state]) {
          acc[rate.state] = new Set();
        }
        if (rate.city) {
          acc[rate.state].add(rate.city);
        }
      });
      return acc;
    }, {});

    return Object.keys(locations).map(state => ({
      name: state,
      cities: Array.from(locations[state]),
    }));
  }
}
