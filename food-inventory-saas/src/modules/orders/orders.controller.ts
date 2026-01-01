import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
  Res,
  HttpStatus,
  HttpException,
  Logger,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { OrdersService } from "./orders.service";
import {
  CreateOrderDto,
  UpdateOrderDto,
  OrderQueryDto,
  OrderCalculationDto,
  BulkRegisterPaymentsDto,
} from "../../dto/order.dto";
import { UpdateFulfillmentDto } from "../../dto/fulfillment.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";
import { Public } from "../../decorators/public.decorator";
import { Response } from "express";

@ApiTags("orders")
@Controller("orders")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiBearerAuth()
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);

  constructor(private readonly ordersService: OrdersService) { }

  @Post()
  @Permissions("orders_create")
  @ApiOperation({ summary: "Crear nueva orden" })
  @ApiResponse({ status: 201, description: "Orden creada exitosamente" })
  async create(@Body() createOrderDto: CreateOrderDto, @Request() req) {
    this.logger.log(
      `Attempting to create order with DTO: ${JSON.stringify(createOrderDto)}`,
    );
    try {
      const order = await this.ordersService.create(createOrderDto, req.user);
      return {
        success: true,
        message: "Orden creada exitosamente",
        data: order,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al crear la orden",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get("export")
  @Permissions("orders_read")
  @ApiOperation({ summary: "Exportar órdenes en CSV con atributos" })
  @ApiResponse({
    status: 200,
    description: "Archivo CSV generado correctamente",
  })
  async export(
    @Query() query: OrderQueryDto,
    @Request() req,
    @Res() res: Response,
  ) {
    try {
      const csv = await this.ordersService.exportOrders(
        query,
        req.user.tenantId,
      );
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=\"orders_${Date.now()}.csv\"`,
      );
      res.send(csv);
    } catch (error) {
      throw new HttpException(
        error.message || "Error al exportar las órdenes",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("__lookup/payment-methods")
  @ApiOperation({ summary: "Obtener lista de métodos de pago" })
  async getPaymentMethods(@Request() req) {
    try {
      const methods = await this.ordersService.getPaymentMethods(req.user);
      return {
        success: true,
        message: "Métodos de pago obtenidos exitosamente",
        data: methods,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al obtener los métodos de pago",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("calculate")
  @Permissions("orders_create") // Usa el mismo permiso que 'create'
  @ApiOperation({ summary: "Calcular totales de una orden sin guardarla" })
  @ApiResponse({ status: 200, description: "Cálculo exitoso" })
  async calculateTotals(
    @Body() calculationDto: OrderCalculationDto,
    @Request() req,
  ) {
    try {
      const totals = await this.ordersService.calculateTotals(
        calculationDto,
        req.user,
      );
      return {
        success: true,
        message: "Cálculo de totales exitoso",
        data: totals,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al calcular los totales",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Public()
  @Get("track/:orderNumber")
  @ApiOperation({ summary: "Rastrear orden por número (público)" })
  @ApiResponse({ status: 200, description: "Orden encontrada" })
  async trackOrder(
    @Param("orderNumber") orderNumber: string,
    @Query("tenantId") tenantId: string,
  ) {
    try {
      if (!tenantId) {
        throw new HttpException(
          "tenantId es requerido",
          HttpStatus.BAD_REQUEST,
        );
      }

      const order = await this.ordersService.findByOrderNumber(
        orderNumber,
        tenantId,
      );

      if (!order) {
        throw new HttpException("Orden no encontrada", HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        message: "Orden encontrada",
        data: order,
      };
    } catch (error) {
      if (error.status === HttpStatus.NOT_FOUND) {
        throw error;
      }
      throw new HttpException(
        error.message || "Error al rastrear la orden",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @Permissions("orders_read")
  @ApiOperation({ summary: "Obtener lista de órdenes" })
  @ApiResponse({ status: 200, description: "Órdenes obtenidas exitosamente" })
  async findAll(@Query() query: OrderQueryDto, @Request() req) {
    try {
      const result = await this.ordersService.findAll(query, req.user.tenantId);
      return {
        success: true,
        message: "Órdenes obtenidas exitosamente",
        data: result.orders,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al obtener las órdenes",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(":id")
  @Permissions("orders_read")
  @ApiOperation({ summary: "Obtener orden por ID" })
  @ApiResponse({ status: 200, description: "Orden obtenida exitosamente" })
  async findOne(@Param("id") id: string, @Request() req) {
    try {
      const order = await this.ordersService.findOne(id, req.user.tenantId);
      if (!order) {
        throw new HttpException("Orden no encontrada", HttpStatus.NOT_FOUND);
      }
      return {
        success: true,
        message: "Orden obtenida exitosamente",
        data: order,
      };
    } catch (error) {
      if (error.status === HttpStatus.NOT_FOUND) {
        throw error;
      }
      throw new HttpException(
        error.message || "Error al obtener la orden",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(":id")
  @Permissions("orders_update")
  @ApiOperation({ summary: "Actualizar una orden" })
  @ApiResponse({ status: 200, description: "Orden actualizada exitosamente" })
  async update(
    @Param("id") id: string,
    @Body() updateOrderDto: UpdateOrderDto,
    @Request() req,
  ) {
    try {
      const order = await this.ordersService.update(
        id,
        updateOrderDto,
        req.user,
      );
      return {
        success: true,
        message: "Orden actualizada exitosamente",
        data: order,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al actualizar la orden",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(":id/payments")
  @Permissions("orders_update")
  @ApiOperation({ summary: "Registrar uno o más pagos para una orden" })
  @ApiResponse({ status: 200, description: "Pagos registrados exitosamente" })
  async registerPayments(
    @Param("id") id: string,
    @Body() bulkRegisterPaymentsDto: BulkRegisterPaymentsDto,
    @Request() req,
  ) {
    try {
      const order = await this.ordersService.registerPayments(
        id,
        bulkRegisterPaymentsDto,
        req.user,
      );
      return {
        success: true,
        message: "Pagos registrados exitosamente",
        data: order,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al registrar los pagos",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post("fix-historic-payments")
  @Permissions("orders_update")
  @ApiOperation({ summary: "Generar documentos de pago para órdenes históricas confirmadas" })
  async fixHistoricPayments(@Request() req) {
    try {
      const result = await this.ordersService.fixHistoricPayments(req.user);
      return {
        success: true,
        message: "Migración de pagos históricos completada",
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error en migración",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(":id/confirm-payment")
  @Permissions("orders_update")
  @ApiOperation({ summary: "Confirmar un pago y asignar cuenta bancaria" })
  @ApiResponse({ status: 200, description: "Pago confirmado exitosamente" })
  async confirmPayment(
    @Param("id") id: string,
    @Body()
    confirmPaymentDto: {
      paymentIndex: number;
      bankAccountId: string;
      confirmedMethod: string;
    },
    @Request() req,
  ) {
    try {
      const order = await this.ordersService.confirmPayment(
        id,
        confirmPaymentDto.paymentIndex,
        confirmPaymentDto.bankAccountId,
        confirmPaymentDto.confirmedMethod,
        req.user,
      );
      return {
        success: true,
        message: "Pago confirmado exitosamente",
        data: order,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al confirmar el pago",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post("__reconcile-movements")
  @Permissions("orders_update")
  @ApiOperation({
    summary: "Reconciliar movimientos OUT faltantes para órdenes enviadas/entregadas",
  })
  @ApiResponse({ status: 200, description: "Reconciliación ejecutada" })
  async reconcileMovements(
    @Body()
    body: {
      statuses?: string[];
      limit?: number;
    },
    @Request() req,
  ) {
    try {
      const result = await this.ordersService.reconcileMissingOutMovements(
        req.user,
        { statuses: body?.statuses, limit: body?.limit },
      );
      return {
        success: true,
        message: "Reconciliación completada",
        data: result,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al reconciliar movimientos",
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(":id/complete")
  @Permissions("orders_update")
  @ApiOperation({ summary: "Completar orden y finalizar proceso (actualizar inventario si es necesario)" })
  @ApiResponse({ status: 200, description: "Orden completada exitosamente" })
  async completeOrder(@Param("id") id: string, @Request() req) {
    try {
      const order = await this.ordersService.completeOrder(id, req.user);
      return {
        success: true,
        message: "Orden completada exitosamente",
        data: order,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al completar la orden",
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Patch(":id/cancel")
  @Permissions("orders_update")
  @ApiOperation({ summary: "Cancelar una orden y revertir inventario" })
  async cancel(@Param("id") id: string, @Request() req) {
    try {
      const order = await this.ordersService.cancelOrder(id, req.user);
      return {
        success: true,
        message: "Orden cancelada y stock revertido",
        data: order,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al cancelar la orden",
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }


  @Patch(":id/fulfillment")
  @Permissions("orders_update")
  @ApiOperation({ summary: "Actualizar estado de entrega (fulfillment)" })
  async updateFulfillment(
    @Param("id") id: string,
    @Body() body: UpdateFulfillmentDto,
    @Request() req,
  ) {
    try {
      const order = await this.ordersService.updateFulfillmentStatus(
        id,
        body.status,
        req.user,
        body.deliveryNotes,
        body.trackingNumber,
      );
      return {
        success: true,
        message: "Estado de entrega actualizado",
        data: order,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error al actualizar estado de entrega",
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get("analytics/by-source")
  @Permissions("orders_read")
  @ApiOperation({
    summary: "Get sales analytics by source (POS, Storefront, WhatsApp)",
    description: "Returns sales metrics grouped by order source for the specified date range"
  })
  @ApiResponse({
    status: 200,
    description: "Analytics retrieved successfully",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        data: {
          type: "object",
          properties: {
            bySource: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  source: { type: "string", example: "storefront" },
                  totalOrders: { type: "number", example: 42 },
                  totalRevenue: { type: "number", example: 1250.50 },
                  averageOrderValue: { type: "number", example: 29.77 }
                }
              }
            },
            summary: {
              type: "object",
              properties: {
                totalOrders: { type: "number" },
                totalRevenue: { type: "number" },
                averageOrderValue: { type: "number" }
              }
            }
          }
        }
      }
    }
  })
  async getAnalyticsBySource(
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Request() req?,
  ) {
    try {
      const analytics = await this.ordersService.getAnalyticsBySource(
        req.user.tenantId,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined,
      );
      return {
        success: true,
        data: analytics,
      };
    } catch (error) {
      throw new HttpException(
        error.message || "Error retrieving analytics",
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
