import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpStatus,
  HttpException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { PricingService } from "./pricing.service";
import { OrderCalculationDto } from "../../dto/order.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";

@ApiTags("pricing")
@Controller("pricing")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiBearerAuth()
export class PricingController {
  constructor(private readonly pricingService: PricingService) { }

  @Post("calculate")
  @Permissions("pricing_calculate")
  @ApiOperation({
    summary: "Calcular precios de orden con impuestos venezolanos",
  })
  @ApiResponse({ status: 200, description: "Cálculo realizado exitosamente" })
  async calculateOrder(
    @Body() calculationDto: OrderCalculationDto,
    @Request() req,
  ) {
    try {
      const calculation = await this.pricingService.calculateOrder(
        calculationDto,
        req.tenant,
      );
      return {
        success: true,
        message: "Cálculo realizado exitosamente",
        data: calculation,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al calcular precios",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post("bulk/preview")
  @Permissions("pricing_manage")
  @ApiOperation({ summary: "Preview bulk price updates" })
  async previewBulkUpdate(
    @Body()
    body: {
      criteria: any;
      operation: any;
    },
    @Request() req,
  ) {
    try {
      const results = await this.pricingService.previewBulkUpdate(
        req.user.tenantId,
        body.criteria,
        body.operation,
      );
      return {
        success: true,
        data: results,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error generating preview",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post("bulk/execute")
  @Permissions("pricing_manage")
  @ApiOperation({ summary: "Execute bulk price updates" })
  async executeBulkUpdate(
    @Body()
    body: {
      criteria: any;
      operation: any;
    },
    @Request() req,
  ) {
    try {
      const result = await this.pricingService.executeBulkUpdate(
        req.user.tenantId,
        req.user.id,
        body.criteria,
        body.operation,
      );
      return {
        success: true,
        message: result.message,
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error executing update",
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
