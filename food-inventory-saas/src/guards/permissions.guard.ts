import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<{
      module: string;
      actions: string[];
    }>(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredPermissions) {
      // Si no se especifican permisos, permitir acceso
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuario no autenticado');
    }

    // Los administradores tienen acceso completo
    if (user.role === 'admin') {
      this.logger.debug(`Admin access granted to ${user.email}`);
      return true;
    }

    // Verificar permisos específicos del usuario
    const hasPermission = this.checkUserPermissions(
      user,
      requiredPermissions.module,
      requiredPermissions.actions,
    );

    if (!hasPermission) {
      this.logger.warn(
        `Permission denied for user ${user.email}: ${requiredPermissions.module}:${requiredPermissions.actions.join(',')}`,
      );
      throw new ForbiddenException(
        `No tiene permisos para ${requiredPermissions.actions.join(', ')} en ${requiredPermissions.module}`,
      );
    }

    this.logger.debug(
      `Permission granted for user ${user.email}: ${requiredPermissions.module}:${requiredPermissions.actions.join(',')}`,
    );
    return true;
  }

  private checkUserPermissions(
    user: any,
    requiredModule: string,
    requiredActions: string[],
  ): boolean {
    // Verificar permisos por rol predeterminado
    const rolePermissions = this.getRolePermissions(user.role);
    
    if (rolePermissions[requiredModule]) {
      const hasAllActions = requiredActions.every(action =>
        rolePermissions[requiredModule].includes(action),
      );
      if (hasAllActions) {
        return true;
      }
    }

    // Verificar permisos específicos del usuario
    if (user.permissions && user.permissions.length > 0) {
      const userModulePermission = user.permissions.find(
        (p: any) => p.module === requiredModule,
      );

      if (userModulePermission) {
        return requiredActions.every(action =>
          userModulePermission.actions.includes(action),
        );
      }
    }

    return false;
  }

  private getRolePermissions(role: string): Record<string, string[]> {
    const permissions = {
      admin: {
        products: ['create', 'read', 'update', 'delete', 'export', 'import'],
        inventory: ['create', 'read', 'update', 'delete', 'export', 'import'],
        orders: ['create', 'read', 'update', 'delete', 'export', 'import'],
        customers: ['create', 'read', 'update', 'delete', 'export', 'import'],
        reports: ['create', 'read', 'update', 'delete', 'export', 'import'],
        settings: ['create', 'read', 'update', 'delete', 'export', 'import'],
      },
      manager: {
        products: ['create', 'read', 'update', 'export'],
        inventory: ['create', 'read', 'update', 'export'],
        orders: ['create', 'read', 'update', 'export'],
        customers: ['create', 'read', 'update', 'export'],
        reports: ['read', 'export'],
        settings: ['read'],
      },
      employee: {
        products: ['read'],
        inventory: ['read', 'update'],
        orders: ['create', 'read', 'update'],
        customers: ['create', 'read', 'update'],
        reports: ['read'],
        settings: [],
      },
      viewer: {
        products: ['read'],
        inventory: ['read'],
        orders: ['read'],
        customers: ['read'],
        reports: ['read'],
        settings: [],
      },
    };

    return permissions[role] || {};
  }
}

