
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ShippingProvider } from '../../schemas/shipping-provider.schema';

@Injectable()
export class ShippingProvidersService {
    constructor(
        @InjectModel(ShippingProvider.name)
        private shippingProviderModel: Model<ShippingProvider>,
    ) { }

    async findAll(): Promise<ShippingProvider[]> {
        return this.shippingProviderModel.find({ isActive: true }).exec();
    }
}
