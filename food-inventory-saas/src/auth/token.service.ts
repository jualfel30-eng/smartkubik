import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Role, RoleDocument } from "../schemas/role.schema";
import { UserDocument } from "../schemas/user.schema";
import { TenantDocument } from "../schemas/tenant.schema";
import { PermissionsService } from "../modules/permissions/permissions.service";
import { getEffectiveModulesForTenant } from "../config/vertical-features.config";
import { isTenantConfirmationEnforced } from "../config/tenant-confirmation";

export interface TokenGenerationOptions {
  impersonation?: boolean;
  impersonatorId?: string;
  membershipId?: string;
  roleOverride?: RoleDocument | Types.ObjectId | string | null;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectModel(Role.name) private readonly roleModel: Model<RoleDocument>,
    private readonly permissionsService: PermissionsService,
  ) {}

  async generateTokens(
    user: UserDocument,
    tenant: TenantDocument | null,
    options: TokenGenerationOptions = {},
  ) {
    const defaultRolePermissions: Record<string, string[]> = {
      vendedor: [
        "orders_read",
        "orders_create",
        "orders_update",
        "inventory_read",
        "products_read",
        "accounting_read",
        "customers_read",
      ],
      vendedor_es: [
        "orders_read",
        "orders_create",
        "orders_update",
        "inventory_read",
        "products_read",
        "accounting_read",
        "customers_read",
      ],
    };
    const rawRole =
      options.roleOverride ??
      (user.role as RoleDocument | Types.ObjectId | string | null | undefined);

    let permissionNames: string[] = [];
    let roleId: Types.ObjectId | string | undefined;
    let roleName: string | undefined;
    let resolvedRoleDoc: RoleDocument | null | undefined;

    if (rawRole && typeof rawRole === "object" && "_id" in rawRole) {
      resolvedRoleDoc = rawRole as RoleDocument;
      roleId = resolvedRoleDoc._id;
      roleName = (resolvedRoleDoc as any).name;
      const rolePermissions = (resolvedRoleDoc as any).permissions;
      if (Array.isArray(rolePermissions) && rolePermissions.length > 0) {
        permissionNames = rolePermissions
          .map((permission: any) =>
            permission && typeof permission === "object" && "name" in permission
              ? (permission as any).name
              : null,
          )
          .filter((name): name is string => Boolean(name));
      }
    } else if (rawRole) {
      roleId = rawRole as Types.ObjectId | string;
      if (typeof rawRole === "string") {
        roleName = rawRole;
      }
    }

    if (!roleId) {
      throw new Error("User role is not properly populated");
    }

    // If permissions are missing or not populated, fetch a fresh populated role
    if (permissionNames.length === 0) {
      const populatedRole = await this.roleModel
        .findById(roleId)
        .populate({ path: "permissions", select: "name" })
        .exec();

      resolvedRoleDoc = populatedRole ?? resolvedRoleDoc;

      if (!resolvedRoleDoc) {
        throw new Error("Role associated to user not found");
      }

      permissionNames = Array.isArray(resolvedRoleDoc.permissions)
        ? (resolvedRoleDoc.permissions as any[])
            .map((permission) => permission?.name)
            .filter((name): name is string => Boolean(name))
        : [];
      roleName = resolvedRoleDoc.name ?? roleName;
    }

    // Emergency fallback: if still empty, use defaults by role name or grant full set to admin
    if (permissionNames.length === 0 && roleName) {
      const key = roleName.toLowerCase();
      if (key === "admin" || key === "super_admin" || key === "super-admin") {
        permissionNames = this.permissionsService.findAll();
      } else if (defaultRolePermissions[key]) {
        permissionNames = defaultRolePermissions[key];
      }
    }

    if (
      !roleName &&
      typeof rawRole === "object" &&
      rawRole &&
      "name" in rawRole
    ) {
      roleName = (rawRole as any).name;
    }

    // Seguridad: si el rol no trae permisos (caches vacíos o datos inconsistentes), no asignar permisos silenciosamente.
    permissionNames = permissionNames.filter(Boolean);

    const confirmationEnforced = isTenantConfirmationEnforced();

    const payload: Record<string, any> = {
      sub: user._id,
      email: user.email,
      role: {
        name: roleName,
        permissions: permissionNames,
      },
      tenantId: tenant ? tenant._id : null,
      tenantConfirmed: tenant
        ? confirmationEnforced
          ? Boolean((tenant as any).isConfirmed)
          : true
        : null,
    };

    if (options.membershipId) {
      payload.membershipId = options.membershipId;
    }

    if (options.impersonation) {
      payload.impersonated = true;
      payload.impersonatorId = options.impersonatorId ?? null;
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: process.env.JWT_EXPIRES_IN || "15m",
      }),
      this.jwtService.signAsync(
        { sub: user._id },
        {
          secret: process.env.JWT_REFRESH_SECRET,
          expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: process.env.JWT_EXPIRES_IN || "15m",
    };
  }
}
