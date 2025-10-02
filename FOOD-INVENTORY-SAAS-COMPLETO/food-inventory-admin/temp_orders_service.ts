import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Types, Connection } from 'mongoose';
import { Order, OrderDocument } from '../../schemas/order.schema';
import { Customer, CustomerDocument } from '../../schemas/customer.schema'; // <-- AÑADIR IMPORT
import { CreateOrderDto, UpdateOrderDto, OrderQueryDto } from '../../dto/order.dto';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>, // <-- INYECTAR MODELO
    private readonly inventoryService: InventoryService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async create(createOrderDto: CreateOrderDto, user: any): Promise<OrderDocument> {
    // ... (la función create no necesita cambios)
    this.logger.log(`Creating order for customer: ${createOrderDto.customerId}`);

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const orderNumber = await this.generateOrderNumber(user.tenantId);

      // Los cálculos de totales deben venir del frontend, ya que la lógica de IGTF depende del método de pago
      // que el usuario selecciona en la UI. El backend solo valida que los totales sean correctos.
      // Aquí se asume que el DTO ya trae los totales correctos.

      const orderData = {
        ...createOrderDto,
        orderNumber,
        status: 'pending',
        paymentStatus: 'pending',
        inventoryReservation: {
          isReserved: false,
        },
        createdBy: user.id,
        tenantId: user.tenantId,
      };

      const order = new this.orderModel(orderData);
      const savedOrder = await order.save({ session });

      if (createOrderDto.autoReserve) {
        this.logger.log(`Reserving inventory for order: ${savedOrder.orderNumber}`);
        // ... (lógica de inventario)
      }

      await session.commitTransaction();
      this.logger.log(`Order created successfully with number: ${orderNumber}`);
      return savedOrder;
    } catch (error) {
      await session.abortTransaction();
      this.logger.error(`Failed to create order: ${error.message}`);
      throw new BadRequestException(`Error al crear la orden: ${error.message}`);
    } finally {
      session.endSession();
    }
  }

  async findAll(query: OrderQueryDto, tenantId: string) {
    // ... (la función findAll no necesita cambios)
    const { page = 1, limit = 20, search, status, customerId, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const filter: any = { tenantId: new Types.ObjectId(tenantId) };
    if (status) filter.status = status;
    if (customerId) filter.customerId = new Types.ObjectId(customerId);
    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
      ];
    }
    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      this.orderModel.find(filter).sort(sortOptions).skip(skip).limit(limit).populate('customerId', 'name').exec(),
      this.orderModel.countDocuments(filter),
    ]);
    return { orders, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, tenantId: string): Promise<OrderDocument | null> {
    // ... (la función findOne no necesita cambios)
    return this.orderModel.findOne({ _id: id, tenantId }).exec();
  }

  // --- FUNCIÓN UPDATE MODIFICADA ---
  async update(
    id: string,
    updateOrderDto: UpdateOrderDto,
    user: any,
  ): Promise<OrderDocument | null> {
    this.logger.log(`Updating order ${id} with status ${updateOrderDto.status}`);

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const order = await this.orderModel.findById(id).session(session);
      if (!order) {
        throw new BadRequestException('Orden no encontrada');
      }

      const oldStatus = order.status;
      const newStatus = updateOrderDto.status;

      // Lógica para actualizar métricas del cliente
      if (newStatus === 'confirmed' && oldStatus !== 'confirmed') {
        this.logger.log(`Order ${id} confirmed. Updating customer metrics for customer ${order.customerId}.`);
        const customer = await this.customerModel.findById(order.customerId).session(session);
        if (customer) {
          customer.metrics.totalSpent = (customer.metrics.totalSpent || 0) + order.totalAmount;
          customer.metrics.totalOrders = (customer.metrics.totalOrders || 0) + 1;
          customer.metrics.lastOrderDate = new Date();
          await customer.save({ session });
          this.logger.log(`Customer ${customer._id} metrics updated.`);
        } else {
          this.logger.warn(`Customer ${order.customerId} not found for order ${id}. Cannot update metrics.`);
        }
      }

      // Lógica para liberar inventario si se cancela
      if ((newStatus === 'cancelled' || newStatus === 'refunded') && oldStatus !== 'cancelled' && oldStatus !== 'refunded') {
        this.logger.log(`Releasing inventory for cancelled order ${id}`);
        await this.inventoryService.releaseInventory({ orderId: id }, user, session);
      }

      const updateData = {
        ...updateOrderDto,
        updatedBy: user.id,
      };
      
      const updatedOrder = await this.orderModel.findByIdAndUpdate(id, updateData, { new: true, session });

      await session.commitTransaction();
      return updatedOrder;

    } catch (error) {
      await session.abortTransaction();
      this.logger.error(`Failed to update order ${id}: ${error.message}`);
      throw new BadRequestException(`Error al actualizar la orden: ${error.message}`);
    } finally {
      session.endSession();
    }
  }

  private async generateOrderNumber(tenantId: string): Promise<string> {
    // ... (la función generateOrderNumber no necesita cambios)
    const count = await this.orderModel.countDocuments({ tenantId });
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    return `ORD-${year}${month}-${(count + 1).toString().padStart(6, '0')}`;
  }
}
