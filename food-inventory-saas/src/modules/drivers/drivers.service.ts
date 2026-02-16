import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from '../../schemas/order.schema';
import { UserDocument } from '../../schemas/user.schema';

@Injectable()
export class DriversService {
    private readonly logger = new Logger(DriversService.name);

    constructor(
        @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    ) { }

    /**
     * Obtiene las órdenes disponibles para ser tomadas por repartidores
     * Status: 'packed'
     * FulfillmentType: 'delivery_local' o 'delivery'
     * Driver: Sin asignar
     */
    async getPool(user: UserDocument, limit: number = 20) {
        const filter = {
            tenantId: user.tenantId,
            fulfillmentStatus: 'packed',
            // Aceptamos variantes de delivery (incluyendo legacy 'delivery' si existe)
            fulfillmentType: { $in: ['delivery', 'delivery_local', 'delivery_national'] },
            // Que NO tengan driver asignado (null o no existe)
            deliveryDriver: null,
        };

        const orders = await this.orderModel
            .find(filter)
            .sort({ createdAt: 1 }) // Las más viejas primero (prioridad)
            .limit(limit)
            .populate('customerId', 'firstName lastName phone')
            .exec();

        return {
            success: true,
            count: orders.length,
            data: orders,
        };
    }

    /**
     * Un driver reclama una orden.
     * Pasa de 'packed' -> 'in_transit'
     * Se asigna deliveryDriver
     */
    async claimOrder(orderId: string, user: UserDocument) {
        const order = await this.orderModel.findOne({
            _id: orderId,
            tenantId: user.tenantId,
        });

        if (!order) {
            throw new NotFoundException('Orden no encontrada');
        }

        if (order.deliveryDriver) {
            throw new BadRequestException('Esta orden ya fue tomada por otro repartidor');
        }

        if (order.fulfillmentStatus !== 'packed') {
            throw new BadRequestException('La orden no está lista para ser recogida (Status incorrecto)');
        }

        // Update
        order.deliveryDriver = user._id;
        order.driverAssignedAt = new Date();
        order.fulfillmentStatus = 'in_transit';
        order.updatedAt = new Date();

        // Historial o notas si fuera necesario
        const driverName = `${user.firstName} ${user.lastName}`;
        order.deliveryNotes = (order.deliveryNotes || '') + `\n[System] Recogido por: ${driverName} a las ${new Date().toLocaleTimeString()}`;

        await order.save();

        return {
            success: true,
            message: 'Orden asignada con éxito',
            data: order,
        };
    }

    async getActiveDeliveries(user: UserDocument) {
        const orders = await this.orderModel
            .find({
                tenantId: user.tenantId,
                deliveryDriver: user._id,
                fulfillmentStatus: 'in_transit', // Solo las activas
            })
            .sort({ driverAssignedAt: -1 })
            .populate('customerId', 'firstName lastName phone')
            .exec();

        return {
            success: true,
            count: orders.length,
            data: orders,
        };
    }

    async getDeliveryHistory(user: UserDocument, limit: number = 50) {
        const orders = await this.orderModel
            .find({
                tenantId: user.tenantId,
                deliveryDriver: user._id,
                fulfillmentStatus: { $in: ['delivered', 'cancelled'] },
            })
            .sort({ updatedAt: -1 })
            .limit(limit)
            .exec();

        return {
            success: true,
            count: orders.length,
            data: orders,
        };
    }

    async completeDelivery(orderId: string, user: UserDocument, notes?: string, proofPhoto?: string) {
        const order = await this.orderModel.findOne({
            _id: orderId,
            tenantId: user.tenantId,
            deliveryDriver: user._id,
        });

        if (!order) {
            throw new NotFoundException('Orden no encontrada o no asignada a ti');
        }

        if (order.fulfillmentStatus !== 'in_transit') {
            throw new BadRequestException('La orden no está en tránsito');
        }

        order.fulfillmentStatus = 'delivered';
        order.deliveredAt = new Date();
        order.deliveryProofPhoto = proofPhoto;

        if (notes) {
            order.deliveryNotes = (order.deliveryNotes || '') + `\n[Driver Note] ${notes}`;
        }

        await order.save();

        return {
            success: true,
            message: 'Entrega completada',
            data: order,
        };
    }
}
