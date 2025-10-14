import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tenant, TenantDocument } from '../schemas/tenant.schema';
import { getEffectiveModulesForTenant } from '../config/vertical-features.config';
import { REQUIRED_MODULE_KEY } from '../decorators/require-module.decorator';

/**
 * Guard to check if a tenant has a specific module enabled
 * Works in conjunction with @RequireModule() decorator
 */
@Injectable()
export class ModuleAccessGuard implements CanActivate {
  private readonly logger = new Logger(ModuleAccessGuard.name);

  constructor(
    private reflector: Reflector,
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required module from decorator metadata
    const requiredModule = this.reflector.getAllAndOverride<string>(REQUIRED_MODULE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no module is required, allow access
    if (!requiredModule) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Super-admin always has access to all modules
    if (user?.isSuperAdmin) {
      this.logger.log(`Super-admin access granted for module: ${requiredModule}`);
      return true;
    }

    if (!user || !user.tenantId) {
      throw new ForbiddenException('Usuario o tenant no encontrado');
    }

    // Fetch tenant and check if module is enabled
    const tenant = await this.tenantModel.findById(user.tenantId).exec();

    if (!tenant) {
      throw new ForbiddenException('Tenant no encontrado');
    }

    const explicitState = tenant.enabledModules?.[requiredModule];
    if (explicitState === false) {
      this.logger.warn(
        `Access denied for tenant ${tenant.name}: module '${requiredModule}' explicitly disabled (vertical: ${tenant.vertical})`,
      );
      throw new ForbiddenException(
        `El módulo '${requiredModule}' no está habilitado para este tenant. Contacte al administrador para habilitar este módulo.`,
      );
    }

    const effectiveModules = getEffectiveModulesForTenant(
      tenant.vertical || 'FOOD_SERVICE',
      tenant.enabledModules,
    );

    if (!effectiveModules[requiredModule]) {
      this.logger.warn(
        `Access denied for tenant ${tenant.name}: module '${requiredModule}' not available for vertical ${tenant.vertical}`,
      );
      throw new ForbiddenException(
        `El módulo '${requiredModule}' no está habilitado para este tenant. Contacte al administrador para habilitar este módulo.`,
      );
    }

    const accessSource = explicitState === true ? 'explicitly enabled' : 'enabled by vertical configuration';
    this.logger.log(
      `Access granted for tenant ${tenant.name}: module '${requiredModule}' ${accessSource}`,
    );
    return true;
  }
}
