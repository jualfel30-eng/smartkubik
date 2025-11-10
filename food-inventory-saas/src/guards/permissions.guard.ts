import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "../decorators/permissions.decorator";

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    this.logger.debug(`🔐 PermissionsGuard: Required permissions: ${JSON.stringify(requiredPermissions)}`);
    this.logger.debug(`👤 User info: ${JSON.stringify({ email: user?.email, role: user?.role?.name })}`);

    if (!user || !user.role) {
      this.logger.warn(`❌ No user or role found`);
      throw new ForbiddenException(
        "You do not have the necessary permissions.",
      );
    }

    const userRole = user.role;
    if (!userRole) {
      this.logger.warn(`❌ Invalid role`);
      throw new ForbiddenException("Invalid role.");
    }

    this.logger.debug(`🔑 User permissions: ${JSON.stringify(userRole.permissions)}`);
    this.logger.debug(`📊 Permissions type: ${typeof userRole.permissions}, is array: ${Array.isArray(userRole.permissions)}`);

    const hasAllPermissions = requiredPermissions.every((permission) =>
      userRole.permissions.includes(permission),
    );

    if (!hasAllPermissions) {
      const missingPermissions = requiredPermissions.filter(
        (permission) => !userRole.permissions.includes(permission)
      );
      this.logger.warn(`❌ Missing permissions: ${JSON.stringify(missingPermissions)}`);
      throw new ForbiddenException(
        "You do not have the necessary permissions.",
      );
    }

    this.logger.debug(`✅ Permission check passed`);
    return true;
  }
}
