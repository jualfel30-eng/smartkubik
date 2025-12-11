import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";
import { InventoryAlertsService } from "./inventory-alerts.service";
import {
  CreateInventoryAlertRuleDto,
  UpdateInventoryAlertRuleDto,
} from "./dto/inventory-alert-rule.dto";

@Controller("inventory-alerts")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class InventoryAlertsController {
  constructor(private readonly alertsService: InventoryAlertsService) {}

  @Get()
  @Permissions("inventory_read")
  async list(
    @Query("productId") productId: string,
    @Query("warehouseId") warehouseId: string,
    @Query("isActive") isActive: string,
    @Query("page") page: string,
    @Query("limit") limit: string,
    @Request() req,
  ) {
    return this.alertsService.listRules(
      {
        productId,
        warehouseId,
        isActive: isActive === undefined ? undefined : isActive === "true",
        page: page ? parseInt(page, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
      },
      req.user,
    );
  }

  @Post()
  @Permissions("inventory_write")
  async create(@Body() dto: CreateInventoryAlertRuleDto, @Request() req) {
    return this.alertsService.createRule(dto, req.user);
  }

  @Patch(":id")
  @Permissions("inventory_write")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateInventoryAlertRuleDto,
    @Request() req,
  ) {
    return this.alertsService.updateRule(id, dto, req.user);
  }

  @Delete(":id")
  @Permissions("inventory_write")
  async remove(@Param("id") id: string, @Request() req) {
    return this.alertsService.deleteRule(id, req.user);
  }
}
