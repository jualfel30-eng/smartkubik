import { Body, Controller, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { OpportunitiesService } from "../opportunities/opportunities.service";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Order, OrderDocument } from "../../schemas/order.schema";

@ApiTags("payments-webhooks")
@Controller("payments-webhooks")
export class PaymentsWebhookController {
  constructor(
    private readonly opportunitiesService: OpportunitiesService,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
  ) {}

  @Post("/order-paid")
  @ApiOperation({ summary: "Auto-win oportunidad cuando un pedido se paga" })
  async handleOrderPaid(@Body() payload: any) {
    const { orderId, tenantId, status } = payload;
    if (!tenantId || !orderId) {
      return { success: false, message: "tenantId y orderId son requeridos" };
    }
    if (payload.status && payload.status.toLowerCase() !== "paid") {
      return { success: true, skipped: true };
    }
    // Si no viene customerId, intentar buscar por orderId en payments/orders
    let customerId = payload.customerId;
    if (!customerId && payload?.customer?._id) {
      customerId = payload.customer._id;
    }
    // payload puede traer order con customerId
    if (!customerId && payload?.order?.customerId) {
      customerId = payload.order.customerId;
    }
    // lookup por modelo Order si sigue vacío
    if (!customerId) {
      const order = await this.orderModel
        .findOne({ _id: orderId, tenantId })
        .select("customerId total currency")
        .lean();
      if (order) {
        customerId = (order as any).customerId?.toString();
        payload.amount = payload.amount ?? (order as any).total;
        payload.currency = payload.currency ?? (order as any).currency;
      }
    }

    const opp = await this.opportunitiesService.autoWinFromPayment({
      orderId,
      tenantId,
      customerId,
      amount: payload.amount,
      currency: payload.currency,
    });
    return { success: true, data: opp };
  }
}
