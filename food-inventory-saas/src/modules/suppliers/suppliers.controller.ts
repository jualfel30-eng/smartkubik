import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Patch,
} from "@nestjs/common";
import { SuppliersService, SupplierPaymentCurrency } from "./suppliers.service";
import { CreateSupplierDto } from "../../dto/supplier.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";

@UseGuards(JwtAuthGuard)
@Controller("suppliers")
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) { }

  @Post()
  create(@Body() createSupplierDto: CreateSupplierDto, @Req() req) {
    return this.suppliersService.create(createSupplierDto, req.user);
  }

  @Get()
  findAll(@Req() req, @Query("search") search: string) {
    return this.suppliersService.findAll(req.user.tenantId, search);
  }

  // ============================================================
  // === PRICING ENGINE ENDPOINTS: Supplier Payment Filters ===
  // ============================================================

  /**
   * Get suppliers grouped by payment currency
   * Used by pricing engine to show filter options
   */
  @Get("pricing/by-currency")
  async getSuppliersByPaymentCurrency(@Req() req) {
    return {
      success: true,
      data: await this.suppliersService.getSuppliersByPaymentCurrency(req.user.tenantId)
    };
  }

  /**
   * Get suppliers by specific payment method
   */
  @Get("pricing/by-method/:method")
  async getSuppliersByPaymentMethod(
    @Param("method") method: string,
    @Req() req
  ) {
    return {
      success: true,
      data: await this.suppliersService.getSuppliersByPaymentMethod(req.user.tenantId, method)
    };
  }

  /**
   * Update supplier payment settings and sync to all linked products
   */
  @Patch(":id/payment-settings")
  async updatePaymentSettingsAndSync(
    @Param("id") id: string,
    @Body() body: {
      preferredPaymentMethod?: string;
      acceptedPaymentMethods?: string[];
      paymentCurrency?: SupplierPaymentCurrency;
      usesParallelRate?: boolean;
    },
    @Req() req
  ) {
    const result = await this.suppliersService.updatePaymentSettingsAndSync(
      id,
      req.user.tenantId,
      req.user.id,
      body
    );
    return {
      success: true,
      message: `Configuración actualizada y sincronizada con ${result.syncedProducts} productos`,
      data: result
    };
  }

  /**
   * Bulk sync all suppliers' payment config to their products
   * Useful for initial setup or data migration
   */
  @Post("pricing/bulk-sync")
  async bulkSyncAllSuppliersPaymentConfig(@Req() req) {
    const result = await this.suppliersService.bulkSyncAllSuppliersPaymentConfig(req.user.tenantId);
    return {
      success: true,
      message: `Sincronización masiva completada: ${result.suppliersProcessed} proveedores, ${result.totalProductsUpdated} productos actualizados`,
      data: result
    };
  }

  // ============================================================

  @Get(":id")
  findOne(@Param("id") id: string, @Req() req) {
    return this.suppliersService.findOne(id, req.user.tenantId);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  update(@Param("id") id: string, @Body() updateSupplierDto: any, @Req() req) {
    return this.suppliersService.update(id, updateSupplierDto, req.user);
  }
}
