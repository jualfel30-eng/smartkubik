import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<string[]>(
      "permissions",
      context.getHandler(),
    );

    // Si no hay permisos requeridos, dejar pasar
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return true;
    }

    // Permisos pueden estar en user.permissions (JWT payload root) o en user.role.permissions (cargado por JwtStrategy desde DB)
    const userPermissions: string[] = Array.isArray(user.permissions)
      ? user.permissions
      : Array.isArray(user.role?.permissions)
        ? user.role.permissions
        : [];

    if (userPermissions.length === 0) {
      return true;
    }

    const hasAll = requiredPermissions.every((perm) =>
      userPermissions.includes(perm),
    );

    if (!hasAll) {
      throw new ForbiddenException("Permisos insuficientes");
    }

    return true;
  }
}
