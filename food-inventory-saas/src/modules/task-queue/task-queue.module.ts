import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { TaskQueueService } from "./task-queue.service";
import { AccountingModule } from "../accounting/accounting.module";
import { Order, OrderSchema } from "../../schemas/order.schema";
import {
  TaskQueueJob,
  TaskQueueJobSchema,
} from "../../schemas/task-queue-job.schema";
import { OrderAccountingQueueProcessor } from "./task-queue.order-accounting.processor";

@Module({
  imports: [
    AccountingModule,
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: TaskQueueJob.name, schema: TaskQueueJobSchema },
    ]),
  ],
  providers: [TaskQueueService, OrderAccountingQueueProcessor],
  exports: [TaskQueueService],
})
export class TaskQueueModule {}
