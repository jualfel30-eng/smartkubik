import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from "@nestjs/common";
import { DeliveryService } from "./delivery.service";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";

@Controller("delivery")
@UseGuards(JwtAuthGuard)
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Post("calculate")
  async calculateDeliveryCost(
    @Body()
    body: {
      method: "pickup" | "delivery" | "envio_nacional";
      customerLocation?: { lat: number; lng: number };
      destinationState?: string;
      destinationCity?: string;
      orderAmount?: number;
    },
    @Request() req,
  ): Promise<any> {
    return this.deliveryService.calculateDeliveryCost({
      tenantId: req.user.tenantId,
      ...body,
    });
  }

  @Get("rates")
  async getDeliveryRates(@Request() req): Promise<any> {
    return this.deliveryService.getDeliveryRates(req.user.tenantId);
  }

  @Post("rates")
  async upsertDeliveryRates(@Request() req, @Body() body: any): Promise<any> {
    return this.deliveryService.upsertDeliveryRates(
      req.user.tenantId,
      body,
      req.user.id,
    );
  }
}
