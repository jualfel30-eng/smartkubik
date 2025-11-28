import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { LoyaltyService } from "./loyalty.service";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import {
  EarnPointsDto,
  RedeemPointsDto,
  AdjustPointsDto,
  GetPointsHistoryDto,
  UpdateLoyaltyConfigDto,
} from "../../dto/loyalty.dto";

@Controller("loyalty")
@UseGuards(JwtAuthGuard)
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  /**
   * POST /loyalty/earn
   * Acumula puntos para un cliente basado en una compra
   */
  @Post("earn")
  async earnPoints(@Body() dto: EarnPointsDto, @Request() req: any) {
    const transaction = await this.loyaltyService.earnPoints({
      tenantId: req.user.tenantId,
      customerId: dto.customerId,
      amount: dto.amount,
      orderId: dto.orderId,
      description: dto.description,
    });

    return {
      success: true,
      message: `${transaction.points} puntos acumulados`,
      data: {
        transactionId: transaction._id,
        points: transaction.points,
        balance: transaction.balanceAfter,
      },
    };
  }

  /**
   * POST /loyalty/redeem
   * Redime puntos de un cliente
   */
  @Post("redeem")
  async redeemPoints(@Body() dto: RedeemPointsDto, @Request() req: any) {
    const result = await this.loyaltyService.redeemPoints({
      tenantId: req.user.tenantId,
      customerId: dto.customerId,
      points: dto.points,
      orderId: dto.orderId,
      description: dto.description,
    });

    return {
      success: true,
      message: `${dto.points} puntos redimidos`,
      data: {
        transactionId: result.transaction._id,
        pointsRedeemed: Math.abs(result.transaction.points),
        discountAmount: result.discountAmount,
        balance: result.transaction.balanceAfter,
      },
    };
  }

  /**
   * POST /loyalty/adjust
   * Ajusta puntos manualmente (solo admin)
   */
  @Post("adjust")
  async adjustPoints(@Body() dto: AdjustPointsDto, @Request() req: any) {
    const transaction = await this.loyaltyService.adjustPoints({
      tenantId: req.user.tenantId,
      customerId: dto.customerId,
      points: dto.points,
      reason: dto.reason,
      type: dto.type as any,
      userId: req.user.id,
    });

    return {
      success: true,
      message: "Puntos ajustados correctamente",
      data: {
        transactionId: transaction._id,
        adjustment: transaction.points,
        balance: transaction.balanceAfter,
        reason: transaction.description,
      },
    };
  }

  /**
   * GET /loyalty/balance/:customerId
   * Obtiene el balance de puntos de un cliente
   */
  @Get("balance/:customerId")
  async getBalance(@Param("customerId") customerId: string, @Request() req: any) {
    const balance = await this.loyaltyService.getPointsBalance(
      req.user.tenantId,
      customerId,
    );

    return {
      success: true,
      data: balance,
    };
  }

  /**
   * GET /loyalty/history
   * Obtiene el historial de transacciones de puntos
   */
  @Get("history")
  async getHistory(@Query() dto: GetPointsHistoryDto, @Request() req: any) {
    const result = await this.loyaltyService.getPointsHistory({
      tenantId: req.user.tenantId,
      customerId: dto.customerId,
      type: dto.type as any,
      startDate: dto.startDate,
      endDate: dto.endDate,
      page: dto.page || 1,
      limit: dto.limit || 50,
    });

    return {
      success: true,
      data: result.transactions,
      pagination: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        limit: dto.limit || 50,
      },
    };
  }

  /**
   * GET /loyalty/tier/:customerId
   * Obtiene el tier de lealtad de un cliente
   */
  @Get("tier/:customerId")
  async getTier(@Param("customerId") customerId: string, @Request() req: any) {
    const tier = await this.loyaltyService.resolveLoyaltyTier(
      req.user.tenantId,
      customerId,
    );

    return {
      success: true,
      data: { tier },
    };
  }

  /**
   * POST /loyalty/expire
   * Ejecuta job de expiración de puntos (admin/cron)
   */
  @Post("expire")
  async expirePoints(@Request() req: any) {
    const totalExpired = await this.loyaltyService.expirePoints(
      req.user.tenantId,
    );

    return {
      success: true,
      message: `${totalExpired} puntos expirados`,
      data: { totalExpired },
    };
  }
}
