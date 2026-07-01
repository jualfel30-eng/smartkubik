import { Controller, Get, Param, Request, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";
import { StoreCreditService } from "./store-credit.service";

@ApiTags("store-credit")
@Controller("store-credit")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@ApiBearerAuth()
export class StoreCreditController {
  constructor(private readonly storeCreditService: StoreCreditService) {}

  @Get(":customerId")
  @Permissions("customers_read")
  @ApiOperation({ summary: "Saldo a favor de un cliente" })
  async getBalance(
    @Param("customerId") customerId: string,
    @Request() req: any,
  ) {
    const balance = await this.storeCreditService.getBalance(
      req.user.tenantId.toString(),
      customerId,
    );
    return { success: true, data: { customerId, balance, currency: "USD" } };
  }

  @Get(":customerId/movements")
  @Permissions("customers_read")
  @ApiOperation({ summary: "Movimientos de saldo a favor de un cliente" })
  async getMovements(
    @Param("customerId") customerId: string,
    @Request() req: any,
  ) {
    const data = await this.storeCreditService.getMovements(
      req.user.tenantId.toString(),
      customerId,
    );
    return { success: true, data };
  }
}
