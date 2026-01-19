
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

    // DISABLED: Automatic sync causes duplications because all item timestamps get updated
    // Users will manually send new items to kitchen via button instead
    /*
    @OnEvent('order.updated')
    async handleOrderUpdatedEvent(payload: any) {
        try {
            // Only sync if there are items in the payload
            if (payload.items && payload.items.length > 0) {
                 this.logger.log(`Received order.updated event for order ${payload.orderId} - Syncing items to kitchen`);
                 await this.kitchenDisplayService.syncWithOrder(payload.orderId, payload.tenantId);
            }
        } catch (error) {
             this.logger.error(`Failed to sync kitchen order from event: ${error.message}`, error.stack);
        }
    }
    */
}
