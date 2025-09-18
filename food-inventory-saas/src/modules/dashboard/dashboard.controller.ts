import {
  Controller,
  Get,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { DashboardService } from "./dashboard.service";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { RequirePermissions } from "../../decorators/permissions.decorator";

@ApiTags("dashboard")
@Controller("dashboard")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("summary")
  @RequirePermissions("reports", ["read"]) // Assuming dashboard is part of reports
  @ApiOperation({ summary: "Obtener un resumen de datos para el dashboard" })
  @ApiResponse({ status: 200, description: "Resumen obtenido exitosamente" })
  async getSummary(@Request() req) {
    try {
      const summary = await this.dashboardService.getSummary(req.user);
      return {
        success: true,
        message: "Resumen del dashboard obtenido exitosamente",
        data: summary,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al obtener el resumen del dashboard",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
