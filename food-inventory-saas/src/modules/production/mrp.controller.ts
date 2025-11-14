import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  Request,
  UseGuards,
} from "@nestjs/common";
import { MRPService } from "./mrp.service";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("mrp")
export class MRPController {
  constructor(private readonly mrpService: MRPService) {}

  /**
   * Calcular requerimientos de materiales para una orden específica
   * GET /mrp/order/:orderId
   */
  @Get("order/:orderId")
  async calculateOrderRequirements(
    @Param("orderId") orderId: string,
    @Request() req,
  ) {
    const result = await this.mrpService.calculateMaterialRequirements(
      orderId,
      req.user,
    );
    return { success: true, data: result };
  }

  /**
   * Calcular requerimientos agregados para múltiples órdenes
   * POST /mrp/aggregated
   * Body: { orderIds: string[] }
   */
  @Post("aggregated")
  async calculateAggregatedRequirements(
    @Body("orderIds") orderIds: string[],
    @Request() req,
  ) {
    const result = await this.mrpService.calculateAggregatedRequirements(
      orderIds,
      req.user,
    );
    return { success: true, data: result };
  }

  /**
   * Obtener requerimientos por rango de fechas
   * GET /mrp/by-date-range?startDate=2024-01-01&endDate=2024-12-31
   */
  @Get("by-date-range")
  async getRequirementsByDateRange(
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
    @Request() req,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const result = await this.mrpService.getRequirementsByDateRange(
      start,
      end,
      req.user,
    );
    return { success: true, data: result };
  }

  /**
   * Generar sugerencias de compra
   * POST /mrp/purchase-suggestions
   * Body: { orderIds: string[] }
   */
  @Post("purchase-suggestions")
  async generatePurchaseSuggestions(
    @Body("orderIds") orderIds: string[],
    @Request() req,
  ) {
    const result = await this.mrpService.generatePurchaseSuggestions(
      orderIds,
      req.user,
    );
    return { success: true, data: result };
  }
}
