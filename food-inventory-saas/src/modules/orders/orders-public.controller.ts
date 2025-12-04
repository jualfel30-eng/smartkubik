import { Controller, Post, Body, BadRequestException } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { OrdersService } from "./orders.service";
import { Public } from "../../decorators/public.decorator";
import {
  IsString,
  IsEmail,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  IsEnum,
} from "class-validator";
import { Type } from "class-transformer";

// DTO simplificado para órdenes públicas del storefront
export class CreatePublicOrderItemDto {
  @IsString()
  productId: string;

  @IsOptional()
  @IsString()
  variantId?: string;

  @IsOptional()
  @IsString()
  variantSku?: string;

  @IsNumber()
  @Min(0.01) // Permitir decimales para productos por peso
  quantity: number;

  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsOptional()
  @IsString()
  selectedUnit?: string; // "kg", "g", "lb" - Unidad seleccionada

  @IsOptional()
  @IsNumber()
  conversionFactor?: number; // Factor de conversión usado

  @IsOptional()
  attributes?: Record<string, any>;
}

export class CreatePublicOrderDto {
  @IsString()
  tenantId: string;

  @IsString()
  customerName: string;

  @IsEmail()
  customerEmail: string;

  @IsString()
  customerPhone: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePublicOrderItemDto)
  items: CreatePublicOrderItemDto[];

  @IsOptional()
  @IsEnum(["pickup", "delivery"])
  shippingMethod?: "pickup" | "delivery";

  @IsOptional()
  @Type(() => Object)
  shippingAddress?: {
    street: string;
    city: string;
    state: string;
    zipCode?: string;
    country: string;
  };

  @IsOptional()
  @IsString()
  notes?: string;
}

@ApiTags("Orders Public")
// Prefix global "api/v1" ya se aplica a toda la app en main.ts
@Controller("public/orders")
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

    const order = await this.ordersService.createPublicOrder(createDto);

    return {
      success: true,
      data: order,
      message: "Orden creada exitosamente",
    };
  }
}
