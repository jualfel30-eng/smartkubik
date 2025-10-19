import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from "@nestjs/common";
import { RolesService } from "./roles.service";
import { CreateRoleDto, UpdateRoleDto } from "../../dto/role.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";

@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
@Controller("roles")
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @Permissions("roles_create")
  async create(@Body() createRoleDto: CreateRoleDto, @Req() req) {
    const tenantId = req.user.tenantId;
    const role = await this.rolesService.create(createRoleDto, tenantId);
    return { success: true, data: role };
  }

  @Get()
  @Permissions("roles_read")
  async findAll(@Req() req) {
    const tenantId = req.user.tenantId;
    const roles = await this.rolesService.findAll(tenantId);
    return { success: true, data: roles };
  }

  @Get(":id")
  @Permissions("roles_read")
  async findOne(@Param("id") id: string, @Req() req) {
    const tenantId = req.user.tenantId;
    const role = await this.rolesService.findOne(id, tenantId);
    return { success: true, data: role };
  }

  @Patch(":id")
  @Permissions("roles_update")
  async update(
    @Param("id") id: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @Req() req,
  ) {
    const tenantId = req.user.tenantId;
    const role = await this.rolesService.update(id, updateRoleDto, tenantId);
    return { success: true, data: role };
  }

  @Delete(":id")
  @Permissions("roles_delete")
  async remove(@Param("id") id: string, @Req() req) {
    const tenantId = req.user.tenantId;
    await this.rolesService.remove(id, tenantId);
    return { success: true, message: "Rol eliminado correctamente" };
  }
}
