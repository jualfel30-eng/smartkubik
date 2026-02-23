import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Tenant, TenantDocument } from "../schemas/tenant.schema";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  constructor(
    private reflector: Reflector,
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Bypass TenantGuard for Super Admins
    if (user && user.role?.name === "super_admin") {
      this.logger.debug(`TenantGuard bypassed for Super Admin: ${user.email}`);
      return true;
    }

    if (!user || !user.tenantId) {
      this.logger.warn(
        "User without tenant trying to access protected resource",
      );
      throw new ForbiddenException("Usuario sin tenant válido");
    }

    try {
      // Verificar que el tenant existe y está activo
      const tenant = await this.tenantModel.findById(user.tenantId).exec();

      if (!tenant) {
        this.logger.warn(`Tenant not found: ${user.tenantId}`);
        throw new ForbiddenException("Tenant no encontrado");
      }

      if (tenant.status !== "active") {
        this.logger.warn(
          `Inactive tenant access attempt: ${tenant.name} (${tenant.status})`,
        );
        throw new ForbiddenException(
          `Tenant ${tenant.status}. Contacte al administrador.`,
        );
      }

      // Verificar expiración de suscripción / trial
      if (
        tenant.subscriptionExpiresAt &&
        tenant.subscriptionExpiresAt < new Date()
      ) {
        if (tenant.subscriptionPlan === "Trial") {
          this.logger.warn(
            `Expired trial for tenant: ${tenant.name}`,
          );
          throw new ForbiddenException(
            JSON.stringify({
              code: "TRIAL_EXPIRED",
              message:
                "Tu período de prueba ha expirado. Selecciona un plan para continuar.",
            }),
          );
        }
        this.logger.warn(`Expired subscription for tenant: ${tenant.name}`);
        throw new ForbiddenException("Suscripción expirada. Renueve su plan.");
      }

      // Agregar información del tenant al request
      request.tenant = tenant;

      this.logger.debug(
        `Tenant validated: ${tenant.name} for user: ${user.email}`,
      );
      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error(`Error validating tenant: ${error.message}`);
      throw new ForbiddenException("Error validando tenant");
    }
  }
}
