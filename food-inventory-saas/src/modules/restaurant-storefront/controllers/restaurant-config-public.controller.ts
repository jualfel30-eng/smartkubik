import { Controller, Get, Param, NotFoundException, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { Public } from '../../../decorators/public.decorator';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { StorefrontConfig } from '../../../schemas/storefront-config.schema';

/**
 * Endpoints públicos para configuración del restaurante.
 * Ninguno requiere isActive=true — soportan configuración inicial y resolución multi-tenant.
 */
@ApiTags('Restaurant - Public')
@Controller('public/restaurant')
export class RestaurantConfigPublicController {
  constructor(
    @InjectModel(StorefrontConfig.name)
    private storefrontConfigModel: Model<any>,
  ) {}

  @Public()
  @Get(':tenantId/config')
  @ApiOperation({ summary: 'Configuración pública del restaurante (tema, nombre, contacto)' })
  @ApiParam({ name: 'tenantId', description: 'ID del tenant restaurante' })
  async getConfig(@Param('tenantId') tenantId: string) {
    if (!Types.ObjectId.isValid(tenantId)) {
      throw new BadRequestException('ID de tenant inválido');
    }

    const doc = await this.storefrontConfigModel
      .findOne({ tenantId: new Types.ObjectId(tenantId) })
      .select('restaurantConfig')
      .lean()
      .exec() as any;

    if (!doc?.restaurantConfig) {
      throw new NotFoundException('No se encontró configuración de restaurante para este tenant');
    }

    const rc = doc.restaurantConfig as Record<string, any>;
    return {
      accentColor: rc.accentColor,
      restaurantName: rc.restaurantName,
      tagline: rc.tagline,
      logoUrl: rc.logoUrl,
      heroVideoUrl: rc.heroVideoUrl,
      heroImageUrl: rc.heroImageUrl,
      currency: rc.currency,
      whatsappNumber: rc.whatsappNumber,
      paymentInstructions: rc.paymentInstructions,
    };
  }

  @Public()
  @Get('by-domain/:domain')
  @ApiOperation({ summary: 'Resuelve tenantId desde un dominio o subdominio (multi-tenant)' })
  @ApiParam({ name: 'domain', description: 'Dominio del storefront, ej: restaurante1.smartkubik.com' })
  async resolveByDomain(@Param('domain') domain: string) {
    // Busca por dominio exacto (sin requerir isActive para soportar configuración inicial)
    const doc = await this.storefrontConfigModel
      .findOne({ domain })
      .select('tenantId restaurantConfig')
      .lean()
      .exec() as any;

    if (!doc) {
      throw new NotFoundException(`No se encontró configuración para el dominio "${domain}"`);
    }

    return {
      tenantId: doc.tenantId.toString(),
      restaurantName: doc.restaurantConfig?.restaurantName ?? null,
    };
  }
}
