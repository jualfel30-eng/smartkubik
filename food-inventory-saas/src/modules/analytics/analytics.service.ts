import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PerformanceKpi, PerformanceKpiDocument } from '../../schemas/performance-kpi.schema';
import { Order, OrderDocument } from '../../schemas/order.schema';
import { Shift, ShiftDocument } from '../../schemas/shift.schema';
import { Tenant, TenantDocument } from '../../schemas/tenant.schema';
import { User, UserDocument } from '../../schemas/user.schema';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectModel(PerformanceKpi.name) private kpiModel: Model<PerformanceKpiDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Shift.name) private shiftModel: Model<ShiftDocument>,
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM, { name: 'dailyPerformanceKPIs', timeZone: 'America/Caracas' })
  async handleCron() {
    this.logger.log('Running daily performance KPI calculation job...');
    
    const tenants = await this.tenantModel.find({ status: 'active' }).exec();
    this.logger.log(`Found ${tenants.length} active tenants to process.`);

    for (const tenant of tenants) {
      await this.calculateAndSaveKpisForTenant(tenant._id);
    }

    this.logger.log('Daily performance KPI calculation job finished.');
  }

  async calculateAndSaveKpisForTenant(tenantId: string) {
    this.logger.log(`Calculating KPIs for tenant: ${tenantId}`);

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const startOfYesterday = new Date(yesterday.setHours(0, 0, 0, 0));
    const endOfYesterday = new Date(yesterday.setHours(23, 59, 59, 999));

    const shifts = await this.shiftModel.find({
      tenantId,
      clockOut: { $gte: startOfYesterday, $lte: endOfYesterday },
    }).exec();

    if (shifts.length === 0) {
      this.logger.log(`No shifts found for tenant ${tenantId} for yesterday. Skipping.`);
      return;
    }

    const userHours = shifts.reduce((acc, shift) => {
      const userId = shift.userId.toString();
      acc[userId] = (acc[userId] || 0) + shift.durationInHours;
      return acc;
    }, {});

    const userIds = Object.keys(userHours);

    const orders = await this.orderModel.find({
      tenantId,
      status: 'delivered',
      confirmedAt: { $gte: startOfYesterday, $lte: endOfYesterday },
      assignedTo: { $in: userIds },
    }).exec();

    const userSales = orders.reduce((acc, order) => {
      if (order.assignedTo) {
        const userId = order.assignedTo.toString();
        if (!acc[userId]) {
          acc[userId] = { totalSales: 0, numberOfOrders: 0 };
        }
        acc[userId].totalSales += order.totalAmount;
        acc[userId].numberOfOrders += 1;
      }
      return acc;
    }, {});

    for (const userId of userIds) {
      const hours = userHours[userId] || 0;
      const salesData = userSales[userId] || { totalSales: 0, numberOfOrders: 0 };
      
      const kpiData = {
        userId,
        tenantId,
        date: startOfYesterday,
        totalSales: salesData.totalSales,
        numberOfOrders: salesData.numberOfOrders,
        totalHoursWorked: hours,
        salesPerHour: hours > 0 ? salesData.totalSales / hours : 0,
      };

      await this.kpiModel.findOneAndUpdate(
        { userId, tenantId, date: startOfYesterday },
        kpiData,
        { upsert: true, new: true },
      ).exec();
    }

    this.logger.log(`Finished calculating KPIs for tenant: ${tenantId}`);
  }

  async getPerformanceKpis(tenantId: string, date: Date) {
    this.logger.log(`Getting REAL-TIME performance KPIs for tenant ${tenantId} for date ${date.toISOString()}`);
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const shifts = await this.shiftModel.find({
      tenantId,
      clockOut: { $gte: startOfDay, $lte: endOfDay },
    }).exec();

    if (shifts.length === 0) {
      this.logger.log(`No shifts found for tenant ${tenantId} for the date. Returning empty.`);
      return [];
    }

    const userHours = shifts.reduce((acc, shift) => {
      const userId = shift.userId.toString();
      acc[userId] = (acc[userId] || 0) + shift.durationInHours;
      return acc;
    }, {});

    const userIds = Object.keys(userHours);

    const orders = await this.orderModel.find({
      tenantId,
      status: 'delivered',
      confirmedAt: { $gte: startOfDay, $lte: endOfDay },
      assignedTo: { $in: userIds },
    }).exec();

    const userSales = orders.reduce((acc, order) => {
      if (order.assignedTo) {
        const userId = order.assignedTo.toString();
        if (!acc[userId]) {
          acc[userId] = { totalSales: 0, numberOfOrders: 0 };
        }
        acc[userId].totalSales += order.totalAmount;
        acc[userId].numberOfOrders += 1;
      }
      return acc;
    }, {});

    const users = await this.userModel.find({ _id: { $in: userIds } }).select('firstName lastName').exec();
    const userMap = new Map(users.map(u => [u._id.toString(), `${u.firstName} ${u.lastName}`]));

    return userIds.map(userId => {
      const hours = userHours[userId] || 0;
      const salesData = userSales[userId] || { totalSales: 0, numberOfOrders: 0 };
      return {
        userName: userMap.get(userId) || 'Usuario Desconocido',
        totalSales: salesData.totalSales,
        numberOfOrders: salesData.numberOfOrders,
        totalHoursWorked: hours,
        salesPerHour: hours > 0 ? salesData.totalSales / hours : 0,
      };
    });
  }
}