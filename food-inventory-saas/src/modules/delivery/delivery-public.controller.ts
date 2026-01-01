import { Controller, Post, Body } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { DeliveryService } from "./delivery.service";
import { Public } from "../../decorators/public.decorator";
import { IsString, IsNumber, IsOptional, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class CalculateDeliveryPublicDto {
  @IsString()
  tenantId: string;

  @ValidateNested()
  @Type(() => Object)
  customerLocation: {
    lat: number;
    lng: number;
  };

  @IsOptional()
  @IsNumber()
  orderAmount?: number;
}

@ApiTags("Delivery Public")
@Controller("public/delivery")
export class DeliveryPublicController {
  constructor(private readonly deliveryService: DeliveryService) {}

  @Public()
  @Post("calculate")
  @ApiOperation({
    summary: "Calculate delivery cost for storefront (public)",
    description:
      "Returns delivery cost based on customer location and order amount",
  })
  @ApiResponse({
    status: 200,
    description: "Delivery cost calculated successfully",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        data: {
          type: "object",
          properties: {
            cost: { type: "number", example: 5.5 },
            distance: { type: "number", example: 3.2 },
            zone: { type: "string", example: "Zona Centro" },
            freeDelivery: { type: "boolean", example: false },
          },
        },
      },
    },
  })
  async calculateDeliveryCost(@Body() dto: CalculateDeliveryPublicDto) {
    const result = await this.deliveryService.calculateDeliveryCost({
      tenantId: dto.tenantId,
      method: "delivery",
      customerLocation: dto.customerLocation,
      orderAmount: dto.orderAmount,
    });

    return {
      success: true,
      data: result,
    };
  }
}
