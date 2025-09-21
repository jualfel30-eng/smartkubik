import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PerformanceKpi, PerformanceKpiDocument } from '../../schemas/performance-kpi.schema';
import { Order, OrderDocument } from '../../schemas/order.schema';
import { Shift, ShiftDocument } from '../../schemas/shift.schema';
import { Tenant, TenantDocument } from '../../schemas/tenant.schema';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectModel(PerformanceKpi.name) private kpiModel: Model<PerformanceKpiDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Shift.name) private shiftModel: Model<ShiftDocument>,
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
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

    // 1. Get all completed shifts for yesterday
    const shifts = await this.shiftModel.find({
      tenantId,
      clockOut: { $gte: startOfYesterday, $lte: endOfYesterday },
    }).exec();

    if (shifts.length === 0) {
      this.logger.log(`No shifts found for tenant ${tenantId} for yesterday. Skipping.`);
      return;
    }

    // 2. Aggregate hours worked per user
    const userHours = shifts.reduce((acc, shift) => {
      const userId = shift.userId.toString();
      acc[userId] = (acc[userId] || 0) + shift.durationInHours;
      return acc;
    }, {});

    const userIds = Object.keys(userHours);

    // 3. Get all completed orders for yesterday for the users who worked
    const orders = await this.orderModel.find({
      tenantId,
      status: 'delivered', // Or 'completed', depending on the business logic
      confirmedAt: { $gte: startOfYesterday, $lte: endOfYesterday },
      assignedTo: { $in: userIds }, // Attributing sale to the assigned user
    }).exec();

    // 4. Aggregate sales data per user
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

    // 5. Calculate and save KPIs for each user
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

      // Use findOneAndUpdate with upsert to avoid duplicates if job is re-run
      await this.kpiModel.findOneAndUpdate(
        { userId, tenantId, date: startOfYesterday },
        kpiData,
        { upsert: true, new: true },
      ).exec();
    }

    this.logger.log(`Finished calculating KPIs for tenant: ${tenantId}`);
  }

  async getPerformanceKpis(tenantId: string, date: Date) {
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const kpis = await this.kpiModel.find({
      tenantId,
      date: { $gte: startOfDay, $lte: endOfDay },
    })
    .populate('userId', 'firstName lastName') // Populate user's name
    .exec();

    // Format the data for the frontend
    return kpis.map(kpi => ({
      userName: `${(kpi.userId as any).firstName} ${(kpi.userId as any).lastName}`,
      totalSales: kpi.totalSales,
      numberOfOrders: kpi.numberOfOrders,
      totalHoursWorked: kpi.totalHoursWorked,
      salesPerHour: kpi.salesPerHour,
    }));
  }
}
