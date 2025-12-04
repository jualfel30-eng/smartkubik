import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Req,
  HttpException,
  HttpStatus,
  Param,
  Query,
  Patch,
} from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { CreatePaymentDto, ReconciliationStatus } from "../../dto/payment.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { Permissions } from "../../decorators/permissions.decorator";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { PaymentStatus } from "../../dto/payment.dto";

@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Permissions("payments_write")
  @Post()
  async create(@Body() dto: CreatePaymentDto, @Req() req: any) {
    try {
      const payment = await this.paymentsService.create(dto, req.user);
      return {
        success: true,
        message: "Pago registrado exitosamente",
        data: payment,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al registrar el pago",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Permissions("payments_read")
  @Get()
  async findAll(@Req() req: any) {
    try {
      const payments = await this.paymentsService.findAll(
        req.user.tenantId,
        req.query || {},
      );
      return {
        success: true,
        message: "Pagos obtenidos exitosamente",
        data: payments.data,
        pagination: payments.pagination,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al obtener los pagos",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Permissions("payments_write")
  @Post(":id/apply")
  async apply(
    @Param("id") id: string,
    @Body()
    body: {
      allocations: Array<{
        documentId: string;
        documentType: string;
        amount: number;
      }>;
    },
    @Req() req: any,
  ) {
    try {
      const payment = await this.paymentsService.applyAllocations(
        id,
        body.allocations || [],
        req.user,
      );
      return {
        success: true,
        message: "Aplicaciones registradas correctamente",
        data: payment,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al aplicar el pago",
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Permissions("payments_read")
  @Get("export")
  async export(@Req() req: any) {
    try {
      const result = await this.paymentsService.exportAll(
        req.user.tenantId,
        req.query || {},
      );
      return {
        success: true,
        message: "Exportación generada",
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al exportar pagos",
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Permissions("payments_read")
  @Get("reports/summary")
  async summary(
    @Query()
    query: {
      from?: string;
      to?: string;
      groupBy?: "method" | "status" | "currency";
    },
    @Req() req: any,
  ) {
    try {
      const summary = await this.paymentsService.getSummary(
        req.user.tenantId,
        query,
      );
      return {
        success: true,
        message: "Reporte de pagos generado",
        data: summary,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al generar el reporte",
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Permissions("payments_read")
  @Get("reports/aging")
  async aging(
    @Query()
    query: {
      asOf?: string;
      buckets?: string; // Ej: "30,60,90"
    },
    @Req() req: any,
  ) {
    try {
      const report = await this.paymentsService.getAging(
        req.user.tenantId,
        query,
      );
      return {
        success: true,
        message: "Reporte de aging generado",
        data: report,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al generar aging",
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Permissions("payments_write")
  @Patch(":id/reconcile")
  async reconcile(
    @Param("id") id: string,
    @Body()
    body: {
      status: ReconciliationStatus;
      statementRef?: string;
      note?: string;
    },
    @Req() req: any,
  ) {
    try {
      const payment = await this.paymentsService.reconcile(
        id,
        body.status,
        req.user,
        body.statementRef,
        body.note,
      );
      return {
        success: true,
        message: "Conciliación actualizada",
        data: payment,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al conciliar pago",
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Permissions("payments_confirm")
  @Post(":id/status")
  async updateStatus(
    @Param("id") id: string,
    @Body()
    body: {
      status: PaymentStatus;
      reason?: string;
    },
    @Req() req: any,
  ) {
    try {
      const payment = await this.paymentsService.updateStatus(
        id,
        body.status,
        req.user,
        body.reason,
      );
      return {
        success: true,
        message: "Estado de pago actualizado",
        data: payment,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al actualizar estado",
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }
}
