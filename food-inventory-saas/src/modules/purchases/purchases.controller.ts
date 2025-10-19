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
import { TenantGuard } from "../../guards/tenant.guard";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("purchases")
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Post()
  async create(@Body() createDto: CreatePurchaseOrderDto, @Req() req) {
    console.log("[PurchasesController] POST /purchases called");
    console.log("[PurchasesController] User:", req.user?.email);
    console.log("[PurchasesController] TenantId:", req.user?.tenantId);
    console.log("[PurchasesController] Tenant:", req.tenant?.name);
    console.log(
      "[PurchasesController] DTO:",
      JSON.stringify(createDto, null, 2),
    );

    try {
      const purchaseOrder = await this.purchasesService.create(
        createDto,
        req.user,
      );
      console.log("[PurchasesController] Purchase order created successfully");
      return { success: true, data: purchaseOrder };
    } catch (error) {
      console.error(
        "[PurchasesController] Error creating purchase order:",
        error.message,
      );
      console.error("[PurchasesController] Stack:", error.stack);
      throw error;
    }
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
