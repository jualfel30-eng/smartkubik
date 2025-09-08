import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tenant, TenantDocument } from '../schemas/tenant.schema';

@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.tenantId) {
      this.logger.warn('User without tenant trying to access protected resource');
      throw new ForbiddenException('Usuario sin tenant válido');
    }

    try {
      // Verificar que el tenant existe y está activo
      const tenant = await this.tenantModel.findById(user.tenantId).exec();

      if (!tenant) {
        this.logger.warn(`Tenant not found: ${user.tenantId}`);
        throw new ForbiddenException('Tenant no encontrado');
      }

      if (tenant.status !== 'active') {
        this.logger.warn(`Inactive tenant access attempt: ${tenant.code} (${tenant.status})`);
        throw new ForbiddenException(`Tenant ${tenant.status}. Contacte al administrador.`);
      }

      // Verificar límites de suscripción si es necesario
      if (tenant.subscriptionExpiresAt && tenant.subscriptionExpiresAt < new Date()) {
        this.logger.warn(`Expired subscription for tenant: ${tenant.code}`);
        throw new ForbiddenException('Suscripción expirada. Renueve su plan.');
      }

      // Agregar información del tenant al request
      request.tenant = tenant;
      
      this.logger.debug(`Tenant validated: ${tenant.code} for user: ${user.email}`);
      return true;

    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      
      this.logger.error(`Error validating tenant: ${error.message}`);
      throw new ForbiddenException('Error validando tenant');
    }
  }
}

