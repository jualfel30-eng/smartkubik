import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  Patch,
} from "@nestjs/common";
import { PurchasesService } from "./purchases.service";
import { CreatePurchaseOrderDto } from "../../dto/purchase-order.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";

@UseGuards(JwtAuthGuard)
@Controller("purchases")
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post()
  async create(@Body() createDto: CreatePurchaseOrderDto, @Req() req) {
    const purchaseOrder = await this.purchasesService.create(
      createDto,
      req.user,
    );
    return { success: true, data: purchaseOrder };
  }

  @Get()
  async findAll(@Req() req) {
    const purchases = await this.purchasesService.findAll(req.user.tenantId);
    return { success: true, data: purchases };
  }

  @Patch(":id/receive")
  async receive(@Param("id") id: string, @Req() req) {
    const purchaseOrder = await this.purchasesService.receivePurchaseOrder(
      id,
      req.user,
    );
    return { success: true, data: purchaseOrder };
  }
}
