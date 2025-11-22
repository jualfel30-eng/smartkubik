import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { Permissions } from "../../decorators/permissions.decorator";
import { ABTestingService } from "./ab-testing.service";
import {
  CreateABTestDto,
  UpdateVariantDto,
  DeclareWinnerDto,
} from "../../dto/ab-testing.dto";

@ApiTags("A/B Testing")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("marketing")
export class ABTestingController {
  constructor(private readonly abTestingService: ABTestingService) {}

  @Post("campaigns/:campaignId/ab-test")
  @Permissions("marketing_write")
  @ApiOperation({ summary: "Crear un A/B test con múltiples variantes" })
  @ApiResponse({ status: 201, description: "A/B test creado exitosamente" })
  async createABTest(
    @Param("campaignId") campaignId: string,
    @Body() dto: CreateABTestDto,
    @Request() req,
  ) {
    // Override campaignId from path param
    dto.campaignId = campaignId;

    const variants = await this.abTestingService.createABTest(
      dto,
      req.user.tenantId,
    );

    return {
      success: true,
      message: `A/B test creado con ${variants.length} variantes`,
      data: variants,
    };
  }

  @Get("campaigns/:campaignId/variants")
  @Permissions("marketing_read")
  @ApiOperation({ summary: "Obtener todas las variantes de un A/B test" })
  async getVariants(@Param("campaignId") campaignId: string, @Request() req) {
    const variants = await this.abTestingService.getVariants(
      campaignId,
      req.user.tenantId,
    );

    return {
      success: true,
      data: variants,
    };
  }

  @Get("variants/:variantId")
  @Permissions("marketing_read")
  @ApiOperation({ summary: "Obtener una variante específica" })
  async getVariant(@Param("variantId") variantId: string, @Request() req) {
    const variant = await this.abTestingService.getVariant(
      variantId,
      req.user.tenantId,
    );

    return {
      success: true,
      data: variant,
    };
  }

  @Put("variants/:variantId")
  @Permissions("marketing_write")
  @ApiOperation({ summary: "Actualizar una variante" })
  async updateVariant(
    @Param("variantId") variantId: string,
    @Body() dto: UpdateVariantDto,
    @Request() req,
  ) {
    const variant = await this.abTestingService.updateVariant(
      variantId,
      dto,
      req.user.tenantId,
    );

    return {
      success: true,
      message: "Variante actualizada",
      data: variant,
    };
  }

  @Delete("variants/:variantId")
  @Permissions("marketing_write")
  @ApiOperation({ summary: "Eliminar una variante" })
  async deleteVariant(@Param("variantId") variantId: string, @Request() req) {
    await this.abTestingService.deleteVariant(variantId, req.user.tenantId);

    return {
      success: true,
      message: "Variante eliminada",
    };
  }

  @Get("campaigns/:campaignId/ab-results")
  @Permissions("marketing_read")
  @ApiOperation({
    summary: "Obtener resultados del A/B test con análisis estadístico",
  })
  @ApiResponse({
    status: 200,
    description:
      "Retorna métricas de todas las variantes y el ganador si existe",
  })
  async getABTestResults(
    @Param("campaignId") campaignId: string,
    @Request() req,
  ) {
    const results = await this.abTestingService.calculateVariantMetrics(
      campaignId,
      req.user.tenantId,
    );

    return {
      success: true,
      data: results,
    };
  }

  @Post("campaigns/:campaignId/declare-winner")
  @Permissions("marketing_write")
  @ApiOperation({ summary: "Declarar manualmente un ganador del A/B test" })
  async declareWinner(
    @Param("campaignId") campaignId: string,
    @Body() dto: DeclareWinnerDto,
    @Request() req,
  ) {
    const winner = await this.abTestingService.declareWinner(
      dto,
      req.user.tenantId,
    );

    return {
      success: true,
      message: "Ganador declarado exitosamente",
      data: winner,
    };
  }

  @Post("campaigns/:campaignId/auto-select-winner")
  @Permissions("marketing_write")
  @ApiOperation({
    summary: "Auto-seleccionar ganador basado en significancia estadística",
  })
  @ApiResponse({
    status: 200,
    description:
      "Selecciona automáticamente el ganador si tiene significancia estadística",
  })
  async autoSelectWinner(
    @Param("campaignId") campaignId: string,
    @Request() req,
  ) {
    const result = await this.abTestingService.autoSelectWinner(
      campaignId,
      req.user.tenantId,
    );

    return result;
  }
}
