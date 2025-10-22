import { Controller, Post, Body, BadRequestException } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { OrdersService } from "./orders.service";
import { Public } from "../../decorators/public.decorator";

// DTO simplificado para órdenes públicas del storefront
export class CreatePublicOrderItemDto {
  productId: string;
  variantId?: string;
  variantSku?: string;
  quantity: number;
  unitPrice: number;
  attributes?: Record<string, any>;
}

export class CreatePublicOrderDto {
  tenantId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: CreatePublicOrderItemDto[];
  shippingMethod?: "pickup" | "delivery";
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode?: string;
    country: string;
  };
  notes?: string;
}

@ApiTags("Orders Public")
@Controller("api/v1/public/orders")
export class OrdersPublicController {
  constructor(private readonly ordersService: OrdersService) {}

  @Public()
  @Post()
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

    // Generar número de orden único
    const orderNumber = await this.generateOrderNumber();

    // Calcular totales
    const subtotal = createDto.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0,
    );

    const ivaTotal = subtotal * 0.16; // 16% IVA (ajustar según país)
    const shippingCost = createDto.shippingMethod === "delivery" ? 5.0 : 0; // Costo fijo de ejemplo
    const totalAmount = subtotal + ivaTotal + shippingCost;

    // Crear la orden (simplificada para storefront público)
    const orderData = {
      orderNumber,
      tenantId: createDto.tenantId,
      customerName: createDto.customerName,
      customerEmail: createDto.customerEmail,
      customerPhone: createDto.customerPhone || "",
      items: createDto.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        variantSku: item.variantSku,
        attributes: item.attributes,
        attributeSummary: item.attributes
          ? Object.entries(item.attributes)
              .map(([key, value]) => `${key}: ${value}`)
              .join(" | ")
          : undefined,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice,
        status: "pending",
      })),
      subtotal,
      ivaTotal,
      igtfTotal: 0,
      shippingCost,
      discountAmount: 0,
      totalAmount,
      status: "pending",
      paymentStatus: "pending",
      channel: "storefront",
      type: "retail",
      shipping: createDto.shippingMethod
        ? {
            method: createDto.shippingMethod,
            address: createDto.shippingAddress,
            cost: shippingCost,
          }
        : undefined,
      notes: createDto.notes,
      inventoryReservation: {
        isReserved: false,
      },
      taxInfo: {
        invoiceRequired: false,
      },
      metrics: {
        totalMargin: 0,
        marginPercentage: 0,
      },
    };

    // Nota: En producción, aquí se debería:
    // 1. Validar que los productos existan y tengan stock
    // 2. Crear/buscar el cliente en la base de datos
    // 3. Reservar inventario
    // 4. Enviar notificaciones
    // Por ahora retornamos una respuesta simulada

    return {
      success: true,
      data: {
        ...orderData,
        _id: "temp-order-id",
        createdAt: new Date().toISOString(),
      },
      message:
        "Orden recibida exitosamente. Nos pondremos en contacto contigo pronto.",
    };
  }

  /**
   * Generar número de orden único
   */
  private async generateOrderNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const random = Math.floor(Math.random() * 9999)
      .toString()
      .padStart(4, "0");

    return `ORD-${year}${month}${day}-${random}`;
  }
}
