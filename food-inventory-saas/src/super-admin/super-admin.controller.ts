import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Post,
  Req,
} from "@nestjs/common";
import { SuperAdminService } from "./super-admin.service";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { SuperAdminGuard } from "../guards/super-admin.guard";
import { UpdateTenantDto } from "../dto/update-tenant.dto";
import { UpdateTenantModulesDto } from "../dto/update-tenant-modules.dto";
import { UpdateRolePermissionsDto } from "../dto/update-role-permissions.dto";

@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller("super-admin")
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Get("tenants")
  findAll() {
    return this.superAdminService.findAll();
  }

  @Get("tenants/:id")
  findOne(@Param("id") id: string) {
    return this.superAdminService.findOne(id);
  }

  @Patch("tenants/:id")
  update(
    @Param("id") id: string,
    @Body() updateTenantDto: UpdateTenantDto,
    @Req() req,
  ) {
    return this.superAdminService.update(
      id,
      updateTenantDto,
      req.user.id,
      req.ip,
    );
  }

  @Patch("tenants/:id/status")
  updateStatus(
    @Param("id") id: string,
    @Body("status") status: string,
    @Req() req,
  ) {
    return this.superAdminService.updateStatus(id, status, req.user.id, req.ip);
  }

  @Get("tenants/:tenantId/users")
  findUsersByTenant(@Param("tenantId") tenantId: string) {
    return this.superAdminService.findUsersByTenant(tenantId);
  }

  @Post("tenants/:tenantId/users/:userId/impersonate")
  impersonateUser(@Param("userId") userId: string, @Req() req) {
    return this.superAdminService.impersonateUser(userId, req.user, req.ip);
  }

  @Get("audit-logs")
  findAuditLogs() {
    return this.superAdminService.findAuditLogs();
  }

  @Get("metrics")
  getGlobalMetrics() {
    return this.superAdminService.getGlobalMetrics();
  }

  @Get("events")
  findAllEvents() {
    return this.superAdminService.findAllEvents();
  }

  @Get("tenants/:id/configuration")
  getTenantConfiguration(@Param("id") id: string) {
    return this.superAdminService.getTenantConfiguration(id);
  }

  @Patch("tenants/:id/modules")
  updateTenantModules(
    @Param("id") id: string,
    @Body() updateDto: UpdateTenantModulesDto,
    @Req() req,
  ) {
    return this.superAdminService.updateTenantModules(
      id,
      updateDto,
      req.user.id,
      req.ip,
    );
  }

  @Patch("roles/:roleId/permissions")
  updateRolePermissions(
    @Param("roleId") roleId: string,
    @Body() updateDto: UpdateRolePermissionsDto,
    @Req() req,
  ) {
    return this.superAdminService.updateRolePermissions(
      roleId,
      updateDto,
      req.user.id,
      req.ip,
    );
  }

  @Post("tenants/:tenantId/sync-memberships")
  syncTenantMemberships(@Param("tenantId") tenantId: string, @Req() req) {
    return this.superAdminService.syncTenantMemberships(
      tenantId,
      req.user.id,
      req.ip,
    );
  }
}
