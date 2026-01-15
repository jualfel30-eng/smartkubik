import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  Patch,
  Query,
} from "@nestjs/common";
import { PurchasesService } from "./purchases.service";
import { CreatePurchaseOrderDto } from "../../dto/purchase-order.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("purchases")
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) { }

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
  async findAll(@Query() query: any, @Req() req) {
    const purchases = await this.purchasesService.findAll(req.user.tenantId, query);
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

  /**
   * Approve a Purchase Order
   * Phase 1.4: Approval Workflow
   */
  @Patch(":id/approve")
  async approve(
    @Param("id") id: string,
    @Body() body: { notes?: string },
    @Req() req,
  ) {
    const purchaseOrder = await this.purchasesService.approve(
      id,
      req.user.id,
      req.user.tenantId,
      body.notes,
    );
    return { success: true, data: purchaseOrder };
  }

  /**
   * Reject a Purchase Order
   * Phase 1.4: Approval Workflow
   */
  @Patch(":id/reject")
  async reject(
    @Param("id") id: string,
    @Body() body: { reason: string },
    @Req() req,
  ) {
    if (!body.reason) {
      throw new Error("Rejection reason is required");
    }
    const purchaseOrder = await this.purchasesService.reject(
      id,
      req.user.id,
      req.user.tenantId,
      body.reason,
    );
    return { success: true, data: purchaseOrder };
  }

  /**
   * Get Purchase Orders pending approval
   * Phase 1.4: Approval Workflow
   */
  @Get("pending-approval")
  async findPendingApproval(@Req() req) {
    const purchaseOrders = await this.purchasesService.findPendingApproval(
      req.user.tenantId,
    );
    return { success: true, data: purchaseOrders };
  }

  /**
   * Auto-generate Purchase Orders based on low stock
   * Phase 1.4: Auto-generation
   */
  @Post("auto-generate")
  async autoGenerate(@Req() req) {
    const purchaseOrders = await this.purchasesService.autoGeneratePOs(
      req.user.tenantId,
    );
    return {
      success: true,
      data: purchaseOrders,
      message: `${purchaseOrders.length} purchase order(s) auto-generated`,
    };
  }
}
