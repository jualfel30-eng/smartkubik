import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { TenantPaymentConfigService } from "./tenant-payment-config.service";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { PaymentMethodConfig } from "../../schemas/tenant-payment-config.schema";

@ApiTags("Tenant Payment Config")
@Controller("tenant-payment-config")
@UseGuards(JwtAuthGuard)
export class TenantPaymentConfigController {
  constructor(
    private readonly tenantPaymentConfigService: TenantPaymentConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Get tenant payment configuration" })
  @ApiResponse({
    status: 200,
    description: "Payment configuration retrieved successfully",
  })
  async getPaymentConfig(@Request() req: any) {
    return this.tenantPaymentConfigService.getPaymentConfig(req.user.tenantId);
  }

  @Put()
  @ApiOperation({ summary: "Update tenant payment configuration" })
  @ApiResponse({
    status: 200,
    description: "Payment configuration updated successfully",
  })
  async updatePaymentConfig(
    @Request() req: any,
    @Body() data: Partial<any>,
  ) {
    return this.tenantPaymentConfigService.upsertPaymentConfig(
      req.user.tenantId,
      data,
      req.user.userId,
    );
  }

  @Post("payment-methods")
  @ApiOperation({ summary: "Add or update a payment method" })
  @ApiResponse({
    status: 200,
    description: "Payment method added/updated successfully",
  })
  async upsertPaymentMethod(
    @Request() req: any,
    @Body() methodData: PaymentMethodConfig,
  ) {
    return this.tenantPaymentConfigService.upsertPaymentMethod(
      req.user.tenantId,
      methodData,
      req.user.userId,
    );
  }

  @Delete("payment-methods/:methodId")
  @ApiOperation({ summary: "Remove a payment method" })
  @ApiResponse({ status: 200, description: "Payment method removed successfully" })
  async removePaymentMethod(
    @Request() req: any,
    @Param("methodId") methodId: string,
  ) {
    return this.tenantPaymentConfigService.removePaymentMethod(
      req.user.tenantId,
      methodId,
      req.user.userId,
    );
  }
}
