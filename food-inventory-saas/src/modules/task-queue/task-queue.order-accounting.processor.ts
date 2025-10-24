import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { AccountingService } from "../accounting/accounting.service";
import { Order, OrderDocument } from "../../schemas/order.schema";
import { TaskQueueService } from "./task-queue.service";
import { OrderAccountingJobData } from "./task-queue.types";

@Injectable()
export class OrderAccountingQueueProcessor {
  private readonly logger = new Logger(OrderAccountingQueueProcessor.name);

  constructor(
    private readonly taskQueueService: TaskQueueService,
    private readonly accountingService: AccountingService,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
  ) {
    this.taskQueueService.registerHandler(
      "order-accounting",
      (payload) => this.handleOrderAccounting(payload as OrderAccountingJobData),
    );
  }

  private async handleOrderAccounting(
    payload: OrderAccountingJobData,
  ): Promise<void> {
    const { orderId, tenantId, trigger } = payload;

    const orderObjectId = this.toObjectId(orderId);
    if (!orderObjectId) {
      this.logger.warn(
        `No se pudo procesar el trabajo de contabilidad porque el ID ${orderId} no es válido.`,
      );
      return;
    }

    const order = await this.orderModel
      .findById(orderObjectId)
      .populate("items.product")
      .exec();

    if (!order) {
      this.logger.warn(
        `La orden ${orderId} no existe; se omite la generación de asientos contables.`,
      );
      return;
    }

    await this.accountingService.createJournalEntryForSale(order, tenantId);
    await this.accountingService.createJournalEntryForCOGS(order, tenantId);

    this.logger.debug?.(
      `Generados asientos contables para la orden ${order.orderNumber} (trigger=${
        trigger ?? "manual"
      }).`,
    );
  }

  private toObjectId(id: string): Types.ObjectId | null {
    try {
      return new Types.ObjectId(id);
    } catch (error) {
      return null;
    }
  }
}
