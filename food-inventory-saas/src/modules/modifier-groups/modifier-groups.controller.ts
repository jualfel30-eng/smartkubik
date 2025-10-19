import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  UseGuards,
} from "@nestjs/common";
import { ModifierGroupsService } from "./modifier-groups.service";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";
import {
  CreateModifierGroupDto,
  UpdateModifierGroupDto,
  AssignGroupToProductsDto,
} from "../../dto/modifier-group.dto";
import { CreateModifierDto, UpdateModifierDto } from "../../dto/modifier.dto";

@Controller("modifier-groups")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class ModifierGroupsController {
  constructor(private readonly modifierGroupsService: ModifierGroupsService) {}

  // ========================================
  // MODIFIER GROUPS ENDPOINTS
  // ========================================

  @Post()
  @Permissions("restaurant_write")
  async createGroup(@Body() dto: CreateModifierGroupDto, @Request() req) {
    return this.modifierGroupsService.createGroup(dto, req.user.tenantId);
  }

  @Get()
  @Permissions("restaurant_read")
  async findAllGroups(@Request() req) {
    return this.modifierGroupsService.findAllGroups(req.user.tenantId);
  }

  @Get(":id")
  @Permissions("restaurant_read")
  async findGroupById(@Param("id") id: string, @Request() req) {
    return this.modifierGroupsService.findGroupById(id, req.user.tenantId);
  }

  @Get("product/:productId")
  @Permissions("restaurant_read")
  async findGroupsByProduct(
    @Param("productId") productId: string,
    @Request() req,
  ) {
    return this.modifierGroupsService.findGroupsByProduct(
      productId,
      req.user.tenantId,
    );
  }

  @Patch(":id")
  @Permissions("restaurant_write")
  async updateGroup(
    @Param("id") id: string,
    @Body() dto: UpdateModifierGroupDto,
    @Request() req,
  ) {
    return this.modifierGroupsService.updateGroup(id, dto, req.user.tenantId);
  }

  @Delete(":id")
  @Permissions("restaurant_write")
  async deleteGroup(@Param("id") id: string, @Request() req) {
    await this.modifierGroupsService.deleteGroup(id, req.user.tenantId);
    return { message: "Modifier group deleted successfully" };
  }

  @Post("assign-products")
  @Permissions("restaurant_write")
  async assignGroupToProducts(
    @Body() dto: AssignGroupToProductsDto,
    @Request() req,
  ) {
    return this.modifierGroupsService.assignGroupToProducts(
      dto,
      req.user.tenantId,
    );
  }

  @Post(":groupId/remove-products")
  @Permissions("restaurant_write")
  async removeGroupFromProducts(
    @Param("groupId") groupId: string,
    @Body("productIds") productIds: string[],
    @Request() req,
  ) {
    return this.modifierGroupsService.removeGroupFromProducts(
      groupId,
      productIds,
      req.user.tenantId,
    );
  }

  // ========================================
  // MODIFIERS ENDPOINTS
  // ========================================

  @Post("modifiers")
  @Permissions("restaurant_write")
  async createModifier(@Body() dto: CreateModifierDto, @Request() req) {
    return this.modifierGroupsService.createModifier(dto, req.user.tenantId);
  }

  @Get(":groupId/modifiers")
  @Permissions("restaurant_read")
  async findModifiersByGroup(
    @Param("groupId") groupId: string,
    @Request() req,
  ) {
    return this.modifierGroupsService.findModifiersByGroup(
      groupId,
      req.user.tenantId,
    );
  }

  @Patch("modifiers/:id")
  @Permissions("restaurant_write")
  async updateModifier(
    @Param("id") id: string,
    @Body() dto: UpdateModifierDto,
    @Request() req,
  ) {
    return this.modifierGroupsService.updateModifier(
      id,
      dto,
      req.user.tenantId,
    );
  }

  @Delete("modifiers/:id")
  @Permissions("restaurant_write")
  async deleteModifier(@Param("id") id: string, @Request() req) {
    await this.modifierGroupsService.deleteModifier(id, req.user.tenantId);
    return { message: "Modifier deleted successfully" };
  }
}
