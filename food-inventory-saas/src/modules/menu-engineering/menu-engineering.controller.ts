import { Controller, Get, Query, UseGuards, Req } from "@nestjs/common";
import { MenuEngineeringService } from "./menu-engineering.service";
import { MenuEngineeringQueryDto } from "../../dto/menu-engineering.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";

@Controller("menu-engineering")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class MenuEngineeringController {
  constructor(
    private readonly menuEngineeringService: MenuEngineeringService,
  ) {}

  @Get()
  @Permissions("restaurant_read", "analytics_read")
  async analyze(@Query() query: MenuEngineeringQueryDto, @Req() req) {
    return this.menuEngineeringService.analyze(query, req.user.tenantId);
  }
}
