import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  RestaurantOrder,
  RestaurantOrderDocument,
  RestaurantOrderStatus,
} from '../../../schemas/restaurant-order.schema';
import {
  CreateRestaurantOrderDto,
  UpdateOrderStatusDto,
} from '../dto/restaurant-order.dto';

@Injectable()
export class RestaurantOrdersService {
  constructor(
    @InjectModel(RestaurantOrder.name)
    private orderModel: Model<RestaurantOrderDocument>,
  ) {}

  async create(dto: CreateRestaurantOrderDto, tenantId: string): Promise<RestaurantOrderDocument> {
    const orderRef = await this.generateOrderRef(tenantId);
    return this.orderModel.create({
      ...dto,
      orderRef,
      tenantId: new Types.ObjectId(tenantId),
      status: 'pending',
    });
  }

  async findAll(
    tenantId: string,
    filters?: { status?: RestaurantOrderStatus; limit?: number; offset?: number },
  ): Promise<{ data: RestaurantOrderDocument[]; total: number }> {
    const query: any = { tenantId: new Types.ObjectId(tenantId) };
    if (filters?.status) query.status = filters.status;

    const limit = filters?.limit ?? 50;
    const offset = filters?.offset ?? 0;

    const [data, total] = await Promise.all([
      this.orderModel.find(query).sort({ createdAt: -1 }).skip(offset).limit(limit).lean().exec(),
      this.orderModel.countDocuments(query),
    ]);

    return { data, total };
  }

  async findOne(id: string, tenantId: string): Promise<RestaurantOrderDocument> {
    const doc = await this.orderModel
      .findOne({ _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId) })
      .lean()
      .exec();
    if (!doc) throw new NotFoundException(`Pedido ${id} no encontrado`);
    return doc;
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto, tenantId: string): Promise<RestaurantOrderDocument> {
    const doc = await this.orderModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId) },
        { $set: { status: dto.status } },
        { new: true },
      )
      .lean()
      .exec();
    if (!doc) throw new NotFoundException(`Pedido ${id} no encontrado`);
    return doc;
  }

  async markWhatsAppSent(id: string, tenantId: string): Promise<void> {
    await this.orderModel.updateOne(
      { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId) },
      { $set: { whatsappSentAt: new Date() } },
    );
  }

  // Genera referencia legible: RST-20240101-0042 (único por tenant)
  private async generateOrderRef(tenantId: string): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    // Contar pedidos del tenant HOY
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const todayCount = await this.orderModel.countDocuments({
      tenantId: new Types.ObjectId(tenantId),
      createdAt: { $gte: startOfDay, $lt: endOfDay },
    });

    const seq = String(todayCount + 1).padStart(4, '0');
    return `RST-${dateStr}-${seq}`;
  }
}
