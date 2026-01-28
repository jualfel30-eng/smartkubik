
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ShippingProvidersService } from './shipping-providers.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';

@Controller('shipping-providers')
@UseGuards(JwtAuthGuard)
export class ShippingProvidersController {
    constructor(private readonly shippingProvidersService: ShippingProvidersService) { }

    @Get()
    async findAll() {
        return this.shippingProvidersService.findAll();
    }
}
