import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from '../../schemas/order.schema';
import { CreateOrderDto, UpdateOrderDto, OrderQueryDto } from '../../dto/order.dto';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private readonly inventoryService: InventoryService,
  ) {}

  async create(createOrderDto: CreateOrderDto, user: any): Promise<OrderDocument> {
    this.logger.log(`Creating order for customer: ${createOrderDto.customerId}`);

    const orderNumber = await this.generateOrderNumber(user.tenantId);

    const subtotal = createOrderDto.items.reduce((sum, item) => 
      sum + (item.quantity * item.unitPrice), 0
    );
    
    const ivaTotal = subtotal * 0.16; // Simplified
    const igtfTotal = 0; // Simplified
    const totalAmount = subtotal + ivaTotal + igtfTotal - (createOrderDto.discountAmount || 0);

    const orderData = {
      ...createOrderDto,
      orderNumber,
      subtotal,
      ivaTotal,
      igtfTotal,
      shippingCost: 0,
      totalAmount,
      status: 'pending',
      paymentStatus: 'pending',
      inventoryReservation: {
        isReserved: false,
      },
      metrics: {
        totalMargin: 0,
        marginPercentage: 0,
      },
      createdBy: user.id,
      tenantId: user.tenantId,
    };

    const order = new this.orderModel(orderData);
    const savedOrder = await order.save();

    this.logger.log(`Order created successfully with number: ${orderNumber}`);
    return savedOrder;
  }

  async findAll(query: OrderQueryDto, tenantId: string) {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      paymentStatus,
      customerId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const filter: any = { tenantId: new Types.ObjectId(tenantId) };

    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
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
      this.orderModel
        .find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .populate('customerId', 'name customerNumber')
        .exec(),
      this.orderModel.countDocuments(filter),
    ]);

    return {
      orders,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, tenantId: string): Promise<OrderDocument | null> {
    return this.orderModel
      .findOne({ _id: id, tenantId })
      .populate('customerId', 'name customerNumber email phone')
      .populate('createdBy', 'firstName lastName')
      .exec();
  }

  async update(
    id: string,
    updateOrderDto: UpdateOrderDto,
    user: any,
  ): Promise<OrderDocument | null> {
    this.logger.log(`Updating order ${id} with status ${updateOrderDto.status}`);

    const order = await this.findOne(id, user.tenantId);
    if (!order) {
      throw new BadRequestException('Orden no encontrada');
    }

    if (
      (updateOrderDto.status === 'cancelled' || updateOrderDto.status === 'refunded') &&
      order.status !== 'cancelled' &&
      order.status !== 'refunded'
    ) {
      this.logger.log(`Releasing inventory for cancelled order ${id}`);
      await this.inventoryService.releaseInventory({ orderId: id }, user);
    }

    const updateData = {
      ...updateOrderDto,
      updatedBy: user.id,
    };

    return this.orderModel.findByIdAndUpdate(id, updateData, { new: true });
  }

  private async generateOrderNumber(tenantId: string): Promise<string> {
    const count = await this.orderModel.countDocuments({ tenantId });
    const today = new Date();
    const year = today.getFullYear().toString().slice(-2);
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    return `ORD-${year}${month}-${(count + 1).toString().padStart(6, '0')}`;
  }
}