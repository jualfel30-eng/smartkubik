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
import { PromotionsService } from "./promotions.service";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import {
  CreatePromotionDto,
  UpdatePromotionDto,
  FindApplicablePromotionsDto,
  ApplyPromotionDto,
  GetPromotionsQueryDto,
} from "../../dto/promotion.dto";

@Controller("promotions")
@UseGuards(JwtAuthGuard)
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  /**
   * POST /promotions
   * Crear una nueva promoción
   */
  @Post()
  async create(@Body() dto: CreatePromotionDto, @Request() req: any) {
    const promotion = await this.promotionsService.create(
      req.user.tenantId,
      dto,
      req.user.id,
    );

    return {
      success: true,
      message: `Promoción "${promotion.name}" creada exitosamente`,
      data: {
        id: promotion._id,
        name: promotion.name,
        type: promotion.type,
        status: promotion.status,
        startDate: promotion.startDate,
        endDate: promotion.endDate,
      },
    };
  }

  /**
   * GET /promotions
   * Obtener lista de promociones con filtros
   */
  @Get()
  async findAll(@Query() query: GetPromotionsQueryDto, @Request() req: any) {
    const result = await this.promotionsService.findAll(
      req.user.tenantId,
      query,
    );

    return {
      success: true,
      data: result.promotions,
      pagination: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        limit: query.limit || 20,
      },
    };
  }

  /**
   * GET /promotions/applicable
   * Obtener promociones aplicables a un carrito
   */
  @Post("applicable")
  async findApplicable(
    @Body() dto: FindApplicablePromotionsDto,
    @Request() req: any,
  ) {
    const promotions = await this.promotionsService.findApplicable(
      req.user.tenantId,
      dto,
    );

    return {
      success: true,
      data: promotions,
      count: promotions.length,
    };
  }

  /**
   * GET /promotions/:id
   * Obtener una promoción por ID
   */
  @Get(":id")
  async findOne(@Param("id") id: string, @Request() req: any) {
    const promotion = await this.promotionsService.findOne(
      req.user.tenantId,
      id,
    );

    return {
      success: true,
      data: promotion,
    };
  }

  /**
   * PUT /promotions/:id
   * Actualizar una promoción
   */
  @Put(":id")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdatePromotionDto,
    @Request() req: any,
  ) {
    const promotion = await this.promotionsService.update(
      req.user.tenantId,
      id,
      dto,
    );

    return {
      success: true,
      message: "Promoción actualizada exitosamente",
      data: promotion,
    };
  }

  /**
   * DELETE /promotions/:id
   * Eliminar una promoción
   */
  @Delete(":id")
  async remove(@Param("id") id: string, @Request() req: any) {
    await this.promotionsService.remove(req.user.tenantId, id);

    return {
      success: true,
      message: "Promoción eliminada exitosamente",
    };
  }

  /**
   * POST /promotions/:id/calculate
   * Calcular descuento de una promoción específica
   */
  @Post(":id/calculate")
  async calculateDiscount(
    @Param("id") id: string,
    @Body() dto: ApplyPromotionDto,
    @Request() req: any,
  ) {
    const promotion = await this.promotionsService.findOne(
      req.user.tenantId,
      id,
    );

    const result = await this.promotionsService.calculateDiscount(
      promotion,
      dto,
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * POST /promotions/apply
   * Aplicar una promoción a una orden
   */
  @Post("apply")
  async apply(@Body() dto: ApplyPromotionDto, @Request() req: any) {
    const result = await this.promotionsService.apply(req.user.tenantId, dto);

    return {
      success: true,
      message: `Promoción aplicada exitosamente`,
      data: {
        usageId: result.usage._id,
        discountAmount: result.result.discountAmount,
        finalAmount: result.result.finalAmount,
        promotionName: result.result.promotionName,
        productsAffected: result.result.productsAffected,
      },
    };
  }

  /**
   * GET /promotions/:id/stats
   * Obtener estadísticas de una promoción
   */
  @Get(":id/stats")
  async getStats(
    @Param("id") id: string,
    @Request() req: any,
    @Query("startDate") startDate?: Date,
    @Query("endDate") endDate?: Date,
  ) {
    const stats = await this.promotionsService.getStats(
      req.user.tenantId,
      id,
      startDate,
      endDate,
    );

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * POST /promotions/expire
   * Ejecutar job de expiración de promociones (admin/cron)
   */
  @Post("expire")
  async expirePromotions(@Request() req: any) {
    const count = await this.promotionsService.expirePromotions(
      req.user.tenantId,
    );

    return {
      success: true,
      message: `${count} promociones expiradas`,
      data: { count },
    };
  }
}
