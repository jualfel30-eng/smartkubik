import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { PerformanceKpi, PerformanceKpiSchema } from '../../schemas/performance-kpi.schema';
import { Order, OrderSchema } from '../../schemas/order.schema';
import { Shift, ShiftSchema } from '../../schemas/shift.schema';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: PerformanceKpi.name, schema: PerformanceKpiSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Shift.name, schema: ShiftSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
