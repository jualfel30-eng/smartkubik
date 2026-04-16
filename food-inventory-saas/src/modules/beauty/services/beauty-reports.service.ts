import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  BeautyBooking,
  BeautyBookingDocument,
} from '../../../schemas/beauty-booking.schema';
import {
  Professional,
  ProfessionalDocument,
} from '../../../schemas/professional.schema';

@Injectable()
export class BeautyReportsService {
  constructor(
    @InjectModel(BeautyBooking.name)
    private bookingModel: Model<BeautyBookingDocument>,
    @InjectModel(Professional.name)
    private professionalModel: Model<ProfessionalDocument>,
  ) {}

  // ─────────────────────────────────────────────────────────────────
  // 6.1 Revenue by Professional
  // ─────────────────────────────────────────────────────────────────
  async getRevenueByProfessional(
    tenantId: string,
    startDate: string,
    endDate: string,
  ) {
    const tenantObjId = new Types.ObjectId(tenantId);
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const results = await this.bookingModel.aggregate([
      {
        $match: {
          tenantId: tenantObjId,
          status: 'completed',
          paymentStatus: 'paid',
          date: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$professional',
          professionalName: { $first: '$professionalName' },
          totalRevenue: { $sum: '$totalPrice' },
          totalBookings: { $sum: 1 },
          totalDurationMins: { $sum: '$totalDuration' },
        },
      },
      {
        $project: {
          professionalId: '$_id',
          professionalName: 1,
          totalRevenue: 1,
          totalBookings: 1,
          averageTicket: {
            $cond: [
              { $gt: ['$totalBookings', 0] },
              { $divide: ['$totalRevenue', '$totalBookings'] },
              0,
            ],
          },
          hoursWorked: { $divide: ['$totalDurationMins', 60] },
        },
      },
      { $sort: { totalRevenue: -1 } },
    ]);

    // Populate names for professionals without a name in the booking
    const profIds = results
      .filter((r) => r.professionalId)
      .map((r) => r.professionalId);
    const professionals = await this.professionalModel
      .find({ _id: { $in: profIds } })
      .select('name')
      .lean();
    const profMap = new Map(
      professionals.map((p) => [p._id.toString(), p.name]),
    );

    const enriched = results.map((r) => ({
      ...r,
      professionalName:
        r.professionalName ||
        (r.professionalId ? profMap.get(r.professionalId.toString()) : null) ||
        'Sin profesional',
    }));

    const totals = enriched.reduce(
      (acc, p) => {
        acc.totalRevenue += p.totalRevenue;
        acc.totalBookings += p.totalBookings;
        return acc;
      },
      { totalRevenue: 0, totalBookings: 0 },
    );

    return {
      professionals: enriched,
      totals: {
        totalRevenue: totals.totalRevenue,
        totalBookings: totals.totalBookings,
        averageTicket:
          totals.totalBookings > 0
            ? totals.totalRevenue / totals.totalBookings
            : 0,
      },
      period: { startDate, endDate },
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // 6.2 Popular Services
  // ─────────────────────────────────────────────────────────────────
  async getPopularServices(
    tenantId: string,
    startDate: string,
    endDate: string,
  ) {
    const tenantObjId = new Types.ObjectId(tenantId);
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const results = await this.bookingModel.aggregate([
      {
        $match: {
          tenantId: tenantObjId,
          status: 'completed',
          date: { $gte: start, $lte: end },
        },
      },
      { $unwind: '$services' },
      {
        $group: {
          _id: {
            serviceId: '$services.service',
            name: '$services.name',
          },
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: '$services.price' },
          totalDuration: { $sum: '$services.duration' },
        },
      },
      {
        $project: {
          serviceId: '$_id.serviceId',
          name: '$_id.name',
          totalBookings: 1,
          totalRevenue: 1,
          averageDuration: {
            $cond: [
              { $gt: ['$totalBookings', 0] },
              { $divide: ['$totalDuration', '$totalBookings'] },
              0,
            ],
          },
        },
      },
      { $sort: { totalBookings: -1 } },
    ]);

    const grandTotal = results.reduce((sum, s) => sum + s.totalBookings, 0);

    const services = results.map((s) => ({
      ...s,
      percentageOfTotal:
        grandTotal > 0 ? (s.totalBookings / grandTotal) * 100 : 0,
    }));

    return { services, period: { startDate, endDate } };
  }

  // ─────────────────────────────────────────────────────────────────
  // 6.3 No-Show Rate
  // ─────────────────────────────────────────────────────────────────
  async getNoShowRate(
    tenantId: string,
    startDate: string,
    endDate: string,
    groupBy: 'day' | 'week' | 'month' = 'day',
  ) {
    const tenantObjId = new Types.ObjectId(tenantId);
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const formatMap: Record<string, string> = {
      day: '%Y-%m-%d',
      week: '%Y-W%V',
      month: '%Y-%m',
    };
    const format = formatMap[groupBy] || '%Y-%m-%d';

    const results = await this.bookingModel.aggregate([
      {
        $match: {
          tenantId: tenantObjId,
          status: { $in: ['completed', 'cancelled', 'no_show'] },
          date: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format, date: '$date' } },
          total: { $sum: 1 },
          noShows: {
            $sum: { $cond: [{ $eq: ['$status', 'no_show'] }, 1, 0] },
          },
          cancellations: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] },
          },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          period: '$_id',
          total: 1,
          noShows: 1,
          cancellations: 1,
          completed: 1,
          noShowRate: {
            $cond: [
              { $gt: ['$total', 0] },
              { $multiply: [{ $divide: ['$noShows', '$total'] }, 100] },
              0,
            ],
          },
          cancellationRate: {
            $cond: [
              { $gt: ['$total', 0] },
              { $multiply: [{ $divide: ['$cancellations', '$total'] }, 100] },
              0,
            ],
          },
        },
      },
      { $sort: { period: 1 } },
    ]);

    const totalBookings = results.reduce((sum, r) => sum + r.total, 0);
    const totalNoShows = results.reduce((sum, r) => sum + r.noShows, 0);
    const totalCancellations = results.reduce(
      (sum, r) => sum + r.cancellations,
      0,
    );

    return {
      periods: results,
      averages: {
        noShowRate:
          totalBookings > 0 ? (totalNoShows / totalBookings) * 100 : 0,
        cancellationRate:
          totalBookings > 0 ? (totalCancellations / totalBookings) * 100 : 0,
      },
      period: { startDate, endDate },
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // 6.4 Client Retention
  // ─────────────────────────────────────────────────────────────────
  async getClientRetention(
    tenantId: string,
    startDate: string,
    endDate: string,
  ) {
    const tenantObjId = new Types.ObjectId(tenantId);
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // 90-day lookback for "lost" clients
    const lookbackStart = new Date(start);
    lookbackStart.setDate(lookbackStart.getDate() - 90);

    // Visits in current period
    const periodVisits = await this.bookingModel.aggregate([
      {
        $match: {
          tenantId: tenantObjId,
          status: 'completed',
          date: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$client.phone',
          clientName: { $first: '$client.name' },
          visitCount: { $sum: 1 },
          totalSpent: { $sum: '$totalPrice' },
          firstVisit: { $min: '$date' },
          lastVisit: { $max: '$date' },
        },
      },
    ]);

    // Phones with visits in the 90 days BEFORE startDate (for "lost" detection)
    const previousPeriodPhones = await this.bookingModel
      .distinct('client.phone', {
        tenantId: tenantObjId,
        status: 'completed',
        date: { $gte: lookbackStart, $lt: start },
      })
      .exec();

    const previousSet = new Set(previousPeriodPhones.map(String));

    // Build per-client data
    const currentPeriodPhones = new Set(periodVisits.map((v) => String(v._id)));

    let newClients = 0;
    let returningClients = 0;
    const topClients = periodVisits
      .map((v) => {
        const phone = String(v._id);
        const isNew = !previousSet.has(phone) && v.visitCount === 1;
        const isReturning = v.visitCount >= 2 || previousSet.has(phone);
        if (isNew) newClients++;
        else if (isReturning) returningClients++;
        return {
          phone,
          name: v.clientName,
          visitCount: v.visitCount,
          totalSpent: v.totalSpent,
          firstVisit: v.firstVisit,
          lastVisit: v.lastVisit,
          type: isNew ? 'new' : 'returning',
        };
      })
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    // "Lost" clients: had visits in lookback period but NOT in current period
    const lostClients = previousPeriodPhones.filter(
      (p) => !currentPeriodPhones.has(String(p)),
    ).length;

    const totalClients = periodVisits.length;
    const totalVisits = periodVisits.reduce((s, v) => s + v.visitCount, 0);
    const totalRevenue = periodVisits.reduce((s, v) => s + v.totalSpent, 0);

    return {
      summary: {
        newClients,
        returningClients,
        lostClients,
        retentionRate:
          previousSet.size > 0
            ? ((previousSet.size - lostClients) / previousSet.size) * 100
            : 0,
        averageVisitsPerClient:
          totalClients > 0 ? totalVisits / totalClients : 0,
        averageRevenuePerClient:
          totalClients > 0 ? totalRevenue / totalClients : 0,
      },
      topClients,
      period: { startDate, endDate },
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // 6.5 Peak Hours
  // ─────────────────────────────────────────────────────────────────
  async getPeakHours(tenantId: string, startDate: string, endDate: string) {
    const tenantObjId = new Types.ObjectId(tenantId);
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const results = await this.bookingModel.aggregate([
      {
        $match: {
          tenantId: tenantObjId,
          status: { $in: ['completed', 'confirmed', 'in_progress'] },
          date: { $gte: start, $lte: end },
        },
      },
      {
        $addFields: {
          // MongoDB $dayOfWeek: 1=Sunday, 2=Monday...7=Saturday
          // Convert to 0=Monday...6=Sunday
          dayOfWeekRaw: { $dayOfWeek: '$date' },
          hourOfDay: {
            $toInt: { $substr: ['$startTime', 0, 2] },
          },
        },
      },
      {
        $addFields: {
          // 1(Sun)→6, 2(Mon)→0, 3(Tue)→1, ... 7(Sat)→5
          dayOfWeek: {
            $mod: [{ $add: ['$dayOfWeekRaw', 5] }, 7],
          },
        },
      },
      {
        $group: {
          _id: { day: '$dayOfWeek', hour: '$hourOfDay' },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          day: '$_id.day',
          hour: '$_id.hour',
          count: 1,
          _id: 0,
        },
      },
      { $sort: { count: -1 } },
    ]);

    const DAY_NAMES = [
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
      'Domingo',
    ];

    const sorted = [...results].sort((a, b) => b.count - a.count);
    const busiestSlot = sorted[0];
    const slowestSlots = [...results]
      .sort((a, b) => a.count - b.count)
      .slice(0, 5);

    return {
      heatmap: results,
      insights: {
        busiestDay: busiestSlot
          ? DAY_NAMES[busiestSlot.day] || `Día ${busiestSlot.day}`
          : null,
        busiestHour: busiestSlot ? `${busiestSlot.hour}:00` : null,
        topSlots: sorted.slice(0, 5).map((s) => ({
          day: DAY_NAMES[s.day] || s.day,
          hour: `${s.hour}:00`,
          count: s.count,
        })),
        slowestSlots: slowestSlots.map((s) => ({
          day: DAY_NAMES[s.day] || s.day,
          hour: `${s.hour}:00`,
          count: s.count,
        })),
      },
      period: { startDate, endDate },
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // 6.6 Utilization
  // ─────────────────────────────────────────────────────────────────
  async getUtilization(tenantId: string, startDate: string, endDate: string) {
    const tenantObjId = new Types.ObjectId(tenantId);
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const professionals = await this.professionalModel
      .find({ tenantId: tenantObjId, isActive: true })
      .lean();

    // Build list of all days between start and end
    const days: Date[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    // Get completed bookings grouped by professional
    const bookingAgg = await this.bookingModel.aggregate([
      {
        $match: {
          tenantId: tenantObjId,
          status: 'completed',
          date: { $gte: start, $lte: end },
          professional: { $ne: null },
        },
      },
      {
        $group: {
          _id: '$professional',
          totalDurationMins: { $sum: '$totalDuration' },
          totalBookings: { $sum: 1 },
        },
      },
    ]);

    const bookingMap = new Map<string, { totalDurationMins: number; totalBookings: number }>();
    for (const b of bookingAgg) {
      bookingMap.set(b._id.toString(), {
        totalDurationMins: b.totalDurationMins,
        totalBookings: b.totalBookings,
      });
    }

    const profStats = professionals.map((prof) => {
      // Sum available hours from schedule across all days in range
      let totalAvailableMinutes = 0;

      for (const day of days) {
        // getDay(): 0=Sunday,1=Monday,...,6=Saturday — matches Professional.schedule.day
        const dayOfWeek = day.getDay();
        const schedSlot = prof.schedule?.find(
          (s: any) => s.day === dayOfWeek && s.isWorking,
        );
        if (!schedSlot) continue;

        const [startH, startM] = schedSlot.start.split(':').map(Number);
        const [endH, endM] = schedSlot.end.split(':').map(Number);
        let availMins = endH * 60 + endM - (startH * 60 + startM);

        // Subtract break
        if (schedSlot.breakStart && schedSlot.breakEnd) {
          const [bsH, bsM] = schedSlot.breakStart.split(':').map(Number);
          const [beH, beM] = schedSlot.breakEnd.split(':').map(Number);
          availMins -= beH * 60 + beM - (bsH * 60 + bsM);
        }

        if (availMins > 0) totalAvailableMinutes += availMins;
      }

      const bookings = bookingMap.get(prof._id.toString()) || {
        totalDurationMins: 0,
        totalBookings: 0,
      };

      const totalAvailableHours = totalAvailableMinutes / 60;
      const totalWorkedHours = bookings.totalDurationMins / 60;
      const utilizationRate =
        totalAvailableHours > 0
          ? (totalWorkedHours / totalAvailableHours) * 100
          : 0;

      return {
        professionalId: prof._id,
        name: prof.name,
        totalAvailableHours,
        totalWorkedHours,
        utilizationRate,
        totalBookings: bookings.totalBookings,
        averageServiceDuration:
          bookings.totalBookings > 0
            ? bookings.totalDurationMins / bookings.totalBookings
            : 0,
        idleHours: Math.max(0, totalAvailableHours - totalWorkedHours),
      };
    });

    const avgUtilization =
      profStats.length > 0
        ? profStats.reduce((sum, p) => sum + p.utilizationRate, 0) /
          profStats.length
        : 0;

    return {
      professionals: profStats,
      averageUtilization: avgUtilization,
      period: { startDate, endDate },
    };
  }
}
