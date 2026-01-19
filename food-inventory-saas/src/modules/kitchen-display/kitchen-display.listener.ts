
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { KitchenDisplayService } from './kitchen-display.service';
import { CreateKitchenOrderDto } from '../../dto/kitchen-order.dto';

@Injectable()
export class KitchenDisplayListener {
    private readonly logger = new Logger(KitchenDisplayListener.name);

    constructor(private readonly kitchenDisplayService: KitchenDisplayService) { }

    @OnEvent('order.created')
    async handleOrderCreatedEvent(payload: any) {
        try {
            this.logger.log(`Received order.created event for order ${payload.orderId}`);

            const dto: CreateKitchenOrderDto = {
                orderId: payload.orderId,
                priority: 'normal', // Default priority
            };

            await this.kitchenDisplayService.createFromOrder(dto, payload.tenantId);
            this.logger.log(`Successfully created kitchen order for ${payload.orderId}`);
        } catch (error) {
            if (error.message && error.message.includes('already exists')) {
                this.logger.warn(`Kitchen order for ${payload.orderId} already exists. Skipping.`);
            } else {
                this.logger.error(`Failed to create kitchen order from event: ${error.message}`, error.stack);
            }
        }
    }
}
