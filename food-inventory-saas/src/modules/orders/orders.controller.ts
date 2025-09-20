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
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";

@ApiTags("orders")
@Controller("orders")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiBearerAuth()
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);

  constructor(private readonly ordersService: OrdersService) {}

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

  @Get('__lookup/payment-methods')
  @ApiOperation({ summary: 'Obtener lista de métodos de pago' })
  async getPaymentMethods(@Request() req) {
    try {
      const methods = await this.ordersService.getPaymentMethods(req.user);
      return {
        success: true,
        message: 'Métodos de pago obtenidos exitosamente',
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

  @Post(':id/payments')
  @Permissions("orders_update")
  @ApiOperation({ summary: 'Registrar uno o más pagos para una orden' })
  @ApiResponse({ status: 200, description: 'Pagos registrados exitosamente' })
  async registerPayments(
    @Param('id') id: string,
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
        message: 'Pagos registrados exitosamente',
        data: order,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Error al registrar los pagos',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}