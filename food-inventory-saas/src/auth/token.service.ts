import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Role, RoleDocument } from '../schemas/role.schema';
import { UserDocument } from '../schemas/user.schema';
import { TenantDocument } from '../schemas/tenant.schema';
import { PermissionsService } from '../modules/permissions/permissions.service';

export interface TokenGenerationOptions {
  impersonation?: boolean;
  impersonatorId?: string;
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
    const rawRole = user.role as RoleDocument | Types.ObjectId | string | null | undefined;

    let permissionNames: string[] = [];
    let roleId: Types.ObjectId | string | undefined;
    let roleName: string | undefined;

    if (rawRole && typeof rawRole === 'object' && 'name' in rawRole && '_id' in rawRole) {
      roleId = (rawRole as RoleDocument)._id;
      roleName = (rawRole as any).name;
      const rolePermissions = (rawRole as RoleDocument & { permissions?: any[] }).permissions;
      if (Array.isArray(rolePermissions) && rolePermissions.length > 0) {
        permissionNames = rolePermissions
          .map((permission) => {
            if (permission && typeof permission === 'object' && 'name' in permission) {
              return (permission as any).name as string;
            }
            return null;
          })
          .filter((name): name is string => Boolean(name));
      }
    } else if (rawRole) {
      roleId = rawRole as Types.ObjectId | string;
      if (typeof rawRole === 'string') {
        roleName = rawRole;
      }
    }

    if (!roleId) {
      throw new Error('User role is not properly populated');
    }

    if (permissionNames.length === 0) {
      const roleDoc = await this.roleModel
        .findById(roleId)
        .populate({ path: 'permissions', select: 'name' })
        .exec();

      if (!roleDoc) {
        throw new Error('Role associated to user not found');
      }

      permissionNames = Array.isArray(roleDoc.permissions)
        ? (roleDoc.permissions as any[])
            .map((permission) => permission?.name)
            .filter((name): name is string => Boolean(name))
        : [];
      roleName = roleDoc.name;
    }

    if (!roleName && typeof rawRole === 'object' && rawRole && 'name' in rawRole) {
      roleName = (rawRole as any).name;
    }

    if (permissionNames.length === 0 && tenant?.enabledModules) {
      const enabledModuleNames = Object.entries(tenant.enabledModules)
        .filter(([, isEnabled]) => isEnabled)
        .map(([moduleName]) => moduleName);

      if (enabledModuleNames.length > 0) {
        permissionNames = this.permissionsService.findByModules(enabledModuleNames);
      }
    }

    const payload: Record<string, any> = {
      sub: user._id,
      email: user.email,
      role: {
        name: roleName,
        permissions: permissionNames,
      },
      tenantId: tenant ? tenant._id : null,
      tenantCode: tenant ? tenant.code : null,
    };

    if (options.impersonation) {
      payload.impersonated = true;
      payload.impersonatorId = options.impersonatorId ?? null;
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
      }),
      this.jwtService.signAsync({ sub: user._id }, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    };
  }
}
