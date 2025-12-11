import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";
import { InventoryMovementsService } from "./inventory-movements.service";
import {
  CreateInventoryMovementDto,
  InventoryMovementFilterDto,
} from "../../dto/inventory-movement.dto";

@Controller("inventory-movements")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class InventoryMovementsController {
  constructor(
    private readonly inventoryMovementsService: InventoryMovementsService,
  ) {}

  @Post()
  @Permissions("inventory_write")
  async create(@Body() dto: CreateInventoryMovementDto, @Request() req) {
    return this.inventoryMovementsService.create(
      dto,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Get()
  @Permissions("inventory_read")
  async findAll(@Query() filters: InventoryMovementFilterDto, @Request() req) {
    return this.inventoryMovementsService.findAll(req.user.tenantId, filters);
  }
}
