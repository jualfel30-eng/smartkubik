import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ServerPerformanceController } from "./server-performance.controller";
import { ServerPerformanceService } from "./server-performance.service";
import {
  ServerPerformance,
  ServerPerformanceSchema,
} from "../../schemas/server-performance.schema";
import { Order, OrderSchema } from "../../schemas/order.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ServerPerformance.name, schema: ServerPerformanceSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
  ],
  controllers: [ServerPerformanceController],
  providers: [ServerPerformanceService],
  exports: [ServerPerformanceService],
})
export class ServerPerformanceModule {}
