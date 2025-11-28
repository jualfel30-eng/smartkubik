import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { CouponsService } from "./coupons.service";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import {
  CreateCouponDto,
  UpdateCouponDto,
  ValidateCouponDto,
  ApplyCouponDto,
  GetCouponsQueryDto,
  GetCouponStatsDto,
} from "../../dto/coupon.dto";

@Controller("coupons")
@UseGuards(JwtAuthGuard)
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  /**
   * POST /coupons
   * Crear un nuevo cupón
   */
  @Post()
  async create(@Body() dto: CreateCouponDto, @Request() req: any) {
    const coupon = await this.couponsService.create(
      req.user.tenantId,
      dto,
      req.user.id,
    );

    return {
      success: true,
      message: `Cupón "${coupon.code}" creado exitosamente`,
      data: {
        id: coupon._id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        validFrom: coupon.validFrom,
        validUntil: coupon.validUntil,
        isActive: coupon.isActive,
      },
    };
  }

  /**
   * GET /coupons
   * Obtener lista de cupones con filtros
   */
  @Get()
  async findAll(@Query() query: GetCouponsQueryDto, @Request() req: any) {
    const result = await this.couponsService.findAll(req.user.tenantId, query);

    return {
      success: true,
      data: result.coupons,
      pagination: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        limit: query.limit || 20,
      },
    };
  }

  /**
   * GET /coupons/:id
   * Obtener un cupón por ID
   */
  @Get(":id")
  async findOne(@Param("id") id: string, @Request() req: any) {
    const coupon = await this.couponsService.findOne(req.user.tenantId, id);

    return {
      success: true,
      data: coupon,
    };
  }

  /**
   * PUT /coupons/:id
   * Actualizar un cupón
   */
  @Put(":id")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateCouponDto,
    @Request() req: any,
  ) {
    const coupon = await this.couponsService.update(
      req.user.tenantId,
      id,
      dto,
    );

    return {
      success: true,
      message: "Cupón actualizado exitosamente",
      data: coupon,
    };
  }

  /**
   * DELETE /coupons/:id
   * Eliminar un cupón
   */
  @Delete(":id")
  async remove(@Param("id") id: string, @Request() req: any) {
    await this.couponsService.remove(req.user.tenantId, id);

    return {
      success: true,
      message: "Cupón eliminado exitosamente",
    };
  }

  /**
   * POST /coupons/validate
   * Validar un cupón antes de aplicarlo
   */
  @Post("validate")
  async validate(@Body() dto: ValidateCouponDto, @Request() req: any) {
    const validation = await this.couponsService.validate(
      req.user.tenantId,
      dto,
    );

    return {
      success: validation.isValid,
      message: validation.message,
      data: validation,
    };
  }

  /**
   * POST /coupons/apply
   * Aplicar un cupón a una orden
   */
  @Post("apply")
  async apply(@Body() dto: ApplyCouponDto, @Request() req: any) {
    const result = await this.couponsService.apply(req.user.tenantId, dto);

    return {
      success: true,
      message: `Cupón "${dto.code}" aplicado exitosamente`,
      data: {
        usageId: result.usage._id,
        discountAmount: result.discountAmount,
        code: dto.code,
      },
    };
  }

  /**
   * GET /coupons/:id/stats
   * Obtener estadísticas de uso de un cupón
   */
  @Get(":id/stats")
  async getStats(@Param("id") id: string, @Request() req: any, @Query() query: GetCouponStatsDto) {
    const stats = await this.couponsService.getStats(
      req.user.tenantId,
      id,
      query.startDate,
      query.endDate,
    );

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * GET /coupons/customer/:customerId/history
   * Obtener historial de cupones usados por un cliente
   */
  @Get("customer/:customerId/history")
  async getCustomerHistory(
    @Param("customerId") customerId: string,
    @Request() req: any,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    const result = await this.couponsService.getCustomerUsageHistory(
      req.user.tenantId,
      customerId,
      page,
      limit,
    );

    return {
      success: true,
      data: result.usages,
      pagination: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        limit: limit || 20,
      },
    };
  }
}
