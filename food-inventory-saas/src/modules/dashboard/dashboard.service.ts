import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from '../../schemas/order.schema';
import { Customer, CustomerDocument } from '../../schemas/customer.schema';
import { Inventory, InventoryDocument } from '../../schemas/inventory.schema';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Inventory.name) private inventoryModel: Model<InventoryDocument>,
  ) {}

  async getSummary(user: any) {
    this.logger.log(`Fetching dashboard summary for tenant: ${user.tenantId}`);
    const tenantId = new Types.ObjectId(user.tenantId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [ 
      productsInStock,
      ordersToday,
      activeCustomers,
      salesTodayResult,
      inventoryAlerts,
      recentOrders,
    ] = await Promise.all([
      this.inventoryModel.countDocuments({ tenantId, totalQuantity: { $gt: 0 } }),
      this.orderModel.countDocuments({ tenantId, createdAt: { $gte: today, $lt: tomorrow } }),
      this.customerModel.countDocuments({ tenantId, status: 'active' }),
      this.orderModel.aggregate([
        { $match: { tenantId, status: 'delivered', createdAt: { $gte: today, $lt: tomorrow } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      this.inventoryModel.find({ 
        tenantId, 
        $or: [{ 'alerts.lowStock': true }, { 'alerts.nearExpiration': true }] 
      }).limit(5).select('productName alerts'),
      this.orderModel.find({ tenantId }).sort({ createdAt: -1 }).limit(5).select('orderNumber customerName totalAmount status'),
    ]);

    const salesToday = salesTodayResult.length > 0 ? salesTodayResult[0].total : 0;

    return {
      productsInStock,
      ordersToday,
      activeCustomers,
      salesToday,
      inventoryAlerts,
      recentOrders,
    };
  }
}
