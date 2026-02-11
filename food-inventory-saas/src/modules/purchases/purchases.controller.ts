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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
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
    const result = await this.purchasesService.findAll(req.user.tenantId, query);
    return {
      success: true,
      data: result.purchases,
      pagination: {
        total: result.total,
        totalPages: result.totalPages,
        page: result.page,
        limit: result.limit,
      },
    };
  }

  @Patch(":id/receive")
  async receive(
    @Param("id") id: string,
    @Body() dto: { receivedBy?: string },
    @Req() req,
  ) {
    const purchaseOrder = await this.purchasesService.receivePurchaseOrder(
      id,
      dto,
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
  /**
   * Scan an invoice/delivery note image using AI to pre-fill purchase order data.
   * Accepts multipart form data with an image file.
   */
  @Post("scan-invoice")
  @UseInterceptors(
    FileInterceptor("image", {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpeg|jpg|png|webp|heic)$/)) {
          cb(new BadRequestException("Solo se permiten imágenes (JPEG, PNG, WebP, HEIC)"), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async scanInvoice(
    @UploadedFile() file: Express.Multer.File,
    @Req() req,
  ) {
    if (!file) {
      throw new BadRequestException("Debe cargar una imagen de la factura o nota de entrega.");
    }

    const imageBase64 = file.buffer.toString("base64");
    const result = await this.purchasesService.scanInvoiceImage(
      imageBase64,
      file.mimetype,
      req.user.tenantId,
    );

    return {
      success: true,
      data: result,
      message: `Factura escaneada con ${Math.round(result.overallConfidence * 100)}% de confianza`,
    };
  }

  /**
   * Reconcile all received POs: detect and repair missing supplier syncs
   */
  @Post("reconcile")
  async reconcile(@Req() req) {
    const report = await this.purchasesService.reconcilePurchaseOrders(
      req.user.tenantId,
      req.user,
    );
    return {
      success: true,
      data: report,
      message: `Reconciliación completada: ${report.metricsUpdated} proveedores sincronizados, ${report.productsLinked} productos vinculados, ${report.errors.length} errores`,
    };
  }

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
