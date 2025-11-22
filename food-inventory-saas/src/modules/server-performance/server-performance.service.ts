import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  ServerPerformance,
  ServerPerformanceDocument,
} from "../../schemas/server-performance.schema";
import { Order, OrderDocument } from "../../schemas/order.schema";
import {
  CreateServerPerformanceDto,
  UpdateServerPerformanceDto,
  ServerPerformanceQueryDto,
  SetServerGoalsDto,
  ServerPerformanceAnalyticsResponse,
  ServerComparisonResponse,
  ServerLeaderboardResponse,
} from "../../dto/server-performance.dto";

@Injectable()
export class ServerPerformanceService {
  private readonly logger = new Logger(ServerPerformanceService.name);

  constructor(
    @InjectModel(ServerPerformance.name)
    private performanceModel: Model<ServerPerformanceDocument>,
    @InjectModel(Order.name)
    private orderModel: Model<OrderDocument>,
  ) {}

  // ========== CRUD Operations ==========

  async create(
    dto: CreateServerPerformanceDto,
    tenantId: string,
  ): Promise<ServerPerformanceDocument> {
    // Check if record for this server/date already exists
    const existing = await this.performanceModel
      .findOne({
        tenantId,
        serverId: new Types.ObjectId(dto.serverId),
        date: new Date(dto.date),
      })
      .exec();

    if (existing) {
      throw new BadRequestException(
        "Performance record for this server and date already exists",
      );
    }

    // Get server name from User model (simplified - should be passed or fetched)
    const performance = new this.performanceModel({
      ...dto,
      tenantId,
      serverId: new Types.ObjectId(dto.serverId),
      date: new Date(dto.date),
      serverName: `Server ${dto.serverId}`, // TODO: fetch from User model
    });

    // Calculate derived metrics
    if (dto.totalSales && dto.ordersServed) {
      performance.averageOrderValue = dto.totalSales / dto.ordersServed;
    }

    if (dto.totalSales && dto.hoursWorked) {
      performance.salesPerHour = dto.totalSales / dto.hoursWorked;
    }

    if (dto.tipsReceived && dto.totalSales) {
      performance.tipPercentage = (dto.tipsReceived / dto.totalSales) * 100;
    }

    if (dto.tablesServed && dto.hoursWorked) {
      performance.tablesPerHour = dto.tablesServed / dto.hoursWorked;
    }

    await performance.save();

    this.logger.log(
      `Performance record created for server ${dto.serverId} on ${dto.date}`,
    );

    return performance;
  }

  async findAll(
    query: ServerPerformanceQueryDto,
    tenantId: string,
  ): Promise<ServerPerformanceDocument[]> {
    const filter: any = { tenantId, isDeleted: false };

    if (query.startDate && query.endDate) {
      filter.date = {
        $gte: new Date(query.startDate),
        $lte: new Date(query.endDate),
      };
    } else if (query.startDate) {
      filter.date = { $gte: new Date(query.startDate) };
    } else if (query.endDate) {
      filter.date = { $lte: new Date(query.endDate) };
    }

    if (query.serverId) {
      filter.serverId = new Types.ObjectId(query.serverId);
    }

    if (query.shiftId) {
      filter.shiftId = new Types.ObjectId(query.shiftId);
    }

    if (query.performanceGrade) {
      filter.performanceGrade = query.performanceGrade;
    }

    return this.performanceModel
      .find(filter)
      .populate("serverId", "name email")
      .sort({ date: -1, totalSales: -1 })
      .exec();
  }

  async findOne(
    id: string,
    tenantId: string,
  ): Promise<ServerPerformanceDocument> {
    const performance = await this.performanceModel
      .findOne({ _id: id, tenantId, isDeleted: false })
      .populate("serverId", "name email")
      .exec();

    if (!performance) {
      throw new NotFoundException("Performance record not found");
    }

    return performance;
  }

  async update(
    id: string,
    dto: UpdateServerPerformanceDto,
    tenantId: string,
  ): Promise<ServerPerformanceDocument> {
    const performance = await this.findOne(id, tenantId);

    Object.assign(performance, dto);

    // Recalculate derived metrics
    if (performance.totalSales && performance.ordersServed) {
      performance.averageOrderValue =
        performance.totalSales / performance.ordersServed;
    }

    if (performance.totalSales && performance.hoursWorked) {
      performance.salesPerHour =
        performance.totalSales / performance.hoursWorked;
    }

    if (performance.tipsReceived && performance.totalSales) {
      performance.tipPercentage =
        (performance.tipsReceived / performance.totalSales) * 100;
    }

    if (performance.tablesServed && performance.hoursWorked) {
      performance.tablesPerHour =
        performance.tablesServed / performance.hoursWorked;
    }

    return performance.save();
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const performance = await this.findOne(id, tenantId);
    performance.isDeleted = true;
    await performance.save();
  }

  // ========== Auto-calculate from Orders ==========

  async calculatePerformanceFromOrders(
    serverId: string,
    date: string,
    tenantId: string,
  ): Promise<ServerPerformanceDocument> {
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    // Fetch all orders for this server on this date
    const orders = await this.orderModel
      .find({
        tenantId,
        assignedWaiterId: new Types.ObjectId(serverId),
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $in: ["completed", "paid"] },
      })
      .populate("items.productId", "name category")
      .exec();

    if (orders.length === 0) {
      throw new NotFoundException(
        "No orders found for this server on this date",
      );
    }

    // Calculate metrics
    const ordersServed = orders.length;
    const totalSales = orders.reduce(
      (sum, order) => sum + (order.totalAmount || 0),
      0,
    );
    const tipsReceived = orders.reduce(
      (sum, order) => sum + (order.totalTipsAmount || 0),
      0,
    );
    const itemsSold = orders.reduce(
      (sum, order) =>
        sum + order.items.reduce((s, item) => s + item.quantity, 0),
      0,
    );

    // Count unique tables
    const uniqueTables = new Set(
      orders.filter((o) => o.tableId).map((o) => o.tableId!.toString()),
    );
    const tablesServed = uniqueTables.size;

    // Calculate guests served (estimate based on orders - each order = 1 guest minimum)
    // This is a simplification since Order doesn't have guestCount
    const guestsServed = ordersServed; // Could be enhanced if we track party size elsewhere

    // Calculate average order value
    const averageOrderValue = totalSales / ordersServed;

    // Calculate tip percentage
    const tipPercentage =
      totalSales > 0 ? (tipsReceived / totalSales) * 100 : 0;

    // Calculate product mix
    const productMixMap = new Map<
      string,
      { category: string; count: number; revenue: number }
    >();
    orders.forEach((order) => {
      order.items.forEach((item) => {
        const category = (item.productId as any)?.category || "Uncategorized";
        const existing = productMixMap.get(category) || {
          category,
          count: 0,
          revenue: 0,
        };
        existing.count += item.quantity;
        existing.revenue += item.totalPrice;
        productMixMap.set(category, existing);
      });
    });
    const productMix = Array.from(productMixMap.values());

    // Calculate top items
    const topItemsMap = new Map<
      string,
      {
        productId: Types.ObjectId;
        productName: string;
        quantity: number;
        revenue: number;
      }
    >();
    orders.forEach((order) => {
      order.items.forEach((item) => {
        const key = item.productId.toString();
        const existing = topItemsMap.get(key) || {
          productId: item.productId,
          productName: (item.productId as any)?.name || item.productName,
          quantity: 0,
          revenue: 0,
        };
        existing.quantity += item.quantity;
        existing.revenue += item.totalPrice;
        topItemsMap.set(key, existing);
      });
    });
    const topItems = Array.from(topItemsMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Check if record exists
    const existing = await this.performanceModel
      .findOne({
        tenantId,
        serverId: new Types.ObjectId(serverId),
        date: startDate,
      })
      .exec();

    if (existing) {
      // Update existing record
      Object.assign(existing, {
        ordersServed,
        totalSales,
        averageOrderValue,
        itemsSold,
        tablesServed,
        guestsServed,
        tipsReceived,
        tipPercentage,
        productMix,
        topItems,
      });
      return existing.save();
    } else {
      // Create new record
      const performance = new this.performanceModel({
        tenantId,
        serverId: new Types.ObjectId(serverId),
        serverName: `Server ${serverId}`, // TODO: fetch from User model
        date: startDate,
        ordersServed,
        totalSales,
        averageOrderValue,
        itemsSold,
        tablesServed,
        guestsServed,
        tipsReceived,
        tipPercentage,
        productMix,
        topItems,
      });
      return performance.save();
    }
  }

  // ========== Analytics ==========

  async getAnalytics(
    query: ServerPerformanceQueryDto,
    tenantId: string,
  ): Promise<ServerPerformanceAnalyticsResponse> {
    const startDate = query.startDate
      ? new Date(query.startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    const filter: any = {
      tenantId,
      date: { $gte: startDate, $lte: endDate },
      isDeleted: false,
    };

    if (query.serverId) {
      filter.serverId = new Types.ObjectId(query.serverId);
    }

    const records = await this.performanceModel.find(filter).exec();

    // Group by server
    const byServerMap = new Map<string, any>();
    records.forEach((record) => {
      const key = record.serverId.toString();
      const existing = byServerMap.get(key) || {
        serverId: record.serverId,
        serverName: record.serverName,
        ordersServed: 0,
        totalSales: 0,
        tipsReceived: 0,
        tablesServed: 0,
        guestsServed: 0,
        hoursWorked: 0,
        ratings: [],
      };

      existing.ordersServed += record.ordersServed || 0;
      existing.totalSales += record.totalSales || 0;
      existing.tipsReceived += record.tipsReceived || 0;
      existing.tablesServed += record.tablesServed || 0;
      existing.guestsServed += record.guestsServed || 0;
      existing.hoursWorked += record.hoursWorked || 0;
      if (record.averageRating) {
        existing.ratings.push(record.averageRating);
      }

      byServerMap.set(key, existing);
    });

    const byServer = Array.from(byServerMap.values()).map((server) => ({
      serverId: server.serverId.toString(),
      serverName: server.serverName,
      ordersServed: server.ordersServed,
      totalSales: server.totalSales,
      averageOrderValue:
        server.ordersServed > 0 ? server.totalSales / server.ordersServed : 0,
      tipsReceived: server.tipsReceived,
      tipPercentage:
        server.totalSales > 0
          ? (server.tipsReceived / server.totalSales) * 100
          : 0,
      salesPerHour:
        server.hoursWorked > 0 ? server.totalSales / server.hoursWorked : 0,
      averageRating:
        server.ratings.length > 0
          ? server.ratings.reduce((a, b) => a + b, 0) / server.ratings.length
          : 0,
      tablesServed: server.tablesServed,
      guestsServed: server.guestsServed,
      hoursWorked: server.hoursWorked,
      performanceGrade: this.calculateGrade(server),
    }));

    // Calculate summary
    const summary = {
      totalServers: byServerMap.size,
      totalSales: records.reduce((sum, r) => sum + (r.totalSales || 0), 0),
      totalOrders: records.reduce((sum, r) => sum + (r.ordersServed || 0), 0),
      totalTips: records.reduce((sum, r) => sum + (r.tipsReceived || 0), 0),
      averageRating: 0,
      totalHoursWorked: records.reduce(
        (sum, r) => sum + (r.hoursWorked || 0),
        0,
      ),
    };

    const allRatings = records
      .filter((r) => r.averageRating)
      .map((r) => r.averageRating!);
    summary.averageRating =
      allRatings.length > 0
        ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length
        : 0;

    // Top performers (by overall score)
    const topPerformers = byServer
      .map((server) => ({
        serverId: server.serverId,
        serverName: server.serverName,
        totalSales: server.totalSales,
        totalOrders: server.ordersServed,
        totalTips: server.tipsReceived,
        averageRating: server.averageRating,
        performanceScore: this.calculatePerformanceScore(server),
      }))
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .slice(0, 5);

    // Calculate trends
    const dailyAverage = {
      sales: summary.totalSales / Math.max(1, records.length),
      orders: summary.totalOrders / Math.max(1, records.length),
      tips: summary.totalTips / Math.max(1, records.length),
    };

    // Week over week comparison
    const midPoint = new Date((startDate.getTime() + endDate.getTime()) / 2);
    const firstHalf = records.filter((r) => r.date < midPoint);
    const secondHalf = records.filter((r) => r.date >= midPoint);

    const firstHalfSales = firstHalf.reduce(
      (sum, r) => sum + (r.totalSales || 0),
      0,
    );
    const secondHalfSales = secondHalf.reduce(
      (sum, r) => sum + (r.totalSales || 0),
      0,
    );
    const salesChange =
      firstHalfSales > 0
        ? ((secondHalfSales - firstHalfSales) / firstHalfSales) * 100
        : 0;

    const firstHalfOrders = firstHalf.reduce(
      (sum, r) => sum + (r.ordersServed || 0),
      0,
    );
    const secondHalfOrders = secondHalf.reduce(
      (sum, r) => sum + (r.ordersServed || 0),
      0,
    );
    const ordersChange =
      firstHalfOrders > 0
        ? ((secondHalfOrders - firstHalfOrders) / firstHalfOrders) * 100
        : 0;

    const firstHalfTips = firstHalf.reduce(
      (sum, r) => sum + (r.tipsReceived || 0),
      0,
    );
    const secondHalfTips = secondHalf.reduce(
      (sum, r) => sum + (r.tipsReceived || 0),
      0,
    );
    const tipsChange =
      firstHalfTips > 0
        ? ((secondHalfTips - firstHalfTips) / firstHalfTips) * 100
        : 0;

    // Goal progress
    const goalProgress = records
      .filter((r) => r.goals)
      .map((r) => ({
        serverId: r.serverId.toString(),
        serverName: r.serverName,
        salesTarget: r.goals!.salesTarget,
        salesAchieved: r.goals!.salesAchieved || r.totalSales,
        salesProgress:
          ((r.goals!.salesAchieved || r.totalSales) / r.goals!.salesTarget) *
          100,
        ordersTarget: r.goals!.ordersTarget,
        ordersAchieved: r.goals!.ordersAchieved || r.ordersServed,
        ordersProgress:
          ((r.goals!.ordersAchieved || r.ordersServed) /
            r.goals!.ordersTarget) *
          100,
      }));

    return {
      period: {
        start: startDate,
        end: endDate,
      },
      summary,
      topPerformers,
      byServer,
      trends: {
        dailyAverage,
        weekOverWeek: {
          salesChange,
          ordersChange,
          tipsChange,
        },
      },
      goalProgress,
    };
  }

  async getComparison(
    query: ServerPerformanceQueryDto,
    tenantId: string,
  ): Promise<ServerComparisonResponse> {
    const analytics = await this.getAnalytics(query, tenantId);

    // Add rankings
    const servers = analytics.byServer.map((server) => {
      const metrics = {
        totalSales: server.totalSales,
        ordersServed: server.ordersServed,
        averageOrderValue: server.averageOrderValue,
        tipsReceived: server.tipsReceived,
        tipPercentage: server.tipPercentage,
        salesPerHour: server.salesPerHour,
        tablesPerHour: server.tablesServed / Math.max(1, server.hoursWorked),
        averageRating: server.averageRating,
        orderErrorRate: 0, // TODO: calculate from actual data
        guestsServed: server.guestsServed,
      };

      return {
        serverId: server.serverId,
        serverName: server.serverName,
        metrics,
        ranking: {
          overallRank: 0,
          salesRank: 0,
          satisfactionRank: 0,
          efficiencyRank: 0,
        },
      };
    });

    // Calculate rankings
    const sortedBySales = [...servers].sort(
      (a, b) => b.metrics.totalSales - a.metrics.totalSales,
    );
    const sortedByRating = [...servers].sort(
      (a, b) => b.metrics.averageRating - a.metrics.averageRating,
    );
    const sortedByEfficiency = [...servers].sort(
      (a, b) => b.metrics.salesPerHour - a.metrics.salesPerHour,
    );

    servers.forEach((server) => {
      server.ranking.salesRank =
        sortedBySales.findIndex((s) => s.serverId === server.serverId) + 1;
      server.ranking.satisfactionRank =
        sortedByRating.findIndex((s) => s.serverId === server.serverId) + 1;
      server.ranking.efficiencyRank =
        sortedByEfficiency.findIndex((s) => s.serverId === server.serverId) + 1;
      server.ranking.overallRank = Math.round(
        (server.ranking.salesRank +
          server.ranking.satisfactionRank +
          server.ranking.efficiencyRank) /
          3,
      );
    });

    return {
      servers,
      period: analytics.period,
    };
  }

  async getLeaderboard(
    query: ServerPerformanceQueryDto,
    tenantId: string,
  ): Promise<ServerLeaderboardResponse> {
    const analytics = await this.getAnalytics(query, tenantId);

    const topBySales = analytics.byServer
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 10)
      .map((server, index) => ({
        rank: index + 1,
        serverId: server.serverId,
        serverName: server.serverName,
        value: server.totalSales,
      }));

    const topByTips = analytics.byServer
      .sort((a, b) => b.tipsReceived - a.tipsReceived)
      .slice(0, 10)
      .map((server, index) => ({
        rank: index + 1,
        serverId: server.serverId,
        serverName: server.serverName,
        value: server.tipsReceived,
      }));

    const topByRating = analytics.byServer
      .filter((s) => s.averageRating > 0)
      .sort((a, b) => b.averageRating - a.averageRating)
      .slice(0, 10)
      .map((server, index) => ({
        rank: index + 1,
        serverId: server.serverId,
        serverName: server.serverName,
        value: server.averageRating,
      }));

    const topByEfficiency = analytics.byServer
      .sort((a, b) => b.salesPerHour - a.salesPerHour)
      .slice(0, 10)
      .map((server, index) => ({
        rank: index + 1,
        serverId: server.serverId,
        serverName: server.serverName,
        value: server.salesPerHour,
      }));

    return {
      period: analytics.period,
      categories: {
        topBySales,
        topByTips,
        topByRating,
        topByEfficiency,
      },
    };
  }

  async setGoals(
    dto: SetServerGoalsDto,
    tenantId: string,
  ): Promise<ServerPerformanceDocument> {
    const date = new Date(dto.date);
    date.setHours(0, 0, 0, 0);

    let performance = await this.performanceModel
      .findOne({
        tenantId,
        serverId: new Types.ObjectId(dto.serverId),
        date,
      })
      .exec();

    if (!performance) {
      // Create new record with goals
      performance = new this.performanceModel({
        tenantId,
        serverId: new Types.ObjectId(dto.serverId),
        serverName: `Server ${dto.serverId}`,
        date,
        goals: {
          salesTarget: dto.salesTarget,
          salesAchieved: 0,
          ordersTarget: dto.ordersTarget,
          ordersAchieved: 0,
        },
      });
    } else {
      // Update existing record
      performance.goals = {
        salesTarget: dto.salesTarget,
        salesAchieved: performance.totalSales || 0,
        ordersTarget: dto.ordersTarget,
        ordersAchieved: performance.ordersServed || 0,
      };
    }

    return performance.save();
  }

  // ========== Helper Methods ==========

  private calculateGrade(server: any): string {
    const score = this.calculatePerformanceScore(server);

    if (score >= 90) return "A";
    if (score >= 80) return "B";
    if (score >= 70) return "C";
    if (score >= 60) return "D";
    return "F";
  }

  private calculatePerformanceScore(server: any): number {
    // Weighted scoring: 40% sales, 30% rating, 20% tips, 10% efficiency
    const salesScore = Math.min((server.totalSales / 10000) * 40, 40); // Max $10k for full points
    const ratingScore = (server.averageRating / 5) * 30;
    const tipsScore = Math.min((server.tipsReceived / 1000) * 20, 20); // Max $1k for full points
    const efficiencyScore = Math.min((server.salesPerHour / 500) * 10, 10); // Max $500/hr for full points

    return salesScore + ratingScore + tipsScore + efficiencyScore;
  }
}
