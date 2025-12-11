import {
  Injectable,
  NotFoundException,
  Inject,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Tenant, TenantDocument } from "../schemas/tenant.schema";
import { User, UserDocument } from "../schemas/user.schema";
import { Event, EventDocument } from "../schemas/event.schema";
import { Role, RoleDocument } from "../schemas/role.schema";
import { Permission, PermissionDocument } from "../schemas/permission.schema";
import { UpdateTenantDto } from "../dto/update-tenant.dto";
import { UpdateTenantModulesDto } from "../dto/update-tenant-modules.dto";
import { UpdateRolePermissionsDto } from "../dto/update-role-permissions.dto";
import { AuthService } from "../auth/auth.service";
import { AuditLogService } from "../modules/audit-log/audit-log.service";
import { getPlanLimits } from "../config/subscriptions.config";
import {
  UserTenantMembership,
  UserTenantMembershipDocument,
  MembershipStatus,
} from "../schemas/user-tenant-membership.schema";

const BASELINE_PERMISSIONS = [
  {
    name: "restaurant_read",
    description: "Acceso de lectura a módulos de restaurante",
    module: "restaurant",
    action: "read",
  },
  {
    name: "restaurant_write",
    description: "Acceso de escritura a módulos de restaurante",
    module: "restaurant",
    action: "write",
  },
  {
    name: "orders_write",
    description: "Permite crear y enviar órdenes a cocina",
    module: "orders",
    action: "write",
  },
];

@Injectable()
export class SuperAdminService {
  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(Role.name) private roleModel: Model<RoleDocument>,
    @InjectModel(Permission.name)
    private permissionModel: Model<PermissionDocument>,
    @InjectModel(UserTenantMembership.name)
    private membershipModel: Model<UserTenantMembershipDocument>,
    @Inject(AuthService) private authService: AuthService,
    private auditLogService: AuditLogService,
  ) {}

  async findAll(): Promise<Tenant[]> {
    return this.tenantModel.find().exec();
  }

  async findAllEvents(): Promise<Event[]> {
    return this.eventModel.find().populate("tenantId", "name").exec();
  }

  async findOne(id: string): Promise<Tenant> {
    const tenant = await this.tenantModel.findById(id).exec();
    if (!tenant) {
      throw new NotFoundException(`Tenant con ID "${id}" no encontrado`);
    }
    return tenant;
  }

  async update(
    id: string,
    updateTenantDto: UpdateTenantDto,
    performedBy: string,
    ipAddress: string,
  ): Promise<Tenant> {
    const oldTenant = await this.tenantModel.findById(id).lean().exec();
    if (!oldTenant) {
      throw new NotFoundException(`Tenant con ID "${id}" no encontrado`);
    }

    const updatePayload: any = { ...updateTenantDto };

    if (updateTenantDto.subscriptionPlan) {
      const newLimits = getPlanLimits(updateTenantDto.subscriptionPlan);
      updatePayload.limits = newLimits;
    }

    if (updateTenantDto.featureFlags) {
      updatePayload.featureFlags = {
        ...(oldTenant.featureFlags || {}),
        ...updateTenantDto.featureFlags,
      };
    }

    const updatedTenant = await this.tenantModel
      .findByIdAndUpdate(id, updatePayload, { new: true })
      .exec();
    if (!updatedTenant) {
      throw new NotFoundException(`Tenant con ID "${id}" no encontrado`);
    }

    await this.auditLogService.createLog(
      "update_tenant",
      performedBy,
      { oldData: oldTenant, newData: updatedTenant.toObject() },
      ipAddress,
      updatedTenant._id.toString(),
    );

    return updatedTenant;
  }

  async updateStatus(
    id: string,
    status: string,
    performedBy: string,
    ipAddress: string,
  ): Promise<Tenant> {
    const oldTenant = await this.tenantModel.findById(id).exec();
    if (!oldTenant) {
      throw new NotFoundException(`Tenant con ID "${id}" no encontrado`);
    }

    const updatedTenant = await this.tenantModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .exec();

    if (!updatedTenant) {
      throw new NotFoundException(`Tenant con ID "${id}" no encontrado`);
    }

    await this.auditLogService.createLog(
      "update_tenant_status",
      performedBy,
      { oldStatus: oldTenant.status, newStatus: updatedTenant.status },
      ipAddress,
      updatedTenant._id.toString(),
    );

    return updatedTenant;
  }

  async findUsersByTenant(tenantId: string): Promise<User[]> {
    console.log(
      "---!!! [DEBUG] Forzando búsqueda para ObjectId:",
      tenantId,
      "!!!---",
    );
    const users = await this.userModel
      .find({ tenantId: new Types.ObjectId(tenantId) })
      .exec();
    console.log(
      "---!!! [DEBUG] Usuarios encontrados con ObjectId forzado:",
      users,
      "!!!---",
    );
    return users;
  }

  async impersonateUser(
    userId: string,
    currentUser: any,
    ipAddress: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Pass userId string directly to login method (it will fetch and populate the user)
    const { accessToken, refreshToken, user } = await this.authService.login(
      userId,
      true,
      currentUser.id,
    );

    console.log("---!!! [DEBUG] userToImpersonate object:", user, "!!! ---");

    const userIdStr = (user as any)._id
      ? (user as any)._id.toString()
      : (user as any).id.toString();
    const tenantIdStr = (user as any).tenantId
      ? (user as any).tenantId.toString()
      : null;

    await this.auditLogService.createLog(
      "impersonate_user",
      currentUser.id.toString(),
      { impersonatedUserEmail: user.email },
      ipAddress,
      tenantIdStr,
      userIdStr,
    );

    return { accessToken, refreshToken };
  }

  async findAuditLogs() {
    return this.auditLogService.findLogs({});
  }

  async getGlobalMetrics() {
    const totalTenants = await this.tenantModel.countDocuments().exec();
    const activeTenants = await this.tenantModel
      .countDocuments({ status: "active" })
      .exec();
    const suspendedTenants = await this.tenantModel
      .countDocuments({ status: "suspended" })
      .exec();
    const totalUsers = await this.userModel.countDocuments().exec();

    // Example: New tenants in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newTenantsLast30Days = await this.tenantModel
      .countDocuments({ createdAt: { $gte: thirtyDaysAgo } })
      .exec();

    // Example: New users in the last 30 days
    const newUsersLast30Days = await this.userModel
      .countDocuments({ createdAt: { $gte: thirtyDaysAgo } })
      .exec();

    // Example: Active users (logged in within last 24 hours)
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    const activeUsersLast24Hours = await this.userModel
      .countDocuments({ lastLoginAt: { $gte: twentyFourHoursAgo } })
      .exec();

    return {
      totalTenants,
      activeTenants,
      suspendedTenants,
      totalUsers,
      newTenantsLast30Days,
      newUsersLast30Days,
      activeUsersLast24Hours,
    };
  }

  /**
   * Get tenant configuration including modules and roles with permissions
   */
  async getTenantConfiguration(tenantId: string) {
    await this.ensureBaselinePermissions();

    const tenant = await this.tenantModel.findById(tenantId).exec();
    if (!tenant) {
      throw new NotFoundException(`Tenant con ID "${tenantId}" no encontrado`);
    }

    // Get all roles for this tenant
    const roles = await this.roleModel
      .find({ tenantId: new Types.ObjectId(tenantId) })
      .populate("permissions")
      .exec();

    // Get all available permissions
    const allPermissions = await this.permissionModel.find().exec();

    return {
      tenant,
      roles,
      allPermissions,
    };
  }

  /**
   * Update tenant enabled modules
   */
  async updateTenantModules(
    tenantId: string,
    updateDto: UpdateTenantModulesDto,
    performedBy: string,
    ipAddress: string,
  ) {
    const tenant = await this.tenantModel.findById(tenantId).exec();
    if (!tenant) {
      throw new NotFoundException(`Tenant con ID "${tenantId}" no encontrado`);
    }

    const oldModules = { ...tenant.enabledModules };

    const updatedTenant = await this.tenantModel
      .findByIdAndUpdate(
        tenantId,
        { $set: { enabledModules: updateDto.enabledModules } },
        { new: true },
      )
      .exec();

    if (!updatedTenant) {
      throw new NotFoundException(`Tenant con ID "${tenantId}" no encontrado`);
    }

    await this.auditLogService.createLog(
      "update_tenant_modules",
      performedBy,
      { oldModules, newModules: updatedTenant.enabledModules },
      ipAddress,
      tenantId,
    );

    return updatedTenant;
  }

  private async ensureBaselinePermissions() {
    for (const permission of BASELINE_PERMISSIONS) {
      await this.permissionModel.updateOne(
        { name: permission.name },
        {
          $setOnInsert: {
            description: permission.description,
            module: permission.module,
            action: permission.action,
          },
        },
        { upsert: true },
      );
    }
  }

  async syncTenantMemberships(
    tenantId: string,
    performedBy: string,
    ipAddress: string,
  ) {
    if (!Types.ObjectId.isValid(tenantId)) {
      throw new BadRequestException("Tenant ID inválido");
    }

    const tenant = await this.tenantModel.findById(tenantId).exec();
    if (!tenant) {
      throw new NotFoundException(`Tenant con ID "${tenantId}" no encontrado`);
    }

    const users = await this.userModel
      .find({ tenantId: tenant._id })
      .populate("role")
      .exec();

    const memberships = await this.membershipModel
      .find({ tenantId: tenant._id })
      .exec();

    const membershipMap = new Map<string, UserTenantMembershipDocument>();
    memberships.forEach((membership) => {
      membershipMap.set(membership.userId.toString(), membership);
    });

    let created = 0;
    let updated = 0;
    let defaultAssigned = memberships.some(
      (membership) => membership.isDefault,
    );
    const skipped: string[] = [];

    for (const user of users) {
      const role = user.role as
        | RoleDocument
        | Types.ObjectId
        | string
        | undefined;
      const roleId =
        role && typeof role === "object" && "_id" in role
          ? (role as RoleDocument)._id
          : role;

      if (!roleId) {
        skipped.push(user.email);
        continue;
      }

      const status: MembershipStatus = user.isActive ? "active" : "inactive";
      const userIdStr = user._id.toString();
      const existingMembership = membershipMap.get(userIdStr);

      if (existingMembership) {
        const updates: Partial<UserTenantMembership> = {};
        if (!existingMembership.roleId.equals(roleId)) {
          updates.roleId = roleId as Types.ObjectId;
        }
        if (existingMembership.status !== status) {
          updates.status = status;
        }
        if (Object.keys(updates).length > 0) {
          await this.membershipModel.updateOne(
            { _id: existingMembership._id },
            { $set: updates },
          );
          updated += 1;
        }
        continue;
      }

      const newMembership = await this.membershipModel.create({
        userId: user._id,
        tenantId: tenant._id,
        roleId,
        status,
        isDefault: !defaultAssigned,
      });

      membershipMap.set(userIdStr, newMembership);
      created += 1;
      if (!defaultAssigned) {
        defaultAssigned = true;
      }
    }

    if (membershipMap.size > 0 && !defaultAssigned) {
      const firstMembership = membershipMap.values().next().value as
        | UserTenantMembershipDocument
        | undefined;
      if (firstMembership) {
        await this.membershipModel.updateOne(
          { _id: firstMembership._id },
          { $set: { isDefault: true } },
        );
        updated += 1;
        defaultAssigned = true;
      }
    }

    const summaryMemberships = await this.membershipModel
      .find({ tenantId: tenant._id })
      .populate("userId", "email firstName lastName isActive")
      .populate("roleId", "name")
      .exec();

    const hasActiveMemberships = summaryMemberships.some(
      (membership) => membership.status === "active",
    );

    let confirmationFixed = false;
    if (!tenant.isConfirmed && hasActiveMemberships) {
      await this.tenantModel.updateOne(
        { _id: tenant._id },
        {
          $set: { isConfirmed: true },
          $unset: { confirmationCode: "", confirmationCodeExpiresAt: "" },
        },
      );
      confirmationFixed = true;
    }

    await this.auditLogService.createLog(
      "sync_tenant_memberships",
      performedBy,
      {
        tenantId,
        stats: {
          usersProcessed: users.length,
          memberships: summaryMemberships.length,
          created,
          updated,
          skipped,
          confirmationFixed,
        },
      },
      ipAddress,
      tenantId,
    );

    return {
      tenantId,
      stats: {
        usersProcessed: users.length,
        memberships: summaryMemberships.length,
        created,
        updated,
        skipped,
        defaultAssigned,
        confirmationFixed,
      },
      memberships: summaryMemberships.map((membership) => ({
        id: membership._id.toString(),
        user: membership.userId
          ? {
              id: (membership.userId as any)._id?.toString?.() ?? "",
              email: (membership.userId as any).email,
              firstName: (membership.userId as any).firstName,
              lastName: (membership.userId as any).lastName,
              isActive: (membership.userId as any).isActive,
            }
          : null,
        role: membership.roleId
          ? {
              id: (membership.roleId as any)._id?.toString?.() ?? "",
              name: (membership.roleId as any).name,
            }
          : null,
        status: membership.status,
        isDefault: membership.isDefault,
      })),
    };
  }

  /**
   * Update permissions for a specific role
   */
  async updateRolePermissions(
    roleId: string,
    updateDto: UpdateRolePermissionsDto,
    performedBy: string,
    ipAddress: string,
  ) {
    const role = await this.roleModel.findById(roleId).exec();
    if (!role) {
      throw new NotFoundException(`Rol con ID "${roleId}" no encontrado`);
    }

    const oldPermissions = role.permissions.map((p) => p.toString());

    const updatedRole = await this.roleModel
      .findByIdAndUpdate(
        roleId,
        { $set: { permissions: updateDto.permissionIds } },
        { new: true },
      )
      .populate("permissions")
      .exec();

    await this.auditLogService.createLog(
      "update_role_permissions",
      performedBy,
      {
        roleId,
        roleName: role.name,
        oldPermissions,
        newPermissions: updateDto.permissionIds,
      },
      ipAddress,
      role.tenantId?.toString(),
    );

    return updatedRole;
  }
}
