import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from "@nestjs/common";

@Injectable()
export class SuperAdminGuard implements CanActivate {
  private readonly logger = new Logger(SuperAdminGuard.name);

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // El JwtAuthGuard ya se ha ejecutado, así que 'user' debería estar presente.
    if (!user) {
      this.logger.warn(
        "SuperAdminGuard: No se encontró usuario en el request.",
      );
      throw new ForbiddenException("Acceso denegado.");
    }

    // Asumimos que el rol está populado gracias a la estrategia JWT
    const userRole = user.role?.name;

    if (userRole === "super_admin") {
      this.logger.debug(`Acceso de Super Admin concedido a: ${user.email}`);
      return true;
    }

    this.logger.warn(
      `Acceso de Super Admin denegado a: ${user.email} (Rol: ${userRole})`,
    );
    throw new ForbiddenException("No tienes permisos de Super Administrador.");
  }
}
