import {
  Controller,
  Post,
  Body,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { OrdersService } from "./orders.service";
import { Public } from "../../decorators/public.decorator";
import { CreatePublicOrderDto } from "../../dto/order-public.dto";

@ApiTags("Orders Public")
@Controller("api/v1/public/orders")
export class OrdersPublicController {
  private readonly logger = new Logger(OrdersPublicController.name);

  constructor(private readonly ordersService: OrdersService) {}

  @Public()
  @Post()
  @Throttle({
    short: { limit: 3, ttl: 60_000 },
    medium: { limit: 10, ttl: 3_600_000 },
  })
  @ApiOperation({
    summary: "Crear orden desde el storefront (público)",
    description:
      "Endpoint público para crear órdenes desde el storefront sin autenticación",
  })
  @ApiResponse({
    status: 201,
    description: "Orden creada exitosamente",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean", example: true },
        data: {
          type: "object",
          properties: {
            _id: { type: "string" },
            orderNumber: { type: "string", example: "ORD-20251005-0001" },
            customerName: { type: "string" },
            customerEmail: { type: "string" },
            customerPhone: { type: "string" },
            items: { type: "array" },
            totalAmount: { type: "number" },
            status: { type: "string", example: "pending" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: "Datos inválidos",
  })
  async createPublicOrder(@Body() createDto: CreatePublicOrderDto) {
    // Validaciones básicas
    if (!createDto.tenantId) {
      throw new BadRequestException("El tenantId es requerido");
    }

    if (!createDto.customerName || !createDto.customerEmail) {
      throw new BadRequestException(
        "El nombre y email del cliente son requeridos",
      );
    }

    if (!createDto.items || createDto.items.length === 0) {
      throw new BadRequestException("La orden debe tener al menos un producto");
    }

    if (createDto.honeypot && createDto.honeypot.trim().length > 0) {
      this.logger.warn(
        `Intento de orden pública rechazado por honeypot para el tenant ${createDto.tenantId}`,
      );
      throw new BadRequestException(
        "No se pudo procesar la orden. Por favor intenta nuevamente.",
      );
    }

    if (createDto.items.length > 50) {
      throw new BadRequestException(
        "Se excedió el número máximo de productos por orden",
      );
    }

    const order = await this.ordersService.createPublicOrder(createDto);

    return {
      success: true,
      data: {
        _id: order._id.toString(),
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: order.totalAmount,
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        customerPhone: order.customerPhone,
        notes: order.notes,
        createdAt:
          order.createdAt instanceof Date
            ? order.createdAt.toISOString()
            : order.createdAt,
      },
      message:
        "Orden recibida exitosamente. Nos pondremos en contacto contigo pronto.",
    };
  }
}
