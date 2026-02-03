import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { InvestmentsService } from "./investments.service";
import {
  CreateInvestmentDto,
  UpdateInvestmentDto,
} from "../../dto/investment.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";

@Controller("investments")
@UseGuards(JwtAuthGuard, TenantGuard)
export class InvestmentsController {
  constructor(private readonly investmentsService: InvestmentsService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions("reports_create")
  async create(@Req() req, @Body() dto: CreateInvestmentDto) {
    try {
      const investment = await this.investmentsService.create(
        dto,
        req.user.tenantId,
      );
      return { success: true, data: investment };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al crear inversión",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions("reports_read")
  async findAll(@Req() req) {
    try {
      const investments = await this.investmentsService.findAll(
        req.user.tenantId,
      );
      return { success: true, data: investments };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al listar inversiones",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("summary")
  @UseGuards(PermissionsGuard)
  @Permissions("reports_read")
  async getSummary(@Req() req) {
    try {
      const summary = await this.investmentsService.getSummary(
        req.user.tenantId,
      );
      return { success: true, data: summary };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al obtener resumen",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(":id")
  @UseGuards(PermissionsGuard)
  @Permissions("reports_read")
  async findOne(@Req() req, @Param("id") id: string) {
    try {
      const investment = await this.investmentsService.findOne(
        id,
        req.user.tenantId,
      );
      return { success: true, data: investment };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al obtener inversión",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(":id")
  @UseGuards(PermissionsGuard)
  @Permissions("reports_create")
  async update(
    @Req() req,
    @Param("id") id: string,
    @Body() dto: UpdateInvestmentDto,
  ) {
    try {
      const investment = await this.investmentsService.update(
        id,
        req.user.tenantId,
        dto,
      );
      return { success: true, data: investment };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al actualizar inversión",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(":id")
  @UseGuards(PermissionsGuard)
  @Permissions("reports_create")
  async remove(@Req() req, @Param("id") id: string) {
    try {
      await this.investmentsService.remove(id, req.user.tenantId);
      return { success: true, message: "Inversión eliminada" };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al eliminar inversión",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
