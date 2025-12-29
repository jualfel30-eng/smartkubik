import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MailService } from '../mail/mail.service';

@Injectable()
export class NotificationsListener {
    private readonly logger = new Logger(NotificationsListener.name);

    constructor(private readonly mailService: MailService) { }

    @OnEvent('order.fulfillment.updated')
    async handleFulfillmentUpdate(payload: {
        order: any;
        previousStatus: string;
        newStatus: string;
        tenantId: string;
    }) {
        const { order, newStatus, tenantId } = payload;
        this.logger.log(`Handling fulfillment update for order ${order.orderNumber}: ${newStatus}`);

        if (!order.customerEmail) {
            this.logger.warn(`Order ${order.orderNumber} has no customer email, skipping notification.`);
            return;
        }

        let subject = '';
        let message = '';

        switch (newStatus) {
            case 'picking':
                subject = `Tu orden #${order.orderNumber} está siendo preparada`;
                message = `<h1>¡Buenas noticias!</h1><p>Hemos comenzado a preparar tu pedido #${order.orderNumber}.</p>`;
                break;
            case 'shipped':
            case 'in_transit':
                subject = `Tu orden #${order.orderNumber} va en camino`;
                message = `<h1>¡Tu pedido va en camino!</h1><p>Tu orden #${order.orderNumber} ha salido de nuestras instalaciones.</p>`;
                break;
            case 'delivered':
                subject = `Tu orden #${order.orderNumber} ha sido entregada`;
                message = `<h1>¡Pedido Entregado!</h1><p>Hemos entregado tu orden #${order.orderNumber}. ¡Gracias por tu compra!</p>`;
                break;
            default:
                return; // Ignore other statuses
        }

        try {
            await this.mailService.sendTemplatedEmail({
                to: order.customerEmail,
                subject,
                html: message,
                tenantId,
            });
            this.logger.log(`Notification sent for order ${order.orderNumber} (${newStatus})`);
        } catch (error) {
            this.logger.error(`Failed to send notification for order ${order.orderNumber}: ${error.message}`);
        }
    }
}
